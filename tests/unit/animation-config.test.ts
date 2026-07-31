import { describe, expect, it } from 'vitest';
import { animationEndFrame, animationFrameRate } from '../../src/game/animationConfig';

describe('animation frame rates', () => {
  it('keeps the restrained characters slow without slowing Fire Master or enemies', () => {
    expect(animationFrameRate('character-startail')).toBe(1);
    expect(animationFrameRate('character-roseglass')).toBe(2);
    expect(animationFrameRate('character-moonhare')).toBe(2);
    expect(animationFrameRate('character-dunehorn')).toBe(2);
    expect(animationFrameRate('character-fire')).toBe(7);
    expect(animationFrameRate('enemy-alien')).toBe(7);
    expect(animationFrameRate('enemy-miniboss')).toBe(5);
  });
});

describe('animation frame spans', () => {
  it('pins Star-Tail to a single frame so it never wobbles', () => {
    expect(animationEndFrame('character-startail')).toBe(0);
  });

  it('keeps every other texture on the full four-frame cycle', () => {
    expect(animationEndFrame('character-roseglass')).toBe(3);
    expect(animationEndFrame('character-fire')).toBe(3);
    expect(animationEndFrame('enemy-boss')).toBe(3);
  });
});
