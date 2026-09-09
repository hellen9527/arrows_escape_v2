// Browser QA uses a fresh profile and only the specified game's test origin.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const origin = process.env.QA_URL || 'http://localhost:4173';
(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: process.env.QA_RESOLVE
      ? [`--host-resolver-rules=${process.env.QA_RESOLVE}`]
      : [],
  });
  try {
    await fs.mkdir('work', { recursive: true });
    for (const [width, height] of [
      [320, 568],
      [390, 664],
      [390, 844],
      [430, 932],
      [568, 320],
      [844, 390],
      [1024, 500],
      [1440, 900],
    ]) {
      const mobile = width < 1100;
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: mobile,
        hasTouch: mobile,
      });
      await context.addInitScript(() => {
        if (!localStorage.getItem('arrow-escape:campaign'))
          localStorage.setItem('arrow-escape:campaign', 'classic');
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(origin);
      await page.waitForFunction(() => localStorage.getItem('arrow-escape:v1'));
      const geometry = await page.evaluate(() => {
        const box = (s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        };
        return {
          viewport: innerHeight,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          controls: box('.game-controls'),
          board: box('.board-viewport'),
        };
      });
      if (mobile) {
        assert(
          geometry.scrollHeight <= height + 1,
          `page scrolls at ${width}x${height}: ${JSON.stringify(geometry)}`,
        );
        assert(geometry.scrollWidth <= width + 1, 'horizontal page overflow');
        assert(
          geometry.controls.bottom <= height + 1 && geometry.controls.top >= 0,
          'controls outside viewport',
        );
        assert(geometry.board.height >= 130, 'board too short');
        await page.mouse.wheel(0, 400);
        assert.equal(
          await page.evaluate(() => scrollY),
          0,
          'page moved with wheel',
        );
      }
      const arrow = page.getByRole('button', {
        name: '箭头 4，向左',
        exact: true,
      });
      // Tap a point on the actual SVG path, not the center of its bounding box.
      const hit = await arrow.evaluate((el) => {
        const p = el.getPointAtLength(el.getTotalLength() / 2);
        const q = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
        return { x: q.x, y: q.y };
      });
      if (mobile) await page.touchscreen.tap(hit.x, hit.y);
      else await page.mouse.click(hit.x, hit.y);
      await page.getByText('还剩 6 支箭头', { exact: true }).waitFor();
      await page.getByRole('button', { name: '撤销', exact: true }).click();
      await page.getByText('还剩 7 支箭头', { exact: true }).waitFor();
      await page.getByRole('button', { name: '放大棋盘', exact: true }).click();
      if (mobile) {
        await page.locator('.board-viewport').evaluate((el) => {
          el.scrollTop = 100;
          el.scrollLeft = 100;
        });
        assert(
          await page
            .locator('.board-viewport')
            .evaluate((el) => el.scrollTop > 0 && el.scrollLeft > 0),
          'zoom cannot pan',
        );
        assert.equal(await page.evaluate(() => scrollY), 0);
      }
      await page.getByRole('button', { name: '缩小棋盘', exact: true }).click();
      await page.getByRole('button', { name: '设置', exact: true }).click();
      await page.getByText('添加到主屏幕', { exact: true }).click();
      await page.getByText(/iPhone \/ iPad：/).waitFor();
      const dialog = page.getByRole('dialog');
      const r = await dialog.boundingBox();
      assert(
        r.y >= 0 && r.y + r.height <= height + 1,
        'dialog outside viewport',
      );
      await page.locator('#language').selectOption('en');
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page
        .locator('[data-slot=dialog-content]')
        .waitFor({ state: 'hidden' });
      await page.reload();
      await page
        .getByRole('button', { name: 'Settings', exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Levels', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      if (height <= 568)
        assert(
          await page
            .getByRole('dialog')
            .evaluate((el) => el.scrollHeight > el.clientHeight),
          'short-screen level picker should scroll internally',
        );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page
        .locator('[data-slot=dialog-content]')
        .waitFor({ state: 'hidden' });
      await page.screenshot({ path: `work/mobile-${width}x${height}.png` });
      assert.deepEqual(errors, []);
      console.log('PASS', width, height, JSON.stringify(geometry));
      await context.close();
    }
    const page = await browser.newPage();
    await page.goto(origin);
    assert.equal(
      await page.locator('link[rel=manifest]').getAttribute('href'),
      '/manifest.webmanifest',
    );
    assert.match(
      await page.locator('meta[name=viewport]').getAttribute('content'),
      /viewport-fit=cover/,
    );
    const response = await page.request.get(origin + '/manifest.webmanifest');
    const manifest = await response.json();
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    for (const icon of manifest.icons)
      assert((await page.request.get(origin + icon.src)).ok());
    assert(
      (await page.request.get(origin + '/icons/apple-touch-icon.png')).ok(),
    );
    console.log('PASS manifest, metadata and icon endpoints');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
