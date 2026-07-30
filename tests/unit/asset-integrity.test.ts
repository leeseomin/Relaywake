import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetPaths } from '../../src/game/assets';

function publicFile(assetPath: string): string {
  return resolve(process.cwd(), 'public', assetPath.replace(/^\//, ''));
}

function pngDimensions(assetPath: string): readonly [number, number] {
  const bytes = readFileSync(publicFile(assetPath));
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${assetPath} is not a PNG file.`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] as const;
}

describe('ported asset integrity', () => {
  it('keeps every asset-map path readable', () => {
    for (const assetPath of Object.values(assetPaths)) {
      expect(() => readFileSync(publicFile(assetPath))).not.toThrow();
    }
  });

  it('keeps spritesheet dimensions aligned with BootScene frame sizes', () => {
    const frames24 = [
      assetPaths.characterBlue,
      assetPaths.characterPurple,
      assetPaths.characterWhite,
      assetPaths.characterGray,
      assetPaths.enemyAlien,
      assetPaths.enemyCrab,
      assetPaths.enemyBrute,
      assetPaths.enemyWizard,
      assetPaths.enemyNailhead,
      assetPaths.enemyGravity,
      assetPaths.enemyMiniboss,
    ];
    for (const assetPath of frames24) expect(pngDimensions(assetPath)).toEqual([96, 24]);
    expect(pngDimensions(assetPaths.enemyBoss)).toEqual([192, 48]);
    expect(pngDimensions(assetPaths.gems)).toEqual([56, 12]);
  });
});
