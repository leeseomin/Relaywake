import type { CharacterId } from '../data/characters';
import type { FieldThemeId } from '../data/fieldThemes';

export interface GameTestSnapshot {
  ready: boolean;
  paused: boolean;
  characterId: CharacterId;
  fieldThemeId: FieldThemeId;
  hp: number;
  maxHp: number;
  level: number;
  enemies: number;
  projectiles: number;
  orbiters: number;
  elapsedSeconds: number;
  touchX: number;
  touchY: number;
  presentationPaused: boolean;
  audioPaused: boolean;
  screen: string;
}

export interface C2TestBridge {
  readonly ready: boolean;
  snapshot: () => GameTestSnapshot;
  grantXp: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  spawnEnemy: () => void;
  testKillFinalBoss: () => void;
  finishRun: (victory: boolean) => void;
}
