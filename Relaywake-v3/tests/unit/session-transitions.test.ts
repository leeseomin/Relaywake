import { describe, expect, it } from 'vitest';
import { resolvePauseScreen } from '../../src/stores/sessionTransitions';

describe('pause-screen transitions', () => {
  it('never replaces level-up with the manual pause overlay', () => {
    expect(resolvePauseScreen('levelUp', true, false)).toBe('levelUp');
  });

  it('moves between live play and manual pause only', () => {
    expect(resolvePauseScreen('playing', true, false)).toBe('paused');
    expect(resolvePauseScreen('paused', false, false)).toBe('playing');
  });

  it('returns to play after level-up selection and preserves completed runs', () => {
    expect(resolvePauseScreen('levelUp', false, false)).toBe('playing');
    expect(resolvePauseScreen('gameOver', false, true)).toBe('gameOver');
  });
});
