import { expect, test, type Locator } from '@playwright/test';
import {
  openIsolatedApp,
  readStoredGameData,
  startRun,
  waitForStoredRun,
  type StoredRun,
} from './game.helpers';

test.beforeEach(async ({ page }) => {
  await openIsolatedApp(page);
});

test('shows the RELAYWAKE brand in English without legacy project labels', async ({ page }) => {
  await expect(page).toHaveTitle('RELAYWAKE');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RELAYWAKE');
  await expect(page.getByTestId('start-run')).toContainText('Start Operation');
  const settingsButton = page.getByRole('button', { name: 'Settings' });
  await expect(settingsButton).toHaveText('SETTINGS');
  await expect(settingsButton).toHaveCSS('border-radius', '2px');
  await expect(page.getByRole('link', { name: 'Relaywake GitHub repository' })).toHaveAttribute(
    'href',
    'https://github.com/leeseomin/Relaywake',
  );
  await expect(page.locator('.hero-orbit')).toHaveCount(0);

  for (const removedText of [
    'A Phaser 4 reconstruction of the original Unity survival-action project',
    'WEB REBUILD',
    'PHASER 4.2',
    'TYPESCRIPT STRICT',
    'PINIA',
    'DEXIE',
    'UNITY DATA → ZOD CONFIG',
    'BUILD 3.0.0',
    'LOCAL-FIRST · NO ACCOUNT',
  ]) {
    await expect(page.getByText(removedText, { exact: true })).toHaveCount(0);
  }
});

test('keeps the loadout visible on a wide, short display', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 911 });
  await page.reload();

  await expect(page.getByTestId('character-blue')).toBeInViewport({ ratio: 0.8 });
  await expect(page.getByTestId('field-theme-classic')).toBeInViewport({ ratio: 0.5 });
});

test('defaults to the classic field and starts with the selected field theme', async ({ page }) => {
  const classic = page.getByTestId('field-theme-classic');
  const starlit = page.getByTestId('field-theme-starlit');

  await expect(classic).toHaveAttribute('aria-checked', 'true');
  await expect(starlit).toHaveAttribute('aria-checked', 'false');

  await starlit.click();
  await expect(classic).toHaveAttribute('aria-checked', 'false');
  await expect(starlit).toHaveAttribute('aria-checked', 'true');
  await startRun(page);

  await expect.poll(
    () => page.evaluate(() => window.__C2_GAME__?.snapshot().fieldThemeId),
  ).toBe('starlit');
});

test('selects Fire Master and starts with the orbiting fire core', async ({ page }) => {
  await page.getByTestId('character-fire').click();
  await expect(page.locator('.character-detail')).toContainText(/파이어 마스터|Fire Master/);
  await startRun(page);

  await expect.poll(async () => page.evaluate(() => {
    const snapshot = window.__C2_GAME__?.snapshot();
    return {
      characterId: snapshot?.characterId,
      orbiters: snapshot?.orbiters ?? 0,
    };
  })).toEqual({ characterId: 'fire', orbiters: 1 });
});

test('levels up, pauses, loses, and persists the run and profile', async ({ page }) => {
  await startRun(page);

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
  await expect.poll(() => page.evaluate(() => {
    const snapshot = window.__C2_GAME__?.snapshot();
    return {
      simulation: snapshot?.paused,
      presentation: snapshot?.presentationPaused,
      audio: snapshot?.audioPaused,
    };
  })).toEqual({ simulation: true, presentation: true, audio: true });
  await page.getByRole('button', { name: /계속하기|Resume/ }).click();
  await expect(page.getByTestId('pause-dialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => {
    const snapshot = window.__C2_GAME__?.snapshot();
    return {
      simulation: snapshot?.paused,
      presentation: snapshot?.presentationPaused,
      audio: snapshot?.audioPaused,
    };
  })).toEqual({ simulation: false, presentation: false, audio: false });

  await page.evaluate(() => window.__C2_GAME__?.damagePlayer(999_999));
  const dialog = page.getByTestId('game-over-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(/작전 실패|Operation Failed/);

  const stored = await waitForStoredRun(page);
  const run = onlyRun(stored.runs);
  expect(run).toMatchObject({
    characterId: 'blue',
    victory: false,
    level: 2,
  });
  expect(run.elapsedSeconds).toBeGreaterThanOrEqual(0);
  expect(stored.profile).toMatchObject({
    id: 'main',
    coins: run.coins,
    bestKills: run.kills,
    totalRuns: 1,
  });
  expect(stored.profile?.bestTimeSeconds).toBe(run.elapsedSeconds);
  await expectResultStats(dialog, run);
});

