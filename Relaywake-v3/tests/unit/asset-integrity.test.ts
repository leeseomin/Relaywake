import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  assetDisplayScale,
  assetManifest,
  getAsset,
  iconUrlByKey,
  phaserAssets,
  type AssetFormat,
} from '../../src/game/assets';
import { abilities } from '../../src/game/data/abilities';

const PUBLIC_ASSETS = resolve(process.cwd(), 'public/assets');
const PNG_SIGNATURE = '89504e470d0a1a0a';
const BAKED_ENEMY_FRAMES = [
  ['enemy-alien', 54],
  ['enemy-crab', 56],
  ['enemy-brute', 58],
  ['enemy-wizard', 56],
  ['enemy-nailhead', 56],
  ['enemy-gravity', 58],
  ['enemy-miniboss', 54],
  ['enemy-boss', 112],
] as const;

function publicFile(assetPath: string): string {
  return resolve(process.cwd(), 'public', assetPath.replace(/^\//, ''));
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function detectFormat(bytes: Buffer): AssetFormat {
  if (bytes.subarray(0, 8).toString('hex') === PNG_SIGNATURE) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  throw new Error('Unsupported image signature.');
}

function imageDimensions(bytes: Buffer, format: AssetFormat): readonly [number, number] {
  if (format === 'png') return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    }
    offset += segmentLength + 2;
  }
  throw new Error('JPEG dimensions were not found.');
}

interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

function decodeRgbaPng(bytes: Buffer): DecodedPng {
  expect(detectFormat(bytes)).toBe('png');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlace = bytes[28];
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error('Visual smoke checks require a non-interlaced 8-bit RGBA PNG.');
  }

  const idat: Buffer[] = [];
  let chunkOffset = 8;
  while (chunkOffset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(chunkOffset);
    const type = bytes.subarray(chunkOffset + 4, chunkOffset + 8).toString('ascii');
    if (type === 'IDAT') idat.push(bytes.subarray(chunkOffset + 8, chunkOffset + 8 + length));
    chunkOffset += length + 12;
    if (type === 'IEND') break;
  }

  const encoded = inflateSync(Buffer.concat(idat));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = new Uint8Array(stride * height);

  for (let y = 0; y < height; y += 1) {
    const encodedRow = y * (stride + 1);
    const filter = encoded[encodedRow] ?? 0;
    const row = y * stride;
    const previousRow = row - stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = encoded[encodedRow + x + 1] ?? 0;
      const left = x >= bytesPerPixel ? pixels[row + x - bytesPerPixel] ?? 0 : 0;
      const up = y > 0 ? pixels[previousRow + x] ?? 0 : 0;
      const upLeft = y > 0 && x >= bytesPerPixel
        ? pixels[previousRow + x - bytesPerPixel] ?? 0
        : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
      pixels[row + x] = value & 0xff;
    }
  }

  return { width, height, pixels };
}

function paeth(left: number, up: number, upLeft: number): number {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

function significantAlphaComponents(image: DecodedPng): number {
  const visible = new Uint8Array(image.width * image.height);
  for (let index = 0; index < visible.length; index += 1) {
    visible[index] = (image.pixels[index * 4 + 3] ?? 0) >= 128 ? 1 : 0;
  }

  let significant = 0;
  for (let start = 0; start < visible.length; start += 1) {
    if (visible[start] !== 1) continue;
    visible[start] = 2;
    const queue = [start];
    let size = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) continue;
      size += 1;
      const x = current % image.width;
      const neighbors = [
        current - image.width,
        current + image.width,
        x > 0 ? current - 1 : -1,
        x + 1 < image.width ? current + 1 : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= visible.length || visible[neighbor] !== 1) continue;
        visible[neighbor] = 2;
        queue.push(neighbor);
      }
    }
    if (size >= 8) significant += 1;
  }
  return significant;
}

