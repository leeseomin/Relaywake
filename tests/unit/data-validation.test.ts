import { describe, expect, it } from 'vitest';
import { abilities } from '../../src/game/data/abilities';
import { characters } from '../../src/game/data/characters';
import { enemies } from '../../src/game/data/enemies';
import { levelOne } from '../../src/game/data/level';

describe('Zod-validated game data', () => {
  it('loads the complete catalog without duplicate ids', () => {
    expect(abilities.length).toBeGreaterThanOrEqual(19);
    expect(new Set(abilities.map((ability) => ability.id)).size).toBe(abilities.length);
    expect(characters).toHaveLength(4);
    expect(enemies).toHaveLength(8);
    expect(levelOne.durationSeconds).toBe(600);
  });
});
