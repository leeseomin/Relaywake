import type { CharacterDefinition } from '../data/schemas';
import type { AbilityId, WeaponStats } from '../data/schemas';

const fireAbilities = new Set<AbilityId>(['fireOrb', 'molotov']);

export function applyCharacterAbilityModifiers(
  character: CharacterDefinition,
  abilityId: AbilityId,
  stats: WeaponStats,
): WeaponStats {
  if (!fireAbilities.has(abilityId)) return stats;

  return {
    ...stats,
    damage: stats.damage * character.fireDamageMultiplier,
    cooldown: stats.cooldown * character.fireCooldownMultiplier,
    duration: stats.duration * character.fireDurationMultiplier,
  };
}
