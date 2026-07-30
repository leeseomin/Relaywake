import { describe, expect, it } from 'vitest';
import { sampleScalar, sampleVector } from '../../src/game/core/curves';

describe('keyframe interpolation', () => {
  it('interpolates scalar keyframes and clamps the time range', () => {
    const frames = [{ t: 0, value: 2 }, { t: 0.5, value: 6 }, { t: 1, value: 10 }];
    expect(sampleScalar(frames, -1)).toBe(2);
    expect(sampleScalar(frames, 0.25)).toBe(4);
    expect(sampleScalar(frames, 0.75)).toBe(8);
    expect(sampleScalar(frames, 2)).toBe(10);
  });

  it('interpolates vector keyframes with missing values treated as zero', () => {
    const frames = [{ t: 0, values: [1, 0] }, { t: 1, values: [0, 1, 2] }];
    expect(sampleVector(frames, 0.5)).toEqual([0.5, 0.5, 1]);
  });
});
