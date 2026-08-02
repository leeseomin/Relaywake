import { z } from 'zod';
import { locales } from './localization';

export const LocalizedTextSchema = z.record(
  z.enum(locales),
  z.string().min(1),
);

export const AbilityIdSchema = z.enum([
  'machineGun',
  'shuriken',
  'bat',
  'dagger',
  'axe',
  'fireOrb',
  'grenade',
  'molotov',
  'lightsaber',
  'machete',
  'bazooka',
  'gravityPulse',
  'sword',
  'recovery',
  'lifesteal',
  'aoe',
  'armor',
  'cooldown',
  'damage',
  'moveSpeed',
  'knockback',
  'projectileCount',
  'projectileSpeed',
]);

export const CharacterIdSchema = z.enum(['blue', 'purple', 'white', 'gray', 'fire']);

export const AbilityBehaviorSchema = z.enum([
  'projectile',
  'spreadProjectile',
  'meleeFan',
  'orbit',
  'grenade',
  'molotov',
  'beam',
  'sideSlash',
  'gravityPulse',
  'recovery',
  'lifesteal',
  'stat',
]);

export const StatKeySchema = z.enum([
  'damage',
  'cooldown',
  'projectileSpeed',
  'count',
  'radius',
  'duration',
  'knockback',
  'pierce',
  'recovery',
  'lifestealChance',
  'armor',
  'moveSpeed',
]);

export const WeaponStatsSchema = z.object({
  damage: z.number().nonnegative(),
  cooldown: z.number().nonnegative(),
  projectileSpeed: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  radius: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  knockback: z.number().nonnegative(),
  pierce: z.number().int().nonnegative(),
  recovery: z.number().nonnegative(),
  lifestealChance: z.number().min(0).max(1),
  armor: z.number().nonnegative(),
  moveSpeed: z.number().nonnegative(),
});

export const AbilityBonusSchema = z.object({
  stat: StatKeySchema,
  values: z.array(z.number()),
});

export const AbilityDefinitionSchema = z.object({
  id: AbilityIdSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  iconKey: z.string().min(1),
  category: z.enum(['active', 'passive']),
  behavior: AbilityBehaviorSchema,
  maxLevel: z.number().int().min(1).max(10),
  stats: WeaponStatsSchema,
  bonuses: z.array(AbilityBonusSchema),
});

export const CharacterDefinitionSchema = z.object({
  id: CharacterIdSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  spriteKey: z.string().min(1),
  // Integer scale keeps every 24px texel exactly three screen pixels wide. A fractional scale
  // cannot divide evenly, so nearest-neighbour sampling reshuffles texel widths as the sprite
  // drifts sub-pixel -- the shimmer players read as flicker while moving.
  displayScale: z.number().positive().default(3),
  maxHp: z.number().positive(),
  armor: z.number().nonnegative(),
  moveSpeed: z.number().positive(),
  acceleration: z.number().positive(),
  luck: z.number().positive(),
  pickupRadius: z.number().positive(),
  fireDamageMultiplier: z.number().positive().default(1),
  fireCooldownMultiplier: z.number().positive().default(1),
  fireDurationMultiplier: z.number().positive().default(1),
  startingAbility: AbilityIdSchema,
});

export const EnemyDefinitionSchema = z.object({
  id: z.enum(['crawler', 'crab', 'brute', 'wizard', 'nailhead', 'gravity', 'miniBoss', 'finalBoss']),
  name: z.string().min(1),
  spriteKey: z.string().min(1),
  animationKey: z.string().min(1),
  behavior: z.enum(['melee', 'ranged', 'boomerang', 'gravity']),
  hp: z.number().positive(),
  damage: z.number().nonnegative(),
  speed: z.number().nonnegative(),
  xp: z.number().int().positive(),
  radius: z.number().positive(),
  attackRange: z.number().positive(),
  attackCooldown: z.number().positive(),
  projectileSpeed: z.number().nonnegative(),
  coinChance: z.number().min(0).max(1),
  boss: z.boolean(),
  displayScale: z.number().positive(),
});

export const ScalarKeyframeSchema = z.object({
  t: z.number().min(0).max(1),
  value: z.number(),
});

export const VectorKeyframeSchema = z.object({
  t: z.number().min(0).max(1),
  values: z.array(z.number()),
});

export const LevelDefinitionSchema = z.object({
  id: z.string().min(1),
  durationSeconds: z.number().positive(),
  miniBossTimeSeconds: z.number().nonnegative(),
  chestIntervalSeconds: z.number().positive(),
  initialGemCount: z.number().int().nonnegative(),
  spawnRate: z.array(ScalarKeyframeSchema).min(2),
  spawnChance: z.array(VectorKeyframeSchema).min(2),
  hpBuffs: z.array(VectorKeyframeSchema).min(2),
});

export type AbilityId = z.infer<typeof AbilityIdSchema>;
export type AbilityDefinition = z.infer<typeof AbilityDefinitionSchema>;
export type WeaponStats = z.infer<typeof WeaponStatsSchema>;
export type StatKey = z.infer<typeof StatKeySchema>;
export type CharacterDefinition = z.infer<typeof CharacterDefinitionSchema>;
export type EnemyDefinition = z.infer<typeof EnemyDefinitionSchema>;
export type LevelDefinition = z.infer<typeof LevelDefinitionSchema>;
