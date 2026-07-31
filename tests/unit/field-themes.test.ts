import { describe, expect, it } from 'vitest';
import {
  defaultFieldThemeId,
  fieldBackgroundLayers,
  fieldThemes,
  getFieldTheme,
} from '../../src/game/data/fieldThemes';

describe('field themes', () => {
  it('defaults to the original earth-toned field', () => {
    expect(defaultFieldThemeId).toBe('classic');
    expect(getFieldTheme(defaultFieldThemeId).assetKey).toBe('background-dirt');
  });

  it('offers the original and starlit fields as distinct single-texture choices', () => {
    expect(fieldThemes.map((theme) => theme.id)).toEqual(['classic', 'starlit']);
    expect(fieldThemes.map((theme) => theme.assetKey)).toEqual([
      'background-dirt',
      'background-dirt-starlit',
    ]);
    expect(fieldBackgroundLayers).toEqual({
      tintAssetKey: 'background-dirt-red',
      noiseAssetKey: 'background-perlin',
    });
  });
});
