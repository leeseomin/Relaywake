import { z } from 'zod';
import { EnemyDefinitionSchema, type EnemyDefinition } from './schemas';

export const enemies = z.array(EnemyDefinitionSchema).parse([
  {
    id: 'crawler', name: 'Alien Crawler', spriteKey: 'enemy-alien', animationKey: 'enemy-alien-walk', behavior: 'melee',
    hp: 10, damage: 2, speed: 54, xp: 1, radius: 17, attackRange: 27, attackCooldown: 0.72,
    projectileSpeed: 0, coinChance: 0.02, boss: false, displayScale: 1,
  },
  {
    id: 'crab', name: 'Orange Crab', spriteKey: 'enemy-crab', animationKey: 'enemy-crab-walk', behavior: 'melee',
    hp: 30, damage: 5, speed: 49, xp: 2, radius: 19, attackRange: 30, attackCooldown: 0.82,
    projectileSpeed: 0, coinChance: 0.035, boss: false, displayScale: 1,
  },
  {
    id: 'brute', name: 'Punch Brute', spriteKey: 'enemy-brute', animationKey: 'enemy-brute-walk', behavior: 'melee',
    hp: 50, damage: 10, speed: 45, xp: 10, radius: 22, attackRange: 34, attackCooldown: 1.02,
    projectileSpeed: 0, coinChance: 0.07, boss: false, displayScale: 1,
  },
  {
    id: 'wizard', name: 'Wizard', spriteKey: 'enemy-wizard', animationKey: 'enemy-wizard-walk', behavior: 'ranged',
    hp: 25, damage: 4, speed: 61, xp: 4, radius: 19, attackRange: 230, attackCooldown: 2,
    projectileSpeed: 185, coinChance: 0.04, boss: false, displayScale: 1,
  },
  {
    id: 'nailhead', name: 'Nail Head', spriteKey: 'enemy-nailhead', animationKey: 'enemy-nailhead-walk', behavior: 'boomerang',
    hp: 45, damage: 5, speed: 50, xp: 7, radius: 20, attackRange: 275, attackCooldown: 3.15,
    projectileSpeed: 165, coinChance: 0.05, boss: false, displayScale: 1,
  },
  {
    id: 'gravity', name: 'Gravity Bomber', spriteKey: 'enemy-gravity', animationKey: 'enemy-gravity-walk', behavior: 'gravity',
    hp: 38, damage: 10, speed: 39, xp: 9, radius: 21, attackRange: 310, attackCooldown: 3.35,
    projectileSpeed: 145, coinChance: 0.055, boss: false, displayScale: 1,
  },
  {
    id: 'miniBoss', name: 'Executioner', spriteKey: 'enemy-miniboss', animationKey: 'enemy-miniboss-walk', behavior: 'melee',
    hp: 250, damage: 20, speed: 64, xp: 65, radius: 36, attackRange: 48, attackCooldown: 0.9,
    projectileSpeed: 0, coinChance: 1, boss: true, displayScale: 1,
  },
  {
    id: 'finalBoss', name: 'Night Sovereign', spriteKey: 'enemy-boss', animationKey: 'enemy-boss-walk', behavior: 'gravity',
    hp: 500, damage: 20, speed: 70, xp: 250, radius: 44, attackRange: 330, attackCooldown: 2.2,
    projectileSpeed: 180, coinChance: 1, boss: true, displayScale: 1,
  },
]);

export type EnemyId = EnemyDefinition['id'];
export const enemyById = new Map<EnemyId, EnemyDefinition>(enemies.map((enemy) => [enemy.id, enemy]));

export function getEnemy(id: EnemyId): EnemyDefinition {
  const enemy = enemyById.get(id);
  if (!enemy) throw new Error(`Unknown enemy: ${id}`);
  return enemy;
}
