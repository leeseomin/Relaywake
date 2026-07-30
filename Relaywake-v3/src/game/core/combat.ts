export type SideSlashWeapon = 'machete' | 'sword';
export type SlashSide = -1 | 1;

export interface DamageResolution {
  appliedDamage: number;
  remainingHp: number;
}

export interface SideSlashPattern {
  angles: readonly number[];
  angularVelocity: number;
  nextSide: SlashSide;
}

export const FINAL_BOSS_COIN_REWARD = 10;

export function resolveDamage(currentHp: number, requestedDamage: number): DamageResolution {
  const safeHp = Math.max(0, currentHp);
  const appliedDamage = Math.min(safeHp, Math.max(0, requestedDamage));
  return {
    appliedDamage,
    remainingHp: safeHp - appliedDamage,
  };
}

export function resolveSideSlashPattern(
  weapon: SideSlashWeapon,
  facingAngle: number,
  currentSide: SlashSide,
): SideSlashPattern {
  if (weapon === 'sword') {
    return {
      angles: [facingAngle, facingAngle + Math.PI],
      angularVelocity: 0,
      nextSide: currentSide,
    };
  }

  const sideOffset = currentSide > 0 ? 0 : Math.PI;
  return {
    angles: [facingAngle + sideOffset],
    angularVelocity: currentSide * -1.8,
    nextSide: currentSide > 0 ? -1 : 1,
  };
}
