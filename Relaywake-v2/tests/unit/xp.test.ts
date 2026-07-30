import { describe, expect, it } from 'vitest';
import { applyExperience, xpIncreaseForLevel, xpRequiredForLevel } from '../../src/game/core/xp';

describe('experience curve', () => {
  it('ports the Unity level-band increments', () => {
    expect(xpIncreaseForLevel(9)).toBe(10);
    expect(xpIncreaseForLevel(10)).toBe(13);
    expect(xpIncreaseForLevel(20)).toBe(16);
    expect(xpIncreaseForLevel(30)).toBe(20);
  });

  it('handles multiple level-ups without losing remainder experience', () => {
    const result = applyExperience(1, 0, xpRequiredForLevel(1) + xpRequiredForLevel(2) + 3);
    expect(result.level).toBe(3);
    expect(result.currentXp).toBe(3);
    expect(result.levelsGained).toBe(2);
  });
});
