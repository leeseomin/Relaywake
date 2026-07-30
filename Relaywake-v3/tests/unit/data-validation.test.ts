import { describe, expect, it } from 'vitest';
import { abilities } from '../../src/game/data/abilities';
import { characters } from '../../src/game/data/characters';
import { enemies } from '../../src/game/data/enemies';
import { levelOne } from '../../src/game/data/level';

describe('Zod-validated game data', () => {
  it('loads the complete catalog without duplicate ids', () => {
    expect(abilities.length).toBeGreaterThanOrEqual(20);
    expect(new Set(abilities.map((ability) => ability.id)).size).toBe(abilities.length);
    expect(characters).toHaveLength(5);
    expect(enemies).toHaveLength(8);
    expect(levelOne.durationSeconds).toBe(600);
  });

  it('registers the four Mongle replacements while retaining stable save-compatible ids', () => {
    expect(characters.slice(0, 4).map(({ id, spriteKey, name }) => ({
      id,
      spriteKey,
      en: name.en,
    }))).toEqual([
      { id: 'blue', spriteKey: 'character-sprout', en: 'Sprout Runner' },
      { id: 'purple', spriteKey: 'character-startail', en: 'Star-Tail Thief' },
      { id: 'white', spriteKey: 'character-moonhare', en: 'Moonhare Warden' },
      { id: 'gray', spriteKey: 'character-dunehorn', en: 'Dunehorn Bruiser' },
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
});
