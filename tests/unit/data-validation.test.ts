import { describe, expect, it } from 'vitest';
import { abilities } from '../../src/game/data/abilities';
import { characters } from '../../src/game/data/characters';
import { enemies } from '../../src/game/data/enemies';
import { fieldThemes } from '../../src/game/data/fieldThemes';
import { levelOne } from '../../src/game/data/level';
import { locales, messages } from '../../src/game/data/localization';

describe('Zod-validated game data', () => {
  it('loads the complete catalog without duplicate ids', () => {
    expect(abilities.length).toBeGreaterThanOrEqual(20);
    expect(new Set(abilities.map((ability) => ability.id)).size).toBe(abilities.length);
    expect(characters).toHaveLength(5);
    expect(enemies).toHaveLength(8);
    expect(levelOne.durationSeconds).toBe(600);
  });

  it('provides complete text for every supported locale', () => {
    for (const locale of locales) {
      expect(Object.keys(messages[locale])).toEqual(Object.keys(messages.en));
      for (const value of Object.values(messages[locale])) {
        expect(value.trim()).not.toBe('');
      }
      for (const ability of abilities) {
        expect(ability.name[locale].trim()).not.toBe('');
        expect(ability.description[locale].trim()).not.toBe('');
      }
      for (const character of characters) {
        expect(character.name[locale].trim()).not.toBe('');
        expect(character.description[locale].trim()).not.toBe('');
      }
      for (const theme of fieldThemes) {
        expect(theme.name[locale].trim()).not.toBe('');
        expect(theme.description[locale].trim()).not.toBe('');
      }
    }
  });

  it('registers the four Mongle replacements while retaining stable save-compatible ids', () => {
    expect(characters.slice(0, 4).map(({ id, spriteKey, name }) => ({
      id,
      spriteKey,
      en: name.en,
    }))).toEqual([
      { id: 'blue', spriteKey: 'character-roseglass', en: 'Roseglass Scout' },
      { id: 'purple', spriteKey: 'character-startail', en: 'Star-Tail Thief' },
      { id: 'white', spriteKey: 'character-moonhare', en: 'Moonhare Warden' },
      { id: 'gray', spriteKey: 'character-dunehorn', en: 'Dunehorn Bruiser' },
    ]);
  });

  it('renders the four Mongle characters at an integer scale so texel grids stay stable in motion', () => {
    for (const character of characters.slice(0, 4)) {
      expect(character.displayScale).toBe(3);
      expect(Number.isInteger(character.displayScale)).toBe(true);
    }
  });

  it('keeps enemy gameplay geometry while rendering baked monster sheets at scale 1', () => {
    expect(enemies.map(({ id, radius, speed, attackRange, displayScale }) => ({
      id,
      radius,
      speed,
      attackRange,
      displayScale,
    }))).toEqual([
      { id: 'crawler', radius: 17, speed: 54, attackRange: 27, displayScale: 1 },
      { id: 'crab', radius: 19, speed: 49, attackRange: 30, displayScale: 1 },
      { id: 'brute', radius: 22, speed: 45, attackRange: 34, displayScale: 1 },
      { id: 'wizard', radius: 19, speed: 61, attackRange: 230, displayScale: 1 },
      { id: 'nailhead', radius: 20, speed: 50, attackRange: 275, displayScale: 1 },
      { id: 'gravity', radius: 21, speed: 39, attackRange: 310, displayScale: 1 },
      { id: 'miniBoss', radius: 36, speed: 64, attackRange: 48, displayScale: 1 },
      { id: 'finalBoss', radius: 44, speed: 70, attackRange: 330, displayScale: 1 },
    ]);
  });

  it('registers Fire Master with its dedicated fire-orbit loadout', () => {
    const fireMaster = characters.find((character) => character.id === 'fire');
    const fireOrb = abilities.find((ability) => ability.id === 'fireOrb');

    expect(fireMaster).toMatchObject({
      spriteKey: 'character-fire',
      startingAbility: 'fireOrb',
      fireDamageMultiplier: 1.25,
      fireCooldownMultiplier: 0.85,
      fireDurationMultiplier: 1.2,
    });
    expect(fireOrb).toMatchObject({
      behavior: 'orbit',
      iconKey: 'weapon-fire-orb',
      category: 'active',
    });
  });

  it('registers Gravity Pulse as an alternating battlefield-control weapon', () => {
    expect(abilities.find((ability) => ability.id === 'gravityPulse')).toMatchObject({
      behavior: 'gravityPulse',
      iconKey: 'weapon-gravity-pulse',
      category: 'active',
      maxLevel: 5,
      stats: {
        radius: 168,
        knockback: 3.2,
      },
    });
  });
});
