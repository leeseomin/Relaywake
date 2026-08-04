import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = resolve(import.meta.dirname, '..');
const screenshotDirectory = resolve(projectRoot, 'itch', 'screenshots');
const baseUrl = 'http://127.0.0.1:4173';

function waitForServer(url, attempts = 80) {
  return new Promise((resolveReady, reject) => {
    let remaining = attempts;
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) return resolveReady();
      } catch {
        // The preview server is still starting.
      }
      remaining -= 1;
      if (remaining === 0) return reject(new Error(`Preview server did not start at ${url}.`));
      setTimeout(poll, 250);
    };
    poll();
  });
}

mkdirSync(screenshotDirectory, { recursive: true });
const server = spawn(
  'npm',
  ['run', 'preview:e2e', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
);

let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });

let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?e2e=1`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1, name: 'RELAYWAKE' }).waitFor();

  await page.screenshot({
    path: resolve(screenshotDirectory, '01-operative-selection.png'),
  });

  await page.getByTestId('character-fire').click();
  await page.getByTestId('field-theme-starlit').click();
  await page.getByTestId('start-run').click();
  await page.getByTestId('game-viewport').waitFor();
  await page.waitForFunction(() => Boolean(window.__C2_GAME__?.ready));
  await page.evaluate(() => {
    for (let index = 0; index < 22; index += 1) window.__C2_GAME__?.spawnEnemy();
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1_500);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: resolve(screenshotDirectory, '02-starlit-combat.png'),
  });

  await page.evaluate(() => window.__C2_GAME__?.grantXp(5));
  await page.getByTestId('level-up-dialog').waitFor();
  await page.screenshot({
    path: resolve(screenshotDirectory, '03-level-up.png'),
  });

  await page.keyboard.press('1');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__C2_GAME__?.testKillFinalBoss());
  await page.getByTestId('game-over-dialog').waitFor();
  await page.screenshot({
    path: resolve(screenshotDirectory, '04-operation-complete.png'),
  });

  await context.close();
  process.stdout.write(`Captured four itch.io screenshots in ${screenshotDirectory}.\n`);
} catch (error) {
  if (serverLog) process.stderr.write(serverLog);
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
