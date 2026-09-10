import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {
  act,
  blockers,
  defaultProgress,
  failed,
  isComplete,
  newRun,
  requiredArrowIds,
} from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
import { saveKey, LEGACY_CHALLENGE_V2_KEY } from '../lib/game/storage.ts';

const origin = process.env.QA_URL || 'http://localhost:4175';
const key = saveKey('challenge');
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: process.env.QA_RESOLVE
    ? [`--host-resolver-rules=${process.env.QA_RESOLVE}`]
    : [],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const saved = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  const arrow = (id) =>
    page.getByRole('button', { name: new RegExp(`^箭头 ${id + 1}，`) });
  const close = async () => {
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  };
  const remove = async (id) => {
    const before = await saved();
    await arrow(id).press('Enter');
    await page.waitForFunction(
      ([key, n]) =>
        JSON.parse(localStorage.getItem(key)).run.removed.length === n,
      [key, before.run.removed.length + 1],
    );
    const after = await saved();
    assert.equal(after.run.removed.at(-1), id);
    return after;
  };
  const level = makeLevel(4, 'challenge');
  assert(level.objective, 'level 4 introduces star rescue');
  const goal = (run) =>
    page.getByRole('button', {
      name: `星标 ${level.objective.targets.filter((id) => run.removed.includes(id)).length}/${level.objective.targets.length}，剩余 ${level.objective.moves - run.removed.length} 步，查看目标规则`,
      exact: true,
    });
  const baseline = {
    ...defaultProgress('challenge'),
    best: { 1: 3, 2: 3, 3: 3 },
    unlocked: 4,
    run: newRun(4),
    sound: false,
    reducedMotion: true,
  };
  await page.goto(origin);
  await page.waitForFunction((key) => localStorage.getItem(key), key);
  await page.evaluate(
    ([key, p]) => localStorage.setItem(key, JSON.stringify(p)),
    [key, baseline],
  );
  await page.reload();
  await goal(baseline.run).waitFor();

  await goal(baseline.run).click();
  await page
    .getByRole('heading', { name: '把步数留给星星', exact: true })
    .waitFor();
  assert.match(
    await page.getByRole('dialog').textContent(),
    /普通箭头不必全部清空/,
  );
  assert.match(
    await page.getByRole('dialog').textContent(),
    /不退还爱心和提示/,
  );
  await page
    .getByRole('button', { name: '明白了，寻找星标', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(
    (await saved()).run,
    baseline.run,
    'reading rules must not spend resources',
  );

  const required = requiredArrowIds(level);
  const irrelevant = level.arrows.find(
    (a) => !required.includes(a.id) && !blockers(level, [], a.id).length,
  );
  assert(irrelevant, 'the first rescue needs an optional free arrow');
  let p = await remove(irrelevant.id);
  await goal(p.run).waitFor();
  assert.equal(p.run.mistakes, 0);
  assert.equal(
    await page
      .getByRole('progressbar', { name: '目标离场进度' })
      .getAttribute('aria-valuenow'),
    '0',
  );
  assert.equal(p.best[4], undefined);

  const blocked = level.arrows.find(
    (a) =>
      !p.run.removed.includes(a.id) &&
      blockers(level, p.run.removed, a.id).length,
  );
  assert(blocked);
  await arrow(blocked.id).press('Enter');
  await page
    .getByRole('status', { name: '剩余 2 颗心', exact: true })
    .waitFor();
  assert.deepEqual(
    (await saved()).run.removed,
    [irrelevant.id],
    'a blocked tap spends no move',
  );
  await page.getByRole('button', { name: '提示 2/2', exact: true }).click();
  p = await saved();
  assert.equal(p.run.hints, 1);
  assert(
    requiredArrowIds(level, p.run.removed).includes(p.run.hint),
    'hint must lead to a target',
  );
  assert.deepEqual(blockers(level, p.run.removed, p.run.hint), []);
  assert.equal(await page.locator('.highlighted').count(), 1);
  assert.match(
    await page.locator('.highlighted .arrow-hit').getAttribute('aria-label'),
    new RegExp(`^箭头 ${p.run.hint + 1}，`),
  );
  assert.match(
    await page.locator('.game-message').textContent(),
    /通向星标目标/,
  );
  const hinted = p.run.hint;
  await page.reload();
  await page.getByRole('button', { name: '提示 1/2', exact: true }).waitFor();
  assert.deepEqual(
    (await saved()).run,
    p.run,
    'reload restores the active relevant hint and spent resources',
  );
  p = await remove(hinted);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  p = await saved();
  assert.deepEqual(p.run.removed, [irrelevant.id]);
  assert.equal(p.run.mistakes, 1, 'undo must not refund hearts');
  assert.equal(p.run.hints, 1, 'undo must not refund hints');
  assert.equal(p.run.hint, null);
  await goal(p.run).waitFor();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  p = await saved();
  assert.deepEqual(p.run.removed, []);
  assert.equal(p.run.mistakes, 1);
  assert.equal(p.run.hints, 1);
  await page.reload();
  await goal(p.run).waitFor();
  assert.deepEqual((await saved()).run, p.run);
  console.log(
    'PASS star rules, optional moves, relevant hint, undo refunds only moves, and reload',
  );

  while (!isComplete(level, p.run)) {
    const required = requiredArrowIds(level, p.run.removed);
    const free = level.arrows.find(
      (a) =>
        required.includes(a.id) && !blockers(level, p.run.removed, a.id).length,
    );
    assert(free, 'target route remains solvable');
    p = await remove(free.id);
  }
  await page.getByRole('dialog').waitFor();
  const remaining = level.arrows.length - p.run.removed.length;
  assert(remaining > 0, 'star victory must leave ordinary arrows');
  assert.equal(p.best[4], 2);
  assert.equal(p.unlocked, 5);
  assert.equal(p.run.mistakes, 1);
  assert.equal(p.run.hints, 1);
  await page
    .getByText(
      `${level.objective.targets.length} 支星标全部出逃，用了 ${p.run.removed.length}/${level.objective.moves} 步。${remaining} 支普通箭头留在原地，也一样完成目标。`,
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(await page.locator('.win-stats strong').allTextContents(), [
    String(p.run.removed.length),
    '1',
    '1',
  ]);
  await close();
  assert.equal(await page.locator('.arrow-hit').count(), remaining);
  assert.equal(await page.locator('.target-token').count(), 0);
  assert.equal(
    await page.getByRole('button', { name: '撤销', exact: true }).count(),
    0,
  );
  const win = await saved();
  await page.locator('.arrow-hit').first().press('Enter');
  assert.deepEqual(await saved(), win, 'completed board cannot spend moves');
  await page.reload();
  await page.getByRole('dialog').waitFor();
  assert.deepEqual(
    await saved(),
    win,
    'victory with ordinary arrows restores as a victory',
  );
  console.log(
    'PASS target-only victory, accurate move/stats copy, retained ordinary arrows and terminal reload',
  );

  // Seed an uncredited attempt, then exhaust its budget using real legal UI moves.
  await page.evaluate(
    ([key, p]) => localStorage.setItem(key, JSON.stringify(p)),
    [key, baseline],
  );
  await page.reload();
  await goal(baseline.run).waitFor();
  p = await saved();
  let optionalMoves = 0;
  while (!failed(level, p.run)) {
    const required = requiredArrowIds(level, p.run.removed);
    const free = level.arrows
      .filter(
        (a) =>
          !p.run.removed.includes(a.id) &&
          !blockers(level, p.run.removed, a.id).length &&
          !isComplete(level, act(level, p.run, { type: 'tap', id: a.id })),
      )
      .sort(
        (a, b) =>
          Number(required.includes(a.id)) - Number(required.includes(b.id)),
      );
    assert(
      free.length,
      'the budget failure fixture needs another legal nonwinning move',
    );
    if (!required.includes(free[0].id)) optionalMoves++;
    p = await remove(free[0].id);
  }
  assert(optionalMoves > 0);
  assert.equal(p.run.removed.length, level.objective.moves);
  assert.equal(p.run.mistakes, 0, 'budget failure retains all three hearts');
  assert(!isComplete(level, p.run));
  assert.deepEqual(p.best, baseline.best, 'budget failure awards no stars');
  assert.equal(p.unlocked, 4, 'budget failure unlocks no level');
  await page
    .getByRole('heading', { name: '步数用完，换个思路。', exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole('heading', { name: '步数用完，换个思路。', exact: true })
    .waitFor();
  assert.deepEqual(
    await saved(),
    p,
    'budget failure is terminal across reload',
  );
  await close();
  await page
    .getByRole('status', { name: '剩余 3 颗心', exact: true })
    .waitFor();
  await goal(p.run).waitFor();
  assert.equal(
    await page.getByRole('button', { name: '撤销', exact: true }).count(),
    0,
  );
  assert.equal(await page.getByRole('button', { name: /^提示 / }).count(), 0);
  await page.locator('.arrow-hit').first().press('Enter');
  assert.deepEqual(await saved(), p, 'failed board cannot accept moves');
  await page
    .getByRole('button', { name: '重试本关 · 恢复步数与爱心', exact: true })
    .click();
  p = await saved();
  assert.deepEqual(p.run, newRun(4));
  assert.deepEqual(p.best, baseline.best);
  assert.equal(p.unlocked, 4);
  await goal(p.run).waitFor();
  await page.getByRole('button', { name: '提示 2/2', exact: true }).waitFor();
  assert.equal(await page.locator('.arrow-hit').count(), level.arrows.length);
  console.log(
    'PASS legal optional-route budget exhaustion, three hearts retained, no credit, terminal reload and retry',
  );

  const old = {
    ...defaultProgress('challenge'),
    contentRevision: 2,
    previousBest: { 2: 3, 7: 1, 28: 2 },
    best: { 1: 2, 2: 1, 7: 3, 20: 2 },
    unlocked: 29,
    run: { level: 20, removed: [5, 6], mistakes: 2, hints: 1, hint: 8 },
    sound: false,
    reducedMotion: true,
    language: 'en',
  };
  const oldRaw = JSON.stringify(old);
  await page.evaluate(
    ({ key, legacy, oldRaw }) => {
      localStorage.removeItem(key);
      localStorage.setItem(legacy, oldRaw);
    },
    { key, legacy: LEGACY_CHALLENGE_V2_KEY, oldRaw },
  );
  await page.reload();
  await page
    .getByRole('heading', {
      name: 'A different kind of challenge',
      exact: true,
    })
    .waitFor();
  p = await saved();
  assert.equal(p.contentRevision, 3);
  assert.deepEqual(p.best, {});
  assert.deepEqual(p.previousBest, { 1: 2, 2: 3, 7: 3, 20: 2, 28: 2 });
  assert.equal(p.unlocked, 29, 'archive merging retains the full unlock range');
  assert.deepEqual(
    p.run,
    newRun(21),
    'old geometry never replays onto the new board',
  );
  assert.equal(p.sound, false);
  assert.equal(p.reducedMotion, true);
  assert.equal(p.language, 'en');
  assert.equal(
    await page.evaluate(
      (legacy) => localStorage.getItem(legacy),
      LEGACY_CHALLENGE_V2_KEY,
    ),
    oldRaw,
  );
  await page
    .getByRole('button', { name: 'Continue level 21', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await saved()).showRevisionIntro, false);
  await page.reload();
  await page.getByRole('button', { name: 'Levels', exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal((await saved()).showRevisionIntro, false);
  assert.equal(
    await page.evaluate(
      (legacy) => localStorage.getItem(legacy),
      LEGACY_CHALLENGE_V2_KEY,
    ),
    oldRaw,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS v2-to-v3 migration preserves old bytes/preferences, merges archived best scores and unlocks, and shows intro once',
  );
} finally {
  await browser.close();
}
