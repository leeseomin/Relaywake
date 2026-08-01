export type AssetFormat = 'jpeg' | 'png';
export type AssetConsumer = 'ability-icon' | 'menu-css' | 'phaser';

export interface AssetDimensions {
  readonly width: number;
  readonly height: number;
}

export interface AssetFrame {
  readonly width: number;
  readonly height: number;
  readonly count: number;
}

export interface AssetSource {
  readonly kind: 'generated' | 'project-derived' | 'upstream';
  readonly repositoryUrl: string | null;
  readonly sourceUrl: string | null;
  readonly commit: string | null;
  readonly path: string | null;
  readonly author: string;
  readonly modified: string | null;
}

export interface AssetLicense {
  readonly id: 'CC0-1.0' | 'MIT';
  readonly evidence: string;
  readonly owner: string;
  readonly verification:
    | 'exact-original-source'
    | 'project-provenance'
    | 'publisher-general-license'
    | 'upstream-bundle-declaration';
}

export interface AssetManifestEntry {
  readonly key: string;
  readonly path: `/assets/${string}`;
  readonly format: AssetFormat;
  readonly dimensions: AssetDimensions;
  readonly frame?: AssetFrame;
  readonly consumers: readonly AssetConsumer[];
  readonly retainedFor?: 'upstream-reference';
  readonly displayScale?: number;
  readonly source: AssetSource;
  readonly license: AssetLicense;
}

const UPSTREAM_REPOSITORY = 'https://github.com/matthiasbroske/VampireSurvivorsClone';
const UPSTREAM_COMMIT = '01f8c76e40f52b853117f436d6d3d08f80a41506';

interface UpstreamAttribution {
  readonly author: string;
  readonly license: AssetLicense;
}

const DEFAULT_UPSTREAM_ATTRIBUTION: UpstreamAttribution = {
  author: 'VampireSurvivorsClone contributors and credited artists',
  license: {
    id: 'MIT',
    evidence: `${UPSTREAM_REPOSITORY}/blob/${UPSTREAM_COMMIT}/LICENSE`,
    owner: 'VampireSurvivorsClone contributors and credited artists',
    verification: 'upstream-bundle-declaration',
  },
};

const BONSAI_COIN_ATTRIBUTION: UpstreamAttribution = {
  author: 'Bonsaiheldin',
  license: {
    id: 'CC0-1.0',
    evidence: 'https://opengameart.org/content/gold-treasure-icons-16x16',
    owner: 'Bonsaiheldin',
    verification: 'exact-original-source',
  },
};

const KENNEY_ATTRIBUTION: UpstreamAttribution = {
  author: 'Kenney',
  license: {
    id: 'CC0-1.0',
    evidence: 'https://www.kenney.nl/support',
    owner: 'Kenney',
    verification: 'publisher-general-license',
  },
};

function upstream(
  path: string,
  modified: string | null = null,
  attribution: UpstreamAttribution = DEFAULT_UPSTREAM_ATTRIBUTION,
): Pick<AssetManifestEntry, 'license' | 'source'> {
  return {
    source: {
      kind: 'upstream',
      repositoryUrl: UPSTREAM_REPOSITORY,
      sourceUrl: encodeURI(`${UPSTREAM_REPOSITORY}/blob/${UPSTREAM_COMMIT}/${path}`),
      commit: UPSTREAM_COMMIT,
      path,
      author: attribution.author,
      modified,
    },
    license: attribution.license,
  };
}

function generated(
  modified: string,
): Pick<AssetManifestEntry, 'license' | 'source'> {
  return {
    source: {
      kind: 'generated',
      repositoryUrl: null,
      sourceUrl: null,
      commit: null,
      path: null,
      author: 'leeseomin (OpenAI-assisted for RELAYWAKE)',
      modified,
    },
    license: {
      id: 'MIT',
      evidence: 'LICENSE',
      owner: 'leeseomin',
      verification: 'project-provenance',
    },
  };
}

function projectDerived(
  path: string,
  modified: string,
): Pick<AssetManifestEntry, 'license' | 'source'> {
  return {
    source: {
      kind: 'project-derived',
      repositoryUrl: null,
      sourceUrl: null,
      commit: null,
      path,
      author: 'leeseomin (created for RELAYWAKE)',
      modified,
    },
    license: {
      id: 'MIT',
      evidence: 'LICENSE',
      owner: 'leeseomin',
      verification: 'project-provenance',
    },
  };
}

/**
 * Canonical inventory for every image shipped under public/assets.
 *
 * `consumers` controls runtime loading. In particular, BootScene only sends
 * entries tagged `phaser` to Phaser's TextureManager; browser-only icons and
 * explicitly retained upstream references are not preloaded.
 */
