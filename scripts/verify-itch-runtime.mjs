import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '@playwright/test';

const projectRoot = resolve(import.meta.dirname, '..');
const buildDirectory = resolve(projectRoot, 'dist');
const mountPath = '/embed/relaywake/';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith(mountPath)) {
    response.writeHead(404).end('Not found');
    return;
  }

  const relativePath = decodeURIComponent(url.pathname.slice(mountPath.length)) || 'index.html';
  const filePath = resolve(buildDirectory, relativePath);
  if (filePath !== buildDirectory && !filePath.startsWith(`${buildDirectory}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    }).end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolveListening, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListening);
});

const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not resolve the itch verification port.');
const url = `http://127.0.0.1:${address.port}${mountPath}`;
const failedResponses = [];
const pageErrors = [];
let browser;

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1, name: 'RELAYWAKE' }).waitFor();
  await page.getByTestId('start-run').click();
  await page.getByTestId('game-viewport').waitFor();
  await page.waitForTimeout(1_000);

  if (failedResponses.length > 0) {
    throw new Error(`Nested-path requests failed:\n${failedResponses.join('\n')}`);
  }
  if (pageErrors.length > 0) throw new Error(`Nested-path page errors:\n${pageErrors.join('\n')}`);

  process.stdout.write(`Verified the itch production build at nested path ${mountPath}.\n`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()));
}
