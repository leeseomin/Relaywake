import { describe, expect, it } from 'vitest';
import { animationFrameRate } from '../../src/game/animationConfig';

describe('animation frame rates', () => {
  it('keeps the four Mongle characters restrained without slowing Fire Master or enemies', () => {
    expect(animationFrameRate('character-roseglass')).toBe(2);
    expect(animationFrameRate('character-startail')).toBe(2);
    expect(animationFrameRate('character-moonhare')).toBe(2);
    expect(animationFrameRate('character-dunehorn')).toBe(2);
    expect(animationFrameRate('character-fire')).toBe(7);
    expect(animationFrameRate('enemy-alien')).toBe(7);
    expect(animationFrameRate('enemy-miniboss')).toBe(5);
  });
});