export const assetManifest = [
  {
    key: 'background-dirt',
    path: '/assets/backgrounds/dirt.png',
    format: 'png',
    dimensions: { width: 512, height: 512 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'public/assets/backgrounds/dirt.png',
      '512×512 earth-field texture created and selected by leeseomin for the default RELAYWAKE terrain.',
    ),
  },
  {
    key: 'background-dirt-starlit',
    path: '/assets/backgrounds/dirt2.png',
    format: 'png',
    dimensions: { width: 512, height: 512 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'public/assets/backgrounds/dirt2.png',
      '512×512 starlit-field texture created and selected by leeseomin for the alternate RELAYWAKE terrain.',
    ),
  },
  {
    key: 'background-dirt-red',
    path: '/assets/backgrounds/dirt-red.png',
    format: 'png',
    dimensions: { width: 512, height: 512 },
    consumers: ['phaser', 'menu-css'],
    ...upstream(
      'Assets/Textures/Backgrounds/DirtTileReddish.png',
      'Downscaled from 2048×2048 to 512×512 with a wrap-aware Lanczos filter and PNG metadata stripped.',
    ),
  },
  {
    key: 'background-perlin',
    path: '/assets/backgrounds/perlin.jpeg',
    format: 'jpeg',
    dimensions: { width: 512, height: 512 },
    consumers: ['phaser', 'menu-css'],
    ...upstream('Assets/Textures/Noise/PerlinNoise512.jpeg'),
  },

  {
    key: 'character-roseglass',
    path: '/assets/characters/roseglass.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'pixel-character-maker-mongle.html',
      'Seed 947004; no ears, long hair, glasses, oval eyes, tooth mouth, hue 330, no blush and no tail. Exported at 24px and expanded from the maker A/B walk pair to an A/B/A/B four-frame Phaser sheet, with the upper 14 rows locked to frame A so the eyes and face remain fixed.',
    ),
  },
  {
    key: 'character-startail',
    path: '/assets/characters/startail.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'pixel-character-maker-mongle.html',
      'Seed 271828; cat ears, bob hair, star accessory, bead eyes, cat mouth, hue 285, blush and tail. Exported at 24px and expanded from the maker A/B walk pair to an A/B/A/B four-frame Phaser sheet, with the upper 14 rows locked to frame A so the eyes and face remain fixed.',
    ),
  },
  {
    key: 'character-moonhare',
    path: '/assets/characters/moonhare.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'pixel-character-maker-mongle.html',
      'Seed 314159; bunny ears, long hair, scarf, wide eyes, tooth mouth, hue 210, no blush and no tail. Exported at 24px and expanded from the maker A/B walk pair to an A/B/A/B four-frame Phaser sheet, with the upper 14 rows locked to frame A so the eyes and face remain fixed.',
    ),
  },
  {
    key: 'character-dunehorn',
    path: '/assets/characters/dunehorn.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'pixel-character-maker-mongle.html',
      'Seed 161803; small horns, tuft hair, headband, sleepy eyes, tooth mouth, hue 28, no blush and no tail. Exported at 24px and expanded from the maker A/B walk pair to an A/B/A/B four-frame Phaser sheet, with the upper 14 rows locked to frame A so the eyes and face remain fixed.',
    ),
  },
  {
    key: 'character-fire',
    path: '/assets/characters/fire.png',
    format: 'png',
    dimensions: { width: 192, height: 48 },
    frame: { width: 48, height: 48, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...projectDerived(
      'kite-fire-v2.html',
      'Redrawn as a four-frame transparent sprite sheet from the coral-shirt, wavy-hair development source used for RELAYWAKE.',
    ),
  },

  {
    key: 'enemy-alien',
    path: '/assets/enemies/alien.png',
    format: 'png',
    dimensions: { width: 216, height: 54 },
    frame: { width: 54, height: 54, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/alien.png',
      'Project-created four-frame Crawler sprite sheet retained as final runtime artwork (original seed 104729).',
    ),
  },
  {
    key: 'enemy-crab',
    path: '/assets/enemies/crab.png',
    format: 'png',
    dimensions: { width: 224, height: 56 },
    frame: { width: 56, height: 56, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/crab.png',
      'Project-created four-frame Crab sprite sheet retained as final runtime artwork (original seed 130363).',
    ),
  },
  {
    key: 'enemy-brute',
    path: '/assets/enemies/brute.png',
    format: 'png',
    dimensions: { width: 232, height: 58 },
    frame: { width: 58, height: 58, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/brute.png',
      'Project-created four-frame Brute sprite sheet retained as final runtime artwork (original seed 155921).',
    ),
  },
  {
    key: 'enemy-wizard',
    path: '/assets/enemies/wizard.png',
    format: 'png',
    dimensions: { width: 224, height: 56 },
    frame: { width: 56, height: 56, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/wizard.png',
      'Project-created four-frame Wizard sprite sheet retained as final runtime artwork (original seed 196613).',
    ),
  },
  {
    key: 'enemy-nailhead',
    path: '/assets/enemies/nailhead.png',
    format: 'png',
    dimensions: { width: 224, height: 56 },
    frame: { width: 56, height: 56, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/nailhead.png',
      'Project-created four-frame Nail Head sprite sheet retained as final runtime artwork (original seed 262147).',
    ),
  },
  {
    key: 'enemy-gravity',
    path: '/assets/enemies/gravity.png',
    format: 'png',
    dimensions: { width: 232, height: 58 },
    frame: { width: 58, height: 58, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/gravity.png',
      'Project-created four-frame Gravity Bomber sprite sheet retained as final runtime artwork (original seed 327673).',
    ),
  },
  {
    key: 'enemy-miniboss',
    path: '/assets/enemies/miniboss.png',
    format: 'png',
    dimensions: { width: 216, height: 54 },
    frame: { width: 54, height: 54, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/miniboss.png',
      'Project-created four-frame mini-boss sprite sheet retained as final runtime artwork (original seed 393241).',
    ),
  },
  {
    key: 'enemy-boss',
    path: '/assets/enemies/boss.png',
    format: 'png',
    dimensions: { width: 448, height: 112 },
    frame: { width: 112, height: 112, count: 4 },
    consumers: ['phaser'],
    ...projectDerived(
      'public/assets/enemies/boss.png',
      'Project-created four-frame final-boss sprite sheet retained as final runtime artwork (original seed 524287).',
    ),
  },

  {
    key: 'weapon-machine-gun',
    path: '/assets/weapons/machine-gun.png',
    format: 'png',
    dimensions: { width: 34, height: 16 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/MachineGun.png'),
  },
  {
    key: 'weapon-shuriken',
    path: '/assets/weapons/shuriken.png',
    format: 'png',
    dimensions: { width: 32, height: 32 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Shuriken.png'),
  },
  {
    key: 'weapon-bat',
    path: '/assets/weapons/bat.png',
    format: 'png',
    dimensions: { width: 28, height: 10 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Bat.png'),
  },
  {
    key: 'weapon-dagger',
    path: '/assets/weapons/dagger.png',
    format: 'png',
    dimensions: { width: 20, height: 8 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/LifestealDagger.png'),
  },
  {
    key: 'weapon-sword',
    path: '/assets/weapons/sword.png',
    format: 'png',
    dimensions: { width: 36, height: 8 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Sword.png'),
  },
  {
    key: 'weapon-fire-orb',
    path: '/assets/weapons/fire-orb.png',
    format: 'png',
    dimensions: { width: 24, height: 24 },
    consumers: ['phaser', 'ability-icon'],
    ...projectDerived(
      'kite-fire-v2.html',
      'Rebuilt from the 11×11 PIXEL_ORB_MATRIX in the development source used for RELAYWAKE, preserving its fire palette at a 2× pixel scale.',
    ),
  },
  {
    key: 'weapon-grenade',
    path: '/assets/weapons/grenade.png',
    format: 'png',
    dimensions: { width: 10, height: 13 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/GrenadeBlue.png'),
  },
  {
    key: 'weapon-molotov',
    path: '/assets/weapons/molotov.png',
    format: 'png',
    dimensions: { width: 10, height: 13 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Molotov.png'),
  },
  {
    key: 'weapon-lightsaber',
    path: '/assets/weapons/lightsaber.png',
    format: 'png',
    dimensions: { width: 34, height: 10 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Lightsaber.png'),
  },
  {
    key: 'weapon-machete',
    path: '/assets/weapons/machete.png',
    format: 'png',
    dimensions: { width: 50, height: 15 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Machete.png'),
  },
  {
    key: 'weapon-bazooka',
    path: '/assets/weapons/bazooka.png',
    format: 'png',
    dimensions: { width: 34, height: 13 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Bazooka.png'),
  },
  {
    key: 'weapon-bomb',
    path: '/assets/weapons/bomb.png',
    format: 'png',
    dimensions: { width: 24, height: 27 },
    consumers: ['phaser', 'ability-icon'],
    ...upstream('Assets/Sprites/Weapons/Bomb.png'),
  },
  {
    key: 'enemy-boomerang',
    path: '/assets/weapons/enemy-boomerang.png',
    format: 'png',
    dimensions: { width: 14, height: 12 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Weapons/EnemyBoomerang.png'),
  },
  {
    key: 'enemy-gravity-grenade',
    path: '/assets/weapons/gravity-grenade.png',
    format: 'png',
    dimensions: { width: 10, height: 13 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Weapons/GravityGrenade.png'),
  },

  {
    key: 'pickup-gems',
    path: '/assets/pickups/gems.png',
    format: 'png',
    dimensions: { width: 56, height: 12 },
    frame: { width: 7, height: 12, count: 8 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Gems/Gems.png'),
  },
  {
    key: 'pickup-gem-dark',
    path: '/assets/pickups/gem-dark-blue.png',
    format: 'png',
    dimensions: { width: 14, height: 12 },
    consumers: [],
    retainedFor: 'upstream-reference',
    ...upstream('Assets/Sprites/Gems/GemDarkBlue.png'),
  },
  {
    key: 'pickup-gem-light',
    path: '/assets/pickups/gem-light-blue.png',
    format: 'png',
    dimensions: { width: 14, height: 12 },
    consumers: [],
    retainedFor: 'upstream-reference',
    ...upstream('Assets/Sprites/Gems/GemLightBlue.png'),
  },
  {
    key: 'pickup-coin',
    path: '/assets/pickups/coin.png',
    format: 'png',
    dimensions: { width: 16, height: 16 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Coins/Coin1.png', null, BONSAI_COIN_ATTRIBUTION),
  },
  {
    key: 'pickup-coin-10',
    path: '/assets/pickups/coin-10.png',
    format: 'png',
    dimensions: { width: 16, height: 16 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Coins/Coin10.png', null, BONSAI_COIN_ATTRIBUTION),
  },
  {
    key: 'pickup-magnet',
    path: '/assets/pickups/magnet.png',
    format: 'png',
    dimensions: { width: 23, height: 23 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Kenney/Magnet.png', null, KENNEY_ATTRIBUTION),
  },
  {
    key: 'pickup-potion',
    path: '/assets/pickups/potion.png',
    format: 'png',
    dimensions: { width: 64, height: 64 },
    consumers: ['phaser', 'ability-icon'],
    displayScale: 0.4,
    ...generated(
      'Generated for Relaywake with OpenAI built-in image generation on 2026-07-30, then locally chroma-keyed and downscaled to 64×64.',
    ),
  },

  {
    key: 'ui-circle',
    path: '/assets/ui/circle.png',
    format: 'png',
    dimensions: { width: 500, height: 500 },
    consumers: ['ability-icon'],
    ...upstream('Assets/Sprites/UI/Circle500.png'),
  },
  {
    key: 'ui-circle-outline',
    path: '/assets/ui/circle-outline.png',
    format: 'png',
    dimensions: { width: 500, height: 500 },
    consumers: [],
    retainedFor: 'upstream-reference',
    ...upstream('Assets/Sprites/UI/CircleOutline.png'),
  },
  {
    key: 'ui-square',
    path: '/assets/ui/square.png',
    format: 'png',
    dimensions: { width: 100, height: 100 },
    consumers: ['ability-icon'],
    ...upstream('Assets/Sprites/UI/Square100.png'),
  },
  {
    key: 'ui-pause',
    path: '/assets/ui/pause.png',
    format: 'png',
    dimensions: { width: 512, height: 512 },
    consumers: [],
    retainedFor: 'upstream-reference',
    ...upstream('Assets/Sprites/UI/PauseButton.png'),
  },
  {
    key: 'ui-play',
    path: '/assets/ui/play.png',
    format: 'png',
    dimensions: { width: 128, height: 128 },
    consumers: ['ability-icon'],
    ...generated(
      'Generated for Relaywake with OpenAI built-in image generation on 2026-07-30, then locally chroma-keyed and downscaled to 128×128.',
    ),
  },
] as const satisfies readonly AssetManifestEntry[];

export type AssetKey = (typeof assetManifest)[number]['key'];
export type ManifestAsset = (typeof assetManifest)[number];

const assetsByKey = new Map<AssetKey, ManifestAsset>(
  assetManifest.map((asset) => [asset.key, asset]),
);

export function getAsset(key: AssetKey): ManifestAsset {
  const asset = assetsByKey.get(key);
  if (!asset) throw new Error(`Unknown asset key: ${key}`);
  return asset;
}

export function assetPath(key: AssetKey): `/assets/${string}` {
  return getAsset(key).path;
}

export function assetDisplayScale(key: AssetKey): number {
  const asset = getAsset(key);
  return 'displayScale' in asset ? asset.displayScale : 1;
}

function hasConsumer(asset: ManifestAsset, consumer: AssetConsumer): boolean {
  return (asset.consumers as readonly AssetConsumer[]).includes(consumer);
}

export const phaserAssets: readonly ManifestAsset[] = assetManifest.filter((asset) =>
  hasConsumer(asset, 'phaser'),
);

export const iconUrlByKey: Readonly<Record<string, string>> = Object.fromEntries(
  assetManifest
    .filter((asset) => hasConsumer(asset, 'ability-icon'))
    .map((asset) => [asset.key, asset.path]),
);

export function iconUrl(key: string): string {
  return iconUrlByKey[key] ?? assetPath('ui-square');
}
