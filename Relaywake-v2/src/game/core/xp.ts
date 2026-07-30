export function xpIncreaseForLevel(level: number): number {
  if (level < 10) return 10;
  if (level < 20) return 13;
  if (level < 30) return 16;
  return 20;
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 5;
  let required = 5;
  for (let current = 2; current <= level; current += 1) {
    required += xpIncreaseForLevel(current);
  }
  return required;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  requiredXp: number;
  levelsGained: number;
}

export function applyExperience(level: number, currentXp: number, gain: number): LevelProgress {
  let nextLevel = level;
  let remaining = Math.max(0, currentXp + gain);
  let required = xpRequiredForLevel(nextLevel);
  let levelsGained = 0;
  while (remaining >= required) {
    remaining -= required;
    nextLevel += 1;
    levelsGained += 1;
    required = xpRequiredForLevel(nextLevel);
  }
  return { level: nextLevel, currentXp: remaining, requiredXp: required, levelsGained };
}
