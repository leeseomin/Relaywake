import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(projectRoot, 'dist');
const maximumAssetBytes = 25 * 1024 * 1024;
const forbiddenJavaScriptMarkers = [
  '__C2_GAME__',
  'testKillFinalBoss',
  '20260729',
];

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

const files = walkFiles(outputDirectory);
if (!files.some((path) => relative(outputDirectory, path) === 'index.html')) {
  throw new Error('Production output does not contain dist/index.html.');
}

for (const path of files) {
  const outputPath = relative(outputDirectory, path);
  const bytes = statSync(path).size;
  if (bytes > maximumAssetBytes) {
    throw new Error(`${outputPath} exceeds the Cloudflare Pages 25 MiB file limit.`);
  }
  if (extname(path) !== '.js') continue;

  const source = readFileSync(path, 'utf8');
  for (const marker of forbiddenJavaScriptMarkers) {
    if (source.includes(marker)) {
      throw new Error(`Production JavaScript contains the E2E marker ${marker}: ${outputPath}`);
    }
  }
}

process.stdout.write(`Verified ${files.length} production files for Cloudflare Pages.\n`);
