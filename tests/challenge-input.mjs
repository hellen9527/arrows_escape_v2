import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { blockers, defaultProgress, newRun } from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';
const origin = process.env.QA_URL || 'http://localhost:4175';
const key = 'arrow-escape:challenge:v3';
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
  const p = defaultProgress('challenge');
  p.best = { 1: 3, 2: 3, 3: 3 };
  p.unlocked = 4;
  p.run = newRun(4);
  p.sound = false;
  await context.addInitScript(
    ({ p, key }) => {
      localStorage.setItem(key, JSON.stringify(p));
      localStorage.setItem('arrow-escape:campaign', 'challenge');
    },
    { p, key },
  );
  const page = await context.newPage();
  await page.goto(origin);
  await page.getByRole('status', { name: '剩余 3 颗心' }).waitFor();
  await page.getByRole('button', { name: '放大棋盘', exact: true }).click();
  const rect = await page.locator('.board-viewport').boundingBox();
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 50, y: y - 15, id: 1 },
      { x: x + 50, y: y + 15, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  assert.deepEqual(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).run, key),
    p.run,
  );
  await page.getByRole('button', { name: '缩小棋盘', exact: true }).click();
  const level = makeLevel(4, 'challenge');
  const blocked = level.arrows.find((a) => blockers(level, [], a.id).length);
  const path = page.getByRole('button', {
    name: new RegExp(`^箭头 ${blocked.id + 1}，`),
  });
  const hit = await path.evaluate((el) => {
    const p = el.getPointAtLength(el.getTotalLength() - 12);
    const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
    return { x: q.x, y: q.y };
  });
  await page.touchscreen.tap(hit.x, hit.y);
  await page.touchscreen.tap(hit.x, hit.y);
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).run.mistakes === 1,
    key,
  );
  assert.equal(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).run.mistakes,
      key,
    ),
    1,
  );
  // A cancelled touch must not poison the next deliberate tap.
  await page.waitForTimeout(550);
  await page.touchscreen.tap(hit.x, hit.y);
  await page.getByRole('status', { name: '剩余 1 颗心' }).waitFor();
  console.log(
    'PASS real two-finger pinch, subsequent deliberate tap, rapid duplicate suppression',
  );
} finally {
  await browser.close();
}
