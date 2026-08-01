import { expect, test } from '@playwright/test';

test('ignores the E2E query flag in the production build', async ({ page }) => {
  await page.goto('/?e2e=1');

  await expect(page).toHaveTitle('Signalfall');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Signalfall');
  await expect.poll(() => page.evaluate(() => window.__C2_GAME__)).toBeUndefined();

  await page.getByTestId('start-run').click();
  await expect(page.getByTestId('game-viewport')).toBeVisible();
  await expect(page.locator('.hud-center strong')).toHaveText(/^(10:00|09:5\d)$/);
  await expect.poll(() => page.evaluate(() => window.__C2_GAME__)).toBeUndefined();
});