test('kills the final boss, wins, and persists its reward and profile totals', async ({ page }) => {
  await startRun(page);

  await page.evaluate(() => window.__C2_GAME__?.testKillFinalBoss());
  const dialog = page.getByTestId('game-over-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(/작전 완료|Operation Complete/);

  const stored = await waitForStoredRun(page);
  const run = onlyRun(stored.runs);
  expect(run).toMatchObject({
    characterId: 'blue',
    victory: true,
    kills: 1,
  });
  expect(run.coins).toBeGreaterThanOrEqual(10);
  expect(run.damageDealt).toBeGreaterThan(0);
  expect(stored.profile).toMatchObject({
    id: 'main',
    coins: run.coins,
    bestKills: run.kills,
    totalRuns: 1,
  });
  expect(stored.profile?.bestTimeSeconds).toBe(run.elapsedSeconds);
  await expectResultStats(dialog, run);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.coin-balance')).toContainText(run.coins.toLocaleString());
  expect(await waitForStoredRun(page)).toEqual(stored);
});

test('rolls back a failed settings change and shows a storage toast', async ({ page }) => {
  await page.getByRole('button', { name: /설정|Settings/ }).click();
  const soundToggle = page.getByRole('checkbox').first();
  await expect(soundToggle).toBeChecked();

  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function put(
      value: unknown,
      key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      if (this.name === 'settings') {
        throw new DOMException('Simulated settings failure.', 'QuotaExceededError');
      }
      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key);
    };
  });

  await soundToggle.click();

  await expect(soundToggle).toBeChecked();
  await expect(page.getByRole('status')).toHaveText(
    /저장하지 못했습니다|Could not save/,
  );

  await page.reload();
  await page.getByRole('button', { name: /설정|Settings/ }).click();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
});

test('persists successful settings and restores them after reload', async ({ page }) => {
  await page.getByRole('button', { name: /설정|Settings/ }).click();
  const screenShakeToggle = page.getByRole('checkbox').nth(1);
  await expect(screenShakeToggle).toBeChecked();

  await screenShakeToggle.click();

  await expect(screenShakeToggle).not.toBeChecked();
  await expect.poll(async () => (await readStoredGameData(page)).settings?.screenShake)
    .toBe(false);

  await page.reload();
  await page.getByRole('button', { name: /설정|Settings/ }).click();
  await expect(page.getByRole('checkbox').nth(1)).not.toBeChecked();
  expect((await readStoredGameData(page)).settings?.screenShake).toBe(false);
});

test('mobile touch input moves and resets the stick, then pauses the run', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Touch input is covered by the mobile Chromium project.');
  await startRun(page);

  const stick = page.getByRole('application', { name: /터치 이동|Touch movement|이동|Move/ });
  const knob = stick.locator('.touch-knob');
  await expect(stick).toBeVisible();
  const bounds = await stick.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('Touch stick did not have a bounding box.');

  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const moved = {
    x: center.x + bounds.width * 0.25,
    y: center.y,
  };
  const cdp = await page.context().newCDPSession(page);

  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...center, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...moved, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    });

    await expect.poll(() => knob.evaluate((element) => (element as HTMLElement).style.transform))
      .not.toBe('translate(0px, 0px)');
    await expect.poll(() => page.evaluate(() => window.__C2_GAME__?.snapshot().touchX ?? 0))
      .toBeGreaterThan(0.5);
    await expect.poll(() => page.evaluate(() => window.__C2_GAME__?.snapshot().touchY ?? 1))
      .toBeCloseTo(0, 1);
  } finally {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
  }

  await expect.poll(() => knob.evaluate((element) => (element as HTMLElement).style.transform))
    .toBe('translate(0px, 0px)');
  await expect.poll(() => page.evaluate(() => {
    const snapshot = window.__C2_GAME__?.snapshot();
    return [snapshot?.touchX ?? 1, snapshot?.touchY ?? 1];
  })).toEqual([0, 0]);

  await page.getByRole('button', { name: /일시정지|Pause/ }).tap();
  await expect(page.getByTestId('pause-dialog')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const snapshot = window.__C2_GAME__?.snapshot();
    return {
      simulation: snapshot?.paused,
      presentation: snapshot?.presentationPaused,
      audio: snapshot?.audioPaused,
    };
  })).toEqual({ simulation: true, presentation: true, audio: true });
});

function onlyRun(runs: StoredRun[]): StoredRun {
  expect(runs).toHaveLength(1);
  const run = runs[0];
  if (!run) throw new Error('Expected one persisted run.');
  return run;
}

async function expectResultStats(
  dialog: Locator,
  run: StoredRun,
): Promise<void> {
  const stats = dialog.locator('.result-grid > div');
  await expect(stats.nth(1).locator('strong')).toHaveText(run.kills.toLocaleString());
  await expect(stats.nth(2).locator('strong')).toHaveText(run.level.toLocaleString());
  await expect(stats.nth(3).locator('strong')).toHaveText(`◆ ${run.coins.toLocaleString()}`);
  await expect(dialog.locator('.damage-report')).toContainText(Math.round(run.damageDealt).toLocaleString());
}
