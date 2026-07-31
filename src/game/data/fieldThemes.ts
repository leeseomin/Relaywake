import type { AssetKey } from '../assets';
import type { Locale } from './localization';

export interface FieldTheme {
  readonly id: 'classic' | 'starlit';
  readonly assetKey: AssetKey;
  readonly name: Record<Locale, string>;
  readonly description: Record<Locale, string>;
}

export const fieldBackgroundLayers = {
  tintAssetKey: 'background-dirt-red',
  noiseAssetKey: 'background-perlin',
} as const satisfies Record<string, AssetKey>;

export const fieldThemes = [
  {
    id: 'classic',
    assetKey: 'background-dirt',
    name: {
      ko: '기본 황무지',
      en: 'Classic Wastes',
    },
    description: {
      ko: '차분한 황토 지형',
      en: 'Muted earthen terrain',
    },
  },
  {
    id: 'starlit',
    assetKey: 'background-dirt-starlit',
    name: {
      ko: '별빛 황무지',
      en: 'Starlit Wastes',
    },
    description: {
      ko: '청록과 보라빛이 스민 지형',
      en: 'Terrain veined with teal and violet',
    },
  },
] as const satisfies readonly FieldTheme[];

export type FieldThemeId = (typeof fieldThemes)[number]['id'];

export const defaultFieldThemeId: FieldThemeId = 'classic';

export function getFieldTheme(id: FieldThemeId): (typeof fieldThemes)[number] {
  return fieldThemes.find((theme) => theme.id === id) ?? fieldThemes[0];
}
