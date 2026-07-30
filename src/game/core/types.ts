import type { AbilityId } from '../data/schemas';
import type { CharacterId } from '../data/characters';
import type { Locale } from '../data/localization';

export interface AbilityChoiceView {
  id: AbilityId;
  level: number;
  nextLevel: number;
  maxLevel: number;
  name: string;
  description: string;
  iconKey: string;
  iconUrl: string;
  category: 'active' | 'passive';
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  xp: number;
  xpRequired: number;
  level: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  kills: number;
  coins: number;
  bossHp: number | null;
  bossMaxHp: number | null;
  abilities: ReadonlyArray<{ id: AbilityId; level: number; iconUrl: string }>;
}

export interface RunSummary {
  id: string;
  characterId: CharacterId;
  victory: boolean;
  elapsedSeconds: number;
  kills: number;
  level: number;
  coins: number;
  damageDealt: number;
  endedAt: string;
}

export interface GameRuntimePreferences {
  locale: Locale;
  soundEnabled: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
}

export interface StartRunOptions {
  characterId: CharacterId;
  preferences: GameRuntimePreferences;
  seed?: number;
  e2e?: boolean;
}

export interface GameTestSnapshot {
  ready: boolean;
  paused: boolean;
  hp: number;
  maxHp: number;
  level: number;
  enemies: number;
  projectiles: number;
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
