import type { AbilityId } from './data/schemas';

export interface ActiveGameScene {
  chooseAbility: (id: AbilityId) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setTouchVector: (x: number, y: number) => void;
}

let activeScene: ActiveGameScene | null = null;

export function attachActiveScene(scene: ActiveGameScene): void {
  activeScene = scene;
}

export function detachActiveScene(scene: ActiveGameScene): void {
  if (activeScene === scene) activeScene = null;
}

export function getActiveScene(): ActiveGameScene | null {
  return activeScene;
}
