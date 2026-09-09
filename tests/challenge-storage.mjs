import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { defaultProgress, newRun } from '../lib/game/engine.ts';
const origin = process.env.QA_URL || 'http://localhost:4175';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: process.env.QA_RESOLVE
    ? [`--host-resolver-rules=${process.env.QA_RESOLVE}`]
    : [],
});
try {
  const context = await browser.newContext();
  const p = defaultProgress();
  p.best = Object.fromEntries(Array.from({ length: 29 }, (_, i) => [i + 1, 3]));
  p.unlocked = 30;
  p.run = newRun(30);
  await context.addInitScript((p) => {
    localStorage.setItem('arrow-escape:v1', JSON.stringify(p));
    // oxlint-disable-next-line typescript/unbound-method -- Native method is invoked with its explicit receiver below.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'arrow-escape:challenge:v2')
        throw new DOMException('Test quota', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, p);
  const page = await context.newPage();
  await page.goto(origin);
  await page.getByRole('button', { name: '选关', exact: true }).click();
  await page
    .getByRole('button', { name: '经典篇 · 60 关', exact: true })
    .click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(
    await page.locator('h1 span').textContent(),
    '30',
    'quota failure must not replace destination progress',
  );
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('arrow-escape:v1')).run.level,
    ),
    30,
  );
  console.log(
    'PASS quota failure while switching retains existing classic level30 save',
  );
} finally {
  await browser.close();
}
