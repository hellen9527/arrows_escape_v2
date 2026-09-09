import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { blockers, defaultProgress, newRun } from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
const origin = process.env.QA_URL || 'http://localhost:4175';
const key = 'arrow-escape:challenge:v2';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: process.env.QA_RESOLVE
    ? [`--host-resolver-rules=${process.env.QA_RESOLVE}`]
    : [],
});
const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
async function saved() {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
}
async function hit(id) {
  return page
    .getByRole('button', { name: new RegExp(`^箭头 ${id + 1}，`) })
    .evaluate((el) => {
      const p = el.getPointAtLength(Math.max(0, el.getTotalLength() - 12));
      const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
      return { x: q.x, y: q.y };
    });
}
async function tap(id) {
  const p = await hit(id);
  await page.touchscreen.tap(p.x, p.y);
}
async function solve(id) {
  const l = makeLevel(id, 'challenge');
  let p = await saved();
  while (p.run.removed.length < l.arrows.length) {
    const a = l.arrows.find(
      (a) =>
        !p.run.removed.includes(a.id) &&
        !blockers(l, p.run.removed, a.id).length,
    );
    assert(a, `deadlock ${id}`);
    await page
      .getByRole('button', { name: new RegExp(`^箭头 ${a.id + 1}，`) })
      .press('Enter');
    await page.waitForFunction(
      ([k, n]) => JSON.parse(localStorage.getItem(k)).run.removed.length === n,
      [key, p.run.removed.length + 1],
    );
    p = await saved();
  }
  await page.getByRole('dialog').waitFor();
  assert.equal(p.best[id], p.run.mistakes === 0 && p.run.hints === 0 ? 3 : 2);
}
try {
  await fs.mkdir('work', { recursive: true });
  await page.goto(origin);
  await page.waitForFunction((k) => localStorage.getItem(k), key);
  assert.equal((await saved()).campaign, 'challenge');
  const classic = defaultProgress();
  classic.best = Object.fromEntries(
    Array.from({ length: 29 }, (_, i) => [i + 1, 3]),
  );
  classic.unlocked = 30;
  classic.run = newRun(30);
  classic.sound = false;
  classic.reducedMotion = true;
  delete classic.campaign; // actual old-format save
  await page.evaluate(
    ({ classic, k }) => {
      localStorage.setItem('arrow-escape:v1', JSON.stringify(classic));
      const p = JSON.parse(localStorage.getItem(k));
      p.sound = false;
      p.reducedMotion = true;
      localStorage.setItem(k, JSON.stringify(p));
    },
    { classic, k: key },
  );
  await page.reload();
  await page.getByRole('button', { name: '选关', exact: true }).click();
  await page
    .getByRole('button', { name: '经典篇 · 60 关', exact: true })
    .click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('arrow-escape:v1')).run.level === 30,
  );
  await page.getByRole('button', { name: '选关', exact: true }).click();
  await page
    .getByRole('button', { name: '挑战 2.0 · 30 关', exact: true })
    .click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await saved()).run.level, 1);
  for (let id = 1; id <= 3; id++) {
    await solve(id);
    await page
      .getByRole('button', { name: '继续 · 下一关', exact: true })
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  console.log(
    'PASS tutorial progression and classic level-30 save preservation',
  );
  const l = makeLevel(4, 'challenge');
  const blocked = l.arrows.find((a) => blockers(l, [], a.id).length);
  const touch = await hit(blocked.id);
  const client = await ctx.newCDPSession(page);
  // Drag beginning on a blocked arrow must not count as a tap.
  const before = await saved();
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: touch.x + 35, y: touch.y + 30 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  assert.deepEqual((await saved()).run, before.run);
  for (let i = 1; i <= 3; i++) {
    await tap(blocked.id);
    await page.waitForFunction(
      ([k, n]) => JSON.parse(localStorage.getItem(k)).run.mistakes === n,
      [key, i],
    );
    if (i < 3) {
      assert.equal(
        await page.locator('.highlighted').count(),
        0,
        'error leaked a free hint',
      );
      await page.waitForTimeout(550);
    }
  }
  await page.getByRole('button', { name: '重试本关', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: '重试本关', exact: true }).waitFor();
  assert.equal((await saved()).run.mistakes, 3);
  assert.equal((await saved()).unlocked, 4);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const free = l.arrows.find((a) => !blockers(l, [], a.id).length);
  await tap(free.id);
  assert.equal((await saved()).run.removed.length, 0);
  await page
    .getByRole('button', { name: '重试本关 · 恢复 3 颗心', exact: true })
    .click();
  assert.equal((await saved()).run.mistakes, 0);
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole('button', { name: `提示 ${2 - i}/2`, exact: true })
      .click();
    const p = await saved();
    await tap(p.run.hint);
    await page.getByRole('button', { name: '撤销', exact: true }).click();
  }
  assert(
    await page
      .getByRole('button', { name: '提示 0/2', exact: true })
      .isDisabled(),
  );
  await page.reload();
  await page.getByRole('button', { name: '提示 0/2', exact: true }).waitFor();
  assert.equal((await saved()).run.hints, 2);
  console.log(
    'PASS touch drag, hidden blockers, third-strike lock, failure reload/retry, hint budget and undo',
  );
  for (let id = 4; id <= 30; id++) {
    await solve(id);
    if (id < 30) {
      await page
        .getByRole('button', { name: '继续 · 下一关', exact: true })
        .click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
  }
  assert.equal((await saved()).unlocked, 30);
  assert.equal(Object.keys((await saved()).best).length, 30);
  assert.equal(
    await page
      .getByText('30 个谜题全部完成。回头看看，试着收集所有星星吧。', {
        exact: true,
      })
      .count(),
    1,
  );
  console.log(
    'PASS all thirty levels through real keyboard input, completion and unlock boundaries',
  );
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  for (const [width, height, id] of [
    [320, 568, 6],
    [390, 664, 18],
    [390, 844, 30],
    [430, 932, 24],
    [568, 320, 12],
    [844, 390, 30],
    [1024, 500, 30],
    [1440, 900, 30],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      ([k, id]) => {
        const p = JSON.parse(localStorage.getItem(k));
        p.run = { level: id, removed: [], mistakes: 0, hints: 0, hint: null };
        localStorage.setItem(k, JSON.stringify(p));
      },
      [key, id],
    );
    await page.reload();
    await page.getByRole('button', { name: '提示 2/2', exact: true }).waitFor();
    const g = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      bottom: document.querySelector('.game-controls').getBoundingClientRect()
        .bottom,
      board: document.querySelector('.board-viewport').getBoundingClientRect()
        .height,
    }));
    if (width < 1100) {
      assert(g.height <= height + 1 && g.width <= width + 1, JSON.stringify(g));
      assert(g.bottom <= height + 1 && g.board >= 130, JSON.stringify(g));
    }
    await page.screenshot({
      path: `work/challenge-${width}x${height}-level${id}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.log('PASS eight viewport layouts and no uncaught browser errors');
} finally {
  await browser.close();
}
