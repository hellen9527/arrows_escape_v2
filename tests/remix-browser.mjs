import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import {
  blockers,
  defaultProgress,
  newRun,
  isLocked,
} from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
const origin = process.env.QA_URL || 'http://localhost:4176';
const key = 'arrow-escape:challenge:v3',
  legacyKey = 'arrow-escape:challenge:v1';
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
  page.on('pageerror', (e) => errors.push(e.message));
  const old = {
    version: 1,
    campaign: 'challenge',
    best: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 3])),
    unlocked: 21,
    run: { level: 21, removed: [2, 3], mistakes: 2, hints: 1, hint: null },
    sound: false,
    reducedMotion: true,
    language: 'zh',
  };
  await page.goto(origin);
  await page.waitForFunction((k) => localStorage.getItem(k), key);
  await page.evaluate(
    ({ key, legacyKey, old }) => {
      localStorage.removeItem(key);
      localStorage.setItem(legacyKey, JSON.stringify(old));
    },
    { key, legacyKey, old },
  );
  await page.reload();
  await page
    .getByRole('heading', { name: '这次，每关都有新变化', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: '体验新版 · 从第 4 关开始', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  let p = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  assert.equal(p.run.level, 4);
  assert.equal(p.unlocked, 21);
  assert.deepEqual(p.best, {});
  assert.deepEqual(p.previousBest, old.best);
  assert.deepEqual(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), legacyKey),
    old,
  );
  await page.reload();
  await page.getByRole('button', { name: '选关', exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  console.log(
    'PASS migration preserves original save, previous20 clears and unlocks; explicit remix replay starts at4',
  );
  p = {
    ...defaultProgress('challenge'),
    previousBest: old.best,
    unlocked: 21,
    run: newRun(11),
    sound: false,
    reducedMotion: true,
  };
  await page.evaluate(
    ([k, p]) => localStorage.setItem(k, JSON.stringify(p)),
    [key, p],
  );
  await page.reload();
  await page.getByRole('button', { name: /钥匙 0\/1，查看规则/ }).waitFor();
  const level = makeLevel(11, 'challenge');
  const locked = level.arrows.find((a) => a.lock);
  assert(locked, 'first key lesson needs locks');
  const hit = async (id) =>
    page
      .getByRole('button', { name: new RegExp(`^箭头 ${id + 1}，`) })
      .evaluate((el) => {
        const p = el.getPointAtLength(el.getTotalLength() - 12);
        const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
        return { x: q.x, y: q.y };
      });
  const tap = async (id) => {
    const p = await hit(id);
    await page.touchscreen.tap(p.x, p.y);
  };
  await tap(locked.id);
  assert.equal(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).run.mistakes,
      key,
    ),
    0,
  );
  assert.match(await page.locator('.game-message').textContent(), /不会扣心/);
  await page.getByRole('button', { name: /钥匙 0\/1，查看规则/ }).click();
  await page
    .getByRole('heading', { name: '先找到钥匙，再打开锁', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: '明白了，寻找钥匙', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  let run = (
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
  ).run;
  const keyArrow = level.arrows.find((a) => a.key === 'A');
  assert(keyArrow);
  while (!run.removed.includes(keyArrow.id)) {
    const free =
      level.arrows.find(
        (a) =>
          a.id === keyArrow.id && !blockers(level, run.removed, a.id).length,
      ) ||
      level.arrows.find(
        (a) =>
          !run.removed.includes(a.id) &&
          !blockers(level, run.removed, a.id).length,
      );
    assert(free);
    await page
      .getByRole('button', { name: new RegExp(`^箭头 ${free.id + 1}，`) })
      .press('Enter');
    await page.waitForFunction(
      ([k, n]) => JSON.parse(localStorage.getItem(k)).run.removed.length === n,
      [key, run.removed.length + 1],
    );
    run = (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key))
      .run;
  }
  assert.equal(await page.locator('.locked-arrow').count(), 0);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  assert((await page.locator('.locked-arrow').count()) >= 3);
  await page.reload();
  await page.getByRole('button', { name: /钥匙 0\/1，查看规则/ }).waitFor();
  run = (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key))
    .run;
  assert(isLocked(level, run.removed, locked));
  console.log(
    'PASS key explanation, free lock inspection, group unlocking, undo relock and reload',
  );
  await fs.mkdir('work', { recursive: true });
  for (const id of [
    4, 5, 6, 8, 9, 10, 11, 12, 15, 16, 18, 20, 23, 24, 28, 30,
  ]) {
    const p = {
      ...defaultProgress('challenge'),
      best: Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [i + 1, 3]),
      ),
      unlocked: 30,
      run: newRun(id),
      sound: false,
      reducedMotion: true,
    };
    await page.evaluate(
      ([k, p]) => localStorage.setItem(k, JSON.stringify(p)),
      [key, p],
    );
    await page.reload();
    await page.getByRole('button', { name: '提示 2/2', exact: true }).waitFor();
    await page.waitForFunction(
      (n) => document.querySelectorAll('.arrow-hit').length === n,
      makeLevel(id, 'challenge').arrows.length,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({ path: `work/remix-level-${id}.png` });
    if ([12, 18, 30].includes(id)) {
      await page.getByRole('button', { name: '放大棋盘', exact: true }).click();
      await page.locator('.board-viewport.zoomed').waitFor();
      await page.waitForFunction(() => {
        const el = document.querySelector('.board-viewport');
        return (
          el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight
        );
      });
      await page.locator('.board-viewport').evaluate((el) => {
        el.scrollLeft = 200;
        el.scrollTop = 250;
      });
      assert(
        await page
          .locator('.board-viewport')
          .evaluate((el) => el.scrollLeft > 0 && el.scrollTop > 0),
      );
      assert.equal(await page.evaluate(() => scrollY), 0);
      await page.screenshot({ path: `work/remix-zoom-${id}.png` });
    }
  }
  // A transient read error must never replace the existing revision3 save.
  const prior = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.getByRole('button', { name: '选关', exact: true }).click();
  await page
    .getByRole('button', { name: '经典篇 · 60 关', exact: true })
    .click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.reload();
  await page.evaluate((k) => {
    const original = Reflect.get(Storage.prototype, 'getItem');
    Storage.prototype.getItem = function (name) {
      if (name === k)
        throw new DOMException('Test read blocked', 'SecurityError');
      return original.call(this, name);
    };
  }, key);
  await page.getByRole('button', { name: '选关', exact: true }).click();
  await page
    .getByRole('button', { name: '挑战 3.0 · 30 关', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: '经典篇 · 60 关', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.reload();
  assert.equal(await page.evaluate((k) => localStorage.getItem(k), key), prior);
  assert.deepEqual(errors, []);
  console.log(
    'PASS denseboard zoom/pan, representative screenshots and read-failure save protection',
  );
} finally {
  await browser.close();
}
