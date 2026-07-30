import { expect, test } from '@playwright/test';

test('starts a run, levels up, pauses and records a result', async ({ page }) => {
  await page.goto('/?e2e=1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('C2');
  await page.getByTestId('start-run').click();
  await expect(page.getByTestId('game-viewport')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__C2_GAME__?.ready));

  const initial = await page.evaluate(() => window.__C2_GAME__?.snapshot());
  expect(initial?.ready).toBe(true);
  expect(initial?.level).toBe(1);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', repeat: true }));
  });
  await expect(page.getByTestId('pause-dialog')).toBeHidden();

  await page.evaluate(() => window.__C2_GAME__?.grantXp(5));
  await expect(page.getByTestId('level-up-dialog')).toBeVisible();
  await expect(page.getByTestId('pause-dialog')).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__C2_GAME__?.snapshot().screen)).toBe('levelUp');
  await page.keyboard.press('1');
  await expect(page.getByTestId('level-up-dialog')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-dialog')).toBeVisible();
  await page.getByRole('button', { name: /계속하기|Resume/ }).click();
  await expect(page.getByTestId('pause-dialog')).toBeHidden();

  await page.evaluate(() => window.__C2_GAME__?.finishRun(false));
  await expect(page.getByTestId('game-over-dialog')).toBeVisible();
});
