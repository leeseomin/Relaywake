import { describe, expect, it } from 'vitest';
import {
  resolveDamage,
  resolveGravityPulseImpulse,
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

  it('resolves gravity pulses in opposite directions with boss resistance', () => {
    const pushed = resolveGravityPulseImpulse(0, 0, 50, 0, 100, 3, 'push', false);
    const pulled = resolveGravityPulseImpulse(0, 0, 50, 0, 100, 3, 'pull', false);
    const bossPush = resolveGravityPulseImpulse(0, 0, 50, 0, 100, 3, 'push', true);

    expect(pushed.x).toBeGreaterThan(0);
    expect(pulled.x).toBeCloseTo(-pushed.x);
    expect(pushed.y).toBe(0);
    expect(bossPush.x).toBeCloseTo(pushed.x * 0.28);
  });

  it('does not apply a gravity impulse outside the pulse radius', () => {
    expect(resolveGravityPulseImpulse(0, 0, 101, 0, 100, 3, 'push', false)).toEqual({ x: 0, y: 0 });
  });
});
