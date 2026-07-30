import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/game/core/rng';
import { AbilityDirector } from '../../src/game/systems/AbilityDirector';

describe('AbilityDirector', () => {
  it('caps ability levels and applies passive global modifiers', () => {
    const director = new AbilityDirector(new SeededRandom(42));
    for (let index = 0; index < 8; index += 1) director.grant('damage');
    expect(director.get('damage')?.level).toBe(5);
    expect(director.globalModifiers().damage).toBeCloseTo(1.55);
  });

  it('applies active upgrades and global projectile bonuses', () => {
    const director = new AbilityDirector(new SeededRandom(7));
    director.grant('shuriken');
    director.grant('shuriken');
    director.grant('projectileCount');
    const stats = director.effectiveStats('shuriken');
    expect(stats.damage).toBe(6);
    expect(stats.count).toBe(3);
  });

  it('returns deterministic unique choices for a seed', () => {
    const first = new AbilityDirector(new SeededRandom(99)).buildChoices(3).map((ability) => ability.id);
    const second = new AbilityDirector(new SeededRandom(99)).buildChoices(3).map((ability) => ability.id);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(3);
  });
});
