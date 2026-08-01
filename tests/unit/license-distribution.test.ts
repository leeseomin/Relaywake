import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8')
  .replaceAll('\r\n', '\n');

describe('license distribution', () => {
  it('ships an exact copy of the project license', () => {
    expect(read('public/LICENSE.txt')).toBe(read('LICENSE'));
  });

  it('preserves every license and notice used by the production browser bundle', () => {
    const distributed = read('public/THIRD_PARTY_LICENSES.txt');
    const requiredFiles = [
      'node_modules/vue/LICENSE',
      'node_modules/phaser/LICENSE.md',
      'node_modules/pinia/LICENSE',
      'node_modules/zod/LICENSE',
      'node_modules/dexie/LICENSE',
      'node_modules/dexie/NOTICE',
    ];

    for (const path of requiredFiles) {
      expect(distributed, path).toContain(read(path).trimEnd());
    }

    expect(distributed).toContain('Assets/Textures/Backgrounds/DirtTile.png');
    expect(distributed).toContain('https://opengameart.org/content/gold-treasure-icons-16x16');
    expect(distributed).toContain('https://kenney.nl/support');
  });
});
