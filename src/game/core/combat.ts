export type SideSlashWeapon = 'machete' | 'sword';
export type SlashSide = -1 | 1;
export type GravityPulseMode = 'push' | 'pull';

export interface DamageResolution {
  appliedDamage: number;
  remainingHp: number;
}

export interface SideSlashPattern {
  angles: readonly number[];
  angularVelocity: number;
  nextSide: SlashSide;
}

export interface GravityPulseImpulse {
  x: number;
  y: number;
}

export const FINAL_BOSS_COIN_REWARD = 10;
export const GRAVITY_PULSE_DAMAGE_NUMBER_LIMIT = 24;

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

export function resolveGravityPulseImpulse(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  radius: number,
  strength: number,
  mode: GravityPulseMode,
  isBoss: boolean,
): GravityPulseImpulse {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0 || distance > radius || radius <= 0 || strength <= 0) {
    return { x: 0, y: 0 };
  }

  const falloff = 0.35 + (1 - distance / radius) * 0.65;
  const bossResistance = isBoss ? 0.28 : 1;
  const polarity = mode === 'push' ? 1 : -1;
  const magnitude = strength * 58 * falloff * bossResistance * polarity;
  return {
    x: (dx / distance) * magnitude,
    y: (dy / distance) * magnitude,
  };
}

export function selectGravityPulseDamageNumberTargets(
  targets: ReadonlyArray<{ id: number; x: number; y: number }>,
  sourceX: number,
  sourceY: number,
  limit = GRAVITY_PULSE_DAMAGE_NUMBER_LIMIT,
): Set<number> {
  const safeLimit = Math.max(0, Math.floor(limit));
  return new Set(
    [...targets]
      .sort((left, right) => {
        const leftDx = left.x - sourceX;
        const leftDy = left.y - sourceY;
        const rightDx = right.x - sourceX;
        const rightDy = right.y - sourceY;
        return leftDx * leftDx + leftDy * leftDy - (rightDx * rightDx + rightDy * rightDy);
      })
      .slice(0, safeLimit)
      .map((target) => target.id),
  );
}
