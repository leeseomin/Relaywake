import { describe, expect, it } from 'vitest';
import {
  resolveDamage,
  resolveSideSlashPattern,
} from '../../src/game/core/combat';

describe('combat rules', () => {
  it('counts only damage that the target can actually receive', () => {
    expect(resolveDamage(8, 30)).toEqual({
      appliedDamage: 8,
      remainingHp: 0,
    });
    expect(resolveDamage(20, 6)).toEqual({
      appliedDamage: 6,
      remainingHp: 14,
    });
  });

  it('rotates twin-sword attacks with the player facing direction', () => {
    const pattern = resolveSideSlashPattern('sword', Math.PI / 2, 1);
    expect(pattern.angles[0]).toBeCloseTo(Math.PI / 2);
    expect(pattern.angles[1]).toBeCloseTo(Math.PI * 1.5);
  });

  it('alternates machete slashes around the current facing axis', () => {
    const first = resolveSideSlashPattern('machete', Math.PI / 2, 1);
    const second = resolveSideSlashPattern('machete', Math.PI / 2, first.nextSide);

    expect(first.angles[0]).toBeCloseTo(Math.PI / 2);
    expect(second.angles[0]).toBeCloseTo(Math.PI * 1.5);
    expect(second.nextSide).toBe(1);
  });
});
