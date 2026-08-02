import type { AbilityId } from '../data/schemas';
import type { CharacterId } from '../data/characters';
import type { FieldThemeId } from '../data/fieldThemes';
import type { Locale } from '../data/localization';
import type { GravityPulseMode } from './combat';

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
  bossId: 'miniBoss' | 'finalBoss' | null;
  bossHp: number | null;
  bossMaxHp: number | null;
  bossOffscreen: boolean;
  bossDirectionRadians: number | null;
  abilities: ReadonlyArray<{
    id: AbilityId;
    level: number;
    iconUrl: string;
    nextGravityPulseMode?: GravityPulseMode;
  }>;
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
  fieldThemeId: FieldThemeId;
  preferences: GameRuntimePreferences;
  seed?: number;
  e2e?: boolean;
}
