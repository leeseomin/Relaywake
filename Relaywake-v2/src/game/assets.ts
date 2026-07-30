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
      author: 'Relaywake (OpenAI-assisted)',
      modified,
    },
    license: {
      id: 'MIT',
      evidence: 'LICENSE',
      owner: 'Relaywake contributors',
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
      author: 'Relaywake contributors (derived from user-provided source)',
      modified,
    },
    license: {
      id: 'MIT',
      evidence: 'LICENSE',
      owner: 'Relaywake contributors',
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
    consumers: ['phaser'],
    ...upstream('Assets/Textures/Backgrounds/DirtTile.png'),
  },
  {
    key: 'background-dirt-red',
    path: '/assets/backgrounds/dirt-red.png',
    format: 'png',
    dimensions: { width: 512, height: 512 },
    consumers: ['phaser'],
    ...upstream(
      'Assets/Textures/Backgrounds/DirtTileReddish.png',
      'Downscaled from 2048×2048 to 512×512 with a wrap-aware Lanczos filter and PNG metadata stripped.',
    ),
  },
  {
    key: 'menu-noise',
    path: '/assets/backgrounds/perlin.jpeg',
    format: 'jpeg',
    dimensions: { width: 512, height: 512 },
    consumers: ['menu-css'],
    ...upstream('Assets/Textures/Noise/PerlinNoise512.jpeg'),
  },

  {
    key: 'character-blue',
    path: '/assets/characters/blue.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...upstream('Assets/Sprites/Characters/MainCharacterBlue.png'),
  },
  {
    key: 'character-purple',
    path: '/assets/characters/purple.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...upstream('Assets/Sprites/Characters/MainCharacterPurple.png'),
  },
  {
    key: 'character-white',
    path: '/assets/characters/white.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...upstream('Assets/Sprites/Characters/MainCharacterWhite.png'),
  },
  {
    key: 'character-gray',
    path: '/assets/characters/gray.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser', 'menu-css'],
    ...upstream('Assets/Sprites/Characters/MainCharacterGray.png'),
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
      'Redrawn as a four-frame transparent sprite sheet from the bundled coral-shirt, wavy-hair canvas character.',
    ),
  },

  {
    key: 'enemy-alien',
    path: '/assets/enemies/alien.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/Alien.png'),
  },
  {
    key: 'enemy-crab',
    path: '/assets/enemies/crab.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/CrabOrange.png'),
  },
  {
    key: 'enemy-brute',
    path: '/assets/enemies/brute.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/PunchMonster.png'),
  },
  {
    key: 'enemy-wizard',
    path: '/assets/enemies/wizard.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/WizardMonster.png'),
  },
  {
    key: 'enemy-nailhead',
    path: '/assets/enemies/nailhead.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/NailHead.png'),
  },
  {
    key: 'enemy-gravity',
    path: '/assets/enemies/gravity.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/ExplosiveGuy.png'),
  },
  {
    key: 'enemy-miniboss',
    path: '/assets/enemies/miniboss.png',
    format: 'png',
    dimensions: { width: 96, height: 24 },
    frame: { width: 24, height: 24, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/MiniBoss.png'),
  },
  {
    key: 'enemy-boss',
    path: '/assets/enemies/boss.png',
    format: 'png',
    dimensions: { width: 192, height: 48 },
    frame: { width: 48, height: 48, count: 4 },
    consumers: ['phaser'],
    ...upstream('Assets/Sprites/Monsters/Boss.png'),
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
      'Rebuilt from the bundled 11×11 PIXEL_ORB_MATRIX and its original fire palette at a 2× pixel scale.',
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
