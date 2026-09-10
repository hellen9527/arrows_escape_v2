import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { defaultProgress, newRun } from '../lib/game/engine.ts';
import { makeLevel } from '../lib/game/levels.ts';

const key = 'arrow-escape:challenge:v3';
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: process.env.QA_RESOLVE
    ? [`--host-resolver-rules=${process.env.QA_RESOLVE}`]
    : [],
});
const saved = {
  ...defaultProgress('challenge'),
  best: { 1: 3, 2: 3, 3: 3 },
  unlocked: 4,
  run: newRun(4),
};
try {
  const results = await Promise.allSettled([
    (async () => {
      const page = await browser.newPage();
      await page.addInitScript(
        ({ key, saved }) => {
          localStorage.setItem(key, JSON.stringify(saved));
          const original = Reflect.get(Storage.prototype, 'getItem');
          window.readRawSave = () => original.call(localStorage, key);
          Storage.prototype.getItem = function (name) {
            if (name === key)
              throw new DOMException('Read blocked', 'SecurityError');
            return original.call(this, name);
          };
        },
        { key, saved },
      );
      await page.goto(process.env.QA_URL || 'http://localhost:4176');
      await page.getByRole('button', { name: '选关', exact: true }).click();
      await page
        .getByRole('button', { name: '经典篇 · 60 关', exact: true })
        .click();
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      const arrow = page.locator('.arrow-hit').first();
      await arrow.press('Enter');
      assert.deepEqual(
        JSON.parse(await page.evaluate(() => window.readRawSave())),
        saved,
        'initial read failure must never overwrite unread saved progress, including later actions',
      );
      await page.close();
      console.log(
        'PASS initial read failure preserves saved progress through play and mode actions',
      );
    })(),
    (async () => {
      const page = await browser.newPage();
      const p = {
        ...defaultProgress('challenge'),
        best: Object.fromEntries(
          Array.from({ length: 22 }, (_, i) => [i + 1, 3]),
        ),
        unlocked: 23,
        run: newRun(23),
      };
      await page.addInitScript(
        ({ key, p }) => localStorage.setItem(key, JSON.stringify(p)),
        { key, p },
      );
      await page.goto(process.env.QA_URL || 'http://localhost:4176');
      await page
        .getByRole('button', { name: '提示 2/2', exact: true })
        .waitFor();
      const dual = makeLevel(23, 'challenge').arrows.find(
        (a) => a.key && a.lock,
      );
      assert(dual);
      const target = page.getByRole('button', {
        name: new RegExp(`^箭头 ${dual.id + 1}，`),
      });
      assert.match(await target.getAttribute('aria-label'), /钥匙 B，锁 A/);
      const group = target.locator('..');
      assert.equal(await group.locator('.key-token').count(), 1);
      assert.equal(await group.locator('.lock-token').count(), 1);
      await page.close();
      console.log(
        'PASS staged key B exposes both key B and lock A visually and accessibly',
      );
    })(),
  ]);
  for (const r of results) if (r.status === 'rejected') console.error(r.reason);
  assert(results.every((r) => r.status === 'fulfilled'));
} finally {
  await browser.close();
}
