import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { act, blockers, defaultProgress, newRun } from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
import { saveKey } from '../lib/game/storage.ts';
import { BALANCE_REVISION } from '../lib/game/challenge-balance.ts';

const origin = process.env.QA_URL || 'http://localhost:4177';
const key = saveKey('challenge');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction((key) => localStorage.getItem(key), key);
  const read = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  const seed = async (progress) => {
    await page.evaluate(
      ([key, progress]) => localStorage.setItem(key, JSON.stringify(progress)),
      [key, progress],
    );
    await page.reload();
    await page
      .getByRole('button', {
        name: progress.language === 'en' ? 'Levels' : '选关',
        exact: true,
      })
      .waitFor();
  };
  const old = {
    ...defaultProgress('challenge'),
    balanceRevision: undefined,
    best: { 1: 3, 8: 2, 13: 3 },
    previousBest: { 20: 2 },
    unlocked: 21,
    run: { ...newRun(14), removed: [4, 7], mistakes: 2, hints: 1 },
    sound: false,
    reducedMotion: true,
  };
  await seed(old);
  await page
    .getByText('本关已重新平衡，棋盘从头开始；已获星级和解锁进度都已保留。', {
      exact: true,
    })
    .waitFor();
  let p = await read();
  assert.deepEqual(p.best, old.best);
  assert.deepEqual(p.previousBest, old.previousBest);
  assert.equal(p.unlocked, old.unlocked);
  assert.deepEqual(p.run, newRun(14));
  assert.equal(p.balanceRevision, BALANCE_REVISION);
  assert.equal(p.showBalanceNotice, false);
  assert.equal(await page.locator('.arrow-hit').count(), 28);
  assert.equal(await page.locator('.target-token').count(), 2);
  const level = makeLevel(14, 'challenge');
  const free = level.arrows.find((a) => !blockers(level, [], a.id).length);
  await page
    .getByRole('button', { name: new RegExp(`^箭头 ${free.id + 1}，`) })
    .press('Enter');
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)).run.removed.length === 1,
    key,
  );
  p = await read();
  await page.reload();
  await page.getByRole('button', { name: '选关', exact: true }).waitFor();
  assert.deepEqual(
    await read(),
    p,
    'acknowledged balance must not restart again',
  );
  assert.equal(
    await page
      .getByText('本关已重新平衡，棋盘从头开始；已获星级和解锁进度都已保留。', {
        exact: true,
      })
      .count(),
    0,
  );

  const unchanged = makeLevel(4, 'challenge');
  let run = act(unchanged, newRun(4), { type: 'hint' });
  run = act(unchanged, run, { type: 'tap', id: run.hint });
  run = { ...act(unchanged, run, { type: 'hint' }), mistakes: 1 };
  await seed({ ...old, best: { 3: 3 }, previousBest: {}, unlocked: 4, run });
  assert.deepEqual(
    (await read()).run,
    run,
    'unchanged tutorial keeps active attempt and resources',
  );
  assert.equal(await page.locator('.highlighted').count(), 1);

  fs.mkdirSync('work/balance-screenshots', { recursive: true });
  for (const id of [5, 6, 8, 9, 13, 14, 20, 21, 26, 27]) {
    await seed({
      ...defaultProgress('challenge'),
      best: { 29: 3 },
      unlocked: 30,
      run: newRun(id),
      sound: false,
      reducedMotion: true,
    });
    assert.equal(
      await page.locator('.arrow-hit').count(),
      makeLevel(id, 'challenge').arrows.length,
    );
    const geometry = await page.evaluate(() => {
      const board = document
        .querySelector('.board-viewport')
        .getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollHeight,
        height: innerHeight,
        top: board.top,
        bottom: board.bottom,
      };
    });
    assert(
      geometry.scroll <= geometry.height + 1,
      `level ${id} must not scroll`,
    );
    assert(
      geometry.top >= 0 && geometry.bottom <= geometry.height,
      `level ${id} board fits mobile viewport`,
    );
    await page.screenshot({ path: `work/balance-screenshots/level-${id}.png` });
  }
  for (const [width, height, id] of [
    [320, 568, 14],
    [568, 320, 21],
    [390, 664, 27],
  ]) {
    await page.setViewportSize({ width, height });
    await seed({
      ...defaultProgress('challenge'),
      language: 'en',
      best: { 29: 3 },
      unlocked: 30,
      run: newRun(id),
      sound: false,
      reducedMotion: true,
    });
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      controls: document.querySelector('.game-controls').getBoundingClientRect()
        .bottom,
      board: document.querySelector('.board-viewport').getBoundingClientRect()
        .height,
    }));
    assert(
      geometry.width <= width + 1 && geometry.height <= height + 1,
      JSON.stringify(geometry),
    );
    assert(
      geometry.controls <= height + 1 && geometry.board >= 130,
      JSON.stringify(geometry),
    );
    assert.equal(
      await page.locator('.target-token').count(),
      makeLevel(id, 'challenge').objective.targets.length,
    );
    await page.screenshot({
      path: `work/balance-screenshots/en-${width}x${height}-level-${id}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS balance notice once, earned progress retained, unchanged attempt continued, 10 mobile boards and English narrow/landscape fit',
  );
} finally {
  await browser.close();
}