describe('asset manifest integrity', () => {
  it('matches public/assets in both directions with unique keys and paths', () => {
    const manifestPaths = assetManifest.map((asset) => asset.path);
    const publicPaths = walkFiles(PUBLIC_ASSETS).map(
      (path) => `/assets/${relative(PUBLIC_ASSETS, path).replaceAll('\\', '/')}`,
    );

    expect(new Set(assetManifest.map((asset) => asset.key)).size).toBe(assetManifest.length);
    expect(new Set(manifestPaths).size).toBe(assetManifest.length);
    expect([...manifestPaths].sort()).toEqual(publicPaths.sort());
  });

  it('checks magic bytes, extensions, dimensions, and frame geometry from file bytes', () => {
    for (const asset of assetManifest) {
      const bytes = readFileSync(publicFile(asset.path));
      const actualFormat = detectFormat(bytes);
      const extension = extname(asset.path).slice(1);
      expect(actualFormat, asset.path).toBe(asset.format);
      expect(extension, asset.path).toBe(asset.format);
      expect(imageDimensions(bytes, actualFormat), asset.path).toEqual([
        asset.dimensions.width,
        asset.dimensions.height,
      ]);

      if ('frame' in asset) {
        expect(asset.dimensions.width % asset.frame.width, asset.key).toBe(0);
        expect(asset.dimensions.height % asset.frame.height, asset.key).toBe(0);
        const frameCount = (asset.dimensions.width / asset.frame.width)
          * (asset.dimensions.height / asset.frame.height);
        expect(frameCount, asset.key).toBe(asset.frame.count);
      }
    }
  });

  it('bakes generator-derived enemy sheets to their final scale-1 frame sizes', () => {
    for (const [key, frameSize] of BAKED_ENEMY_FRAMES) {
      const asset = getAsset(key);

      expect(asset.dimensions, key).toEqual({ width: frameSize * 4, height: frameSize });
      expect('frame' in asset ? asset.frame : undefined, key).toEqual({
        width: frameSize,
        height: frameSize,
        count: 4,
      });
      expect(asset.source, key).toMatchObject({
        kind: 'project-derived',
        path: '../monster-generator.html',
      });
      expect(asset.source.modified, key).toContain('scripts/generate-enemy-sprites.mjs');
    }
  });

  it('preloads only manifest entries that Phaser actually consumes', () => {
    const runtimeSources = [
      'src/game/scenes/SurvivorScene.ts',
      'src/game/data/characters.ts',
      'src/game/data/enemies.ts',
    ].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n');
    const bootSource = readFileSync(
      resolve(process.cwd(), 'src/game/scenes/BootScene.ts'),
      'utf8',
    );

    expect(bootSource).toContain('for (const asset of phaserAssets)');
    for (const asset of phaserAssets) {
      expect(asset.consumers).toContain('phaser');
      expect(runtimeSources, asset.key).toContain(`'${asset.key}'`);
    }
    expect(phaserAssets.map((asset) => asset.key)).not.toEqual(
      expect.arrayContaining([
        'pickup-gem-dark',
        'pickup-gem-light',
        'ui-circle',
        'ui-circle-outline',
        'ui-pause',
        'ui-play',
        'ui-square',
      ]),
    );
    expect(
      assetManifest.filter((asset) => asset.consumers.length === 0).map((asset) => asset.key),
    ).toEqual(['pickup-gem-dark', 'pickup-gem-light', 'ui-circle-outline', 'ui-pause']);
    for (const asset of assetManifest.filter((entry) => entry.consumers.length === 0)) {
      expect('retainedFor' in asset ? asset.retainedFor : undefined).toBe('upstream-reference');
    }
  });

  it('provides every ability icon from the same manifest', () => {
    const abilityIconKeys = [...new Set(abilities.map((ability) => ability.iconKey))].sort();
    expect(Object.keys(iconUrlByKey).sort()).toEqual(abilityIconKeys);
  });

  it('records complete upstream or deliberately internal provenance and license evidence', () => {
    for (const asset of assetManifest) {
      expect(asset.license.evidence.length).toBeGreaterThan(0);
      if (asset.source.kind === 'upstream') {
        expect(asset.source.repositoryUrl).toBe(
          'https://github.com/matthiasbroske/VampireSurvivorsClone',
        );
        expect(asset.source.sourceUrl).toContain(asset.source.commit);
        expect(asset.source.path).toMatch(/^Assets\//);
        expect(asset.source.commit).toBe('01f8c76e40f52b853117f436d6d3d08f80a41506');
      } else {
        expect(asset.source.repositoryUrl).toBeNull();
        expect(asset.source.sourceUrl).toBeNull();
        expect(asset.source.commit).toBeNull();
        expect(asset.license.id).toBe('MIT');
        expect(asset.license.owner).toBe('Relaywake contributors');
        expect(asset.license.verification).toBe('project-provenance');
        if (asset.source.kind === 'generated') {
          expect(asset.source.path).toBeNull();
          expect(asset.source.modified).toContain('OpenAI built-in image generation');
        } else {
          expect([
            'kite-fire-v2.html',
            'pixel-character-maker-mongle.html',
            '../monster-generator.html',
          ]).toContain(asset.source.path);
          expect(asset.source.modified?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }

    for (const key of ['pickup-coin', 'pickup-coin-10'] as const) {
      const coin = getAsset(key);
      expect(coin.license).toMatchObject({
        id: 'CC0-1.0',
        owner: 'Bonsaiheldin',
        verification: 'exact-original-source',
      });
    }
    expect(getAsset('pickup-magnet').license).toMatchObject({
      id: 'CC0-1.0',
      owner: 'Kenney',
      verification: 'publisher-general-license',
    });
  });
});

describe('optimized asset quality guards', () => {
  it('keeps every generated enemy frame visible and animated', () => {
    for (const [key, frameSize] of BAKED_ENEMY_FRAMES) {
      const image = decodeRgbaPng(readFileSync(publicFile(getAsset(key).path)));
      let animatedPixels = 0;

      for (let frame = 0; frame < 4; frame += 1) {
        let visiblePixels = 0;
        for (let y = 0; y < frameSize; y += 1) {
          for (let x = 0; x < frameSize; x += 1) {
            const offset = (y * image.width + frame * frameSize + x) * 4;
            if ((image.pixels[offset + 3] ?? 0) >= 128) visiblePixels += 1;
            if (frame === 0) continue;

            const firstFrame = (y * image.width + x) * 4;
            const differs = [0, 1, 2, 3].some(
              (channel) => image.pixels[firstFrame + channel]
                !== image.pixels[offset + channel],
            );
            if (differs) animatedPixels += 1;
          }
        }
        expect(visiblePixels, `${key} frame ${frame}`).toBeGreaterThan(frameSize);
      }

      expect(animatedPixels, key).toBeGreaterThan(frameSize);
    }
  });

  it('keeps the generated Roseglass Scout visual fixed', () => {
    const bytes = readFileSync(publicFile(getAsset('character-roseglass').path));
    const digest = createHash('sha256').update(bytes).digest('hex');

    expect(digest).toBe('934b750e9367088b59eacd6b0289794929ed9c2753ab8f484b2238454906ab2b');
  });

  it('keeps Mongle faces fixed while retaining lower-body walk motion', () => {
    const mongleCharacterKeys = [
      'character-roseglass',
      'character-startail',
      'character-moonhare',
      'character-dunehorn',
    ] as const;

    for (const key of mongleCharacterKeys) {
      const image = decodeRgbaPng(readFileSync(publicFile(getAsset(key).path)));
      let fixedFaceDifferences = 0;
      let movingBodyDifferences = 0;

      for (let frame = 1; frame < 4; frame += 1) {
        for (let y = 0; y < image.height; y += 1) {
          for (let x = 0; x < 24; x += 1) {
            const frameA = (y * image.width + x) * 4;
            const comparisonFrame = (y * image.width + x + frame * 24) * 4;
            const bothTransparent = image.pixels[frameA + 3] === 0
              && image.pixels[comparisonFrame + 3] === 0;
            const differs = !bothTransparent && [0, 1, 2, 3].some(
              (channel) => image.pixels[frameA + channel]
                !== image.pixels[comparisonFrame + channel],
            );
            if (!differs) continue;
            if (y < 14) fixedFaceDifferences += 1;
            else movingBodyDifferences += 1;
          }
        }
      }

      expect(fixedFaceDifferences, key).toBe(0);
      expect(movingBodyDifferences, key).toBeGreaterThan(0);
    }
  });

  it('keeps the tinted dirt texture within its transfer and decoded-memory budgets', () => {
    const asset = getAsset('background-dirt-red');
    const encodedBytes = statSync(publicFile(asset.path)).size;
    const decodedBytes = asset.dimensions.width * asset.dimensions.height * 4;

    expect(encodedBytes).toBeLessThanOrEqual(250_000);
    expect(decodedBytes).toBeLessThanOrEqual(1_048_576);
  });

  it('keeps the play icon bright and visible against the dark UI', () => {
    const image = decodeRgbaPng(readFileSync(publicFile(getAsset('ui-play').path)));
    let visiblePixels = 0;
    let luminance = 0;
    for (let index = 0; index < image.width * image.height; index += 1) {
      const offset = index * 4;
      if ((image.pixels[offset + 3] ?? 0) < 128) continue;
      visiblePixels += 1;
      luminance += (image.pixels[offset] ?? 0) * 0.2126
        + (image.pixels[offset + 1] ?? 0) * 0.7152
        + (image.pixels[offset + 2] ?? 0) * 0.0722;
    }

    expect(visiblePixels).toBeGreaterThan(image.width * image.height * 0.1);
    expect(visiblePixels).toBeLessThan(image.width * image.height * 0.75);
    expect(luminance / visiblePixels).toBeGreaterThan(180);
    expect(significantAlphaComponents(image)).toBe(1);
  });

  it('keeps one identifiable potion sprite at an approximately 24px gameplay size', () => {
    const asset = getAsset('pickup-potion');
    const image = decodeRgbaPng(readFileSync(publicFile(asset.path)));
    const renderedWidth = asset.dimensions.width * assetDisplayScale('pickup-potion');

    expect(significantAlphaComponents(image)).toBe(1);
    expect(renderedWidth).toBeGreaterThanOrEqual(24);
    expect(renderedWidth).toBeLessThanOrEqual(28);
  });

  it('keeps the Fire Master core as one compact, visible pixel orb', () => {
    const image = decodeRgbaPng(readFileSync(publicFile(getAsset('weapon-fire-orb').path)));

    expect(significantAlphaComponents(image)).toBe(1);
    expect(image.width).toBe(24);
    expect(image.height).toBe(24);
  });
});
