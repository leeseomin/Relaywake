import { expect, test } from '@playwright/test';
import { assetManifest } from '../../src/game/assets';

test('ignores E2E controls and runs normal rules in the production build', async ({ page }) => {
  await page.goto('/?e2e=1');

  await expect(page).toHaveTitle('RELAYWAKE');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('RELAYWAKE');
  await expect.poll(() => page.evaluate(() => ({
    legacyBridge: window.__C2_GAME__,
    namedBridge: (window as Window & { C2_GAME?: unknown }).C2_GAME,
  }))).toEqual({ legacyBridge: undefined, namedBridge: undefined });

  await page.getByTestId('start-run').click();
  await expect(page.getByTestId('game-viewport')).toBeVisible();
  await expect(page.locator('.hud-center strong')).toHaveText(/^(10:00|09:5\d)$/);
  await expect.poll(() => page.evaluate(() => window.__C2_GAME__)).toBeUndefined();
});

test('serves every registered image with the expected MIME type', async ({ request }) => {
  const favicon = await request.get('/favicon.svg');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toContain('image/svg+xml');

  for (const asset of assetManifest) {
    const response = await request.get(asset.path);
    expect(response.status(), asset.path).toBe(200);
    expect(response.headers()['content-type'], asset.path).toContain(`image/${asset.format}`);
  }
});
