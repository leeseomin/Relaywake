import type { AbilityId } from './data/schemas';
import type { GameTestSnapshot } from './core/types';

export interface ActiveGameScene {
  chooseAbility: (id: AbilityId) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  setTouchVector: (x: number, y: number) => void;
  testSnapshot: () => GameTestSnapshot;
  testGrantXp: (amount: number) => void;
  testDamagePlayer: (amount: number) => void;
  testSpawnEnemy: () => void;
  testKillFinalBoss: () => void;
  testFinish: (victory: boolean) => void;
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
