import { describe, expect, it, vi } from 'vitest';
import { syncPresentationPause } from '../../src/game/systems/PresentationPause';

describe('presentation pause', () => {
  it('pauses and resumes every registered presentation clock', () => {
    const targets = [
      { pause: vi.fn(), resume: vi.fn() },
      { pause: vi.fn(), resume: vi.fn() },
      { pause: vi.fn(), resume: vi.fn() },
    ];

    syncPresentationPause(true, targets);
    syncPresentationPause(false, targets);

    for (const target of targets) {
      expect(target.pause).toHaveBeenCalledTimes(1);
      expect(target.resume).toHaveBeenCalledTimes(1);
    }
  });
});
