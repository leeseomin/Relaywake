import type { AppScreen } from '../app/screens';

export function resolvePauseScreen(current: AppScreen, paused: boolean, hasSummary: boolean): AppScreen {
  if (hasSummary) return current;

  if (paused) {
    // Only live play may enter the manual pause overlay. Level-up owns a
    // separate overlay even though the Phaser simulation is internally held.
    return current === 'playing' ? 'paused' : current;
  }

  return current === 'paused' || current === 'levelUp' ? 'playing' : current;
}
