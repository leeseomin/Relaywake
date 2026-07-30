import { z } from 'zod';
import {
  AbilityDefinitionSchema,
  type AbilityDefinition,
  type AbilityId,
  type StatKey,
  type WeaponStats,
} from './schemas';

const zeroStats = (): WeaponStats => ({
  damage: 0,
  cooldown: 0,
  projectileSpeed: 0,
  count: 0,
  radius: 0,
  duration: 0,
  knockback: 0,
  pierce: 0,
  recovery: 0,
  lifestealChance: 0,
  armor: 0,
  moveSpeed: 0,
});

const make = (
  value: Omit<AbilityDefinition, 'stats'> & { stats?: Partial<WeaponStats> },
): AbilityDefinition => ({
  ...value,
  stats: { ...zeroStats(), ...value.stats },
});

export const abilities = z.array(AbilityDefinitionSchema).parse([
  make({
    id: 'machineGun',
    name: { ko: 'AK-47', en: 'AK-47' },
    description: { ko: '가장 가까운 적을 향해 탄환 묶음을 연사합니다.', en: 'Fires a rapid burst at the nearest enemy.' },
    iconKey: 'weapon-machine-gun', category: 'active', behavior: 'spreadProjectile', maxLevel: 5,
    stats: { damage: 5, cooldown: 2, projectileSpeed: 430, count: 4, radius: 7, duration: 1.4, knockback: 0.15, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1, 1] },
      { stat: 'count', values: [1, 1, 2, 2] },
      { stat: 'cooldown', values: [-0.12, -0.12, -0.12, -0.16] },
    ],
  }),
  make({
    id: 'shuriken',
    name: { ko: '수리검', en: 'Shuriken' },
    description: { ko: '빠른 수리검을 여러 방향으로 던집니다.', en: 'Throws fast shuriken toward nearby threats.' },
    iconKey: 'weapon-shuriken', category: 'active', behavior: 'projectile', maxLevel: 5,
    stats: { damage: 5, cooldown: 0.5, projectileSpeed: 350, count: 2, radius: 8, duration: 1.8, knockback: 0.1, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1.5, 2] },
      { stat: 'projectileSpeed', values: [25, 25, 35, 45] },
      { stat: 'count', values: [0, 1, 0, 1] },
    ],
  }),
  make({
    id: 'bat',
    name: { ko: '야구 방망이', en: 'Bat' },
    description: { ko: '전방의 넓은 부채꼴을 강하게 휘두릅니다.', en: 'Swings through a wide frontal arc.' },
    iconKey: 'weapon-bat', category: 'active', behavior: 'meleeFan', maxLevel: 5,
    stats: { damage: 10, cooldown: 1.5, count: 1, radius: 118, duration: 0.18, knockback: 2 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'knockback', values: [0.1, 0.1, 0.1, 0.1] },
    ],
  }),
  make({
    id: 'dagger',
    name: { ko: '출혈 단검', en: 'Bleeding Dagger' },
    description: { ko: '적을 관통하고 지속 피해를 남기는 단검입니다.', en: 'A piercing dagger that leaves a bleeding wound.' },
    iconKey: 'weapon-dagger', category: 'active', behavior: 'projectile', maxLevel: 5,
    stats: { damage: 10, cooldown: 0.5, projectileSpeed: 390, count: 1, radius: 8, duration: 1.6, knockback: 0.3, pierce: 2 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'pierce', values: [0, 1, 0, 1] },
      { stat: 'count', values: [0, 0, 1, 0] },
    ],
  }),
  make({
    id: 'axe',
    name: { ko: '회전 도끼', en: 'Orbiting Axe' },
    description: { ko: '플레이어 주위를 회전하며 접근하는 적을 베어냅니다.', en: 'Orbits the player and cuts through nearby enemies.' },
    iconKey: 'weapon-sword', category: 'active', behavior: 'orbit', maxLevel: 5,
    stats: { damage: 10, cooldown: 0, projectileSpeed: 2.1, count: 1, radius: 86, duration: 0, knockback: 1, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [2, 2, 3, 4] },
      { stat: 'count', values: [1, 0, 1, 1] },
      { stat: 'radius', values: [7, 7, 10, 12] },
    ],
  }),
  make({
    id: 'grenade',
    name: { ko: '파편 수류탄', en: 'Fragment Grenade' },
    description: { ko: '적 무리에 투척되어 폭발하고 파편을 흩뿌립니다.', en: 'Explodes inside a crowd and scatters fragments.' },
    iconKey: 'weapon-grenade', category: 'active', behavior: 'grenade', maxLevel: 5,
    stats: { damage: 10, cooldown: 3, projectileSpeed: 260, count: 1, radius: 94, duration: 0.75, knockback: 0.5, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [3, 3, 4, 5] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'count', values: [0, 1, 0, 1] },
    ],
  }),
  make({
    id: 'molotov',
    name: { ko: '화염병', en: 'Molotov' },
    description: { ko: '바닥에 지속되는 불길을 만들어 반복 피해를 줍니다.', en: 'Creates a persistent burning zone.' },
    iconKey: 'weapon-molotov', category: 'active', behavior: 'molotov', maxLevel: 5,
    stats: { damage: 3, cooldown: 2, projectileSpeed: 230, count: 1, radius: 68, duration: 3, knockback: 0.1, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [1, 1, 1, 2] },
      { stat: 'duration', values: [0.4, 0.4, 0.6, 0.8] },
      { stat: 'radius', values: [6, 6, 10, 12] },
    ],
  }),
  make({
    id: 'lightsaber',
    name: { ko: '광선검', en: 'Lightsaber' },
    description: { ko: '회전하는 광선검이 근접한 적을 연속으로 절단합니다.', en: 'A rotating energy blade slices nearby enemies.' },
    iconKey: 'weapon-lightsaber', category: 'active', behavior: 'beam', maxLevel: 5,
    stats: { damage: 5, cooldown: 3, count: 1, radius: 104, duration: 0.75, knockback: 0.2, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [0.5, 0.5, 0.5, 1] },
      { stat: 'radius', values: [8, 8, 12, 16] },
      { stat: 'duration', values: [0.1, 0.1, 0.15, 0.2] },
    ],
  }),
  make({
    id: 'machete',
    name: { ko: '마체테', en: 'Machete' },
    description: { ko: '좌우로 번갈아 넓게 베어 전선을 정리합니다.', en: 'Alternates broad slashes to the left and right.' },
    iconKey: 'weapon-machete', category: 'active', behavior: 'sideSlash', maxLevel: 5,
    stats: { damage: 2, cooldown: 1.75, count: 1, radius: 132, duration: 0.22, knockback: 1, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [0.5, 0.5, 0.5, 1] },
      { stat: 'radius', values: [10, 10, 14, 18] },
      { stat: 'cooldown', values: [-0.1, -0.1, -0.12, -0.14] },
    ],
  }),
  make({
    id: 'bazooka',
    name: { ko: '바주카', en: 'Bazooka' },
    description: { ko: '느리지만 강력한 폭발탄을 발사합니다.', en: 'Fires a slow, high-impact explosive rocket.' },
    iconKey: 'weapon-bazooka', category: 'active', behavior: 'grenade', maxLevel: 5,
    stats: { damage: 20, cooldown: 3, projectileSpeed: 210, count: 1, radius: 78, duration: 1.4, knockback: 2, pierce: 1 },
    bonuses: [
      { stat: 'damage', values: [4, 4, 6, 8] },
      { stat: 'cooldown', values: [-0.1, -0.1, -0.1, -0.1] },
      { stat: 'radius', values: [6, 8, 10, 14] },
    ],
  }),
  make({
    id: 'sword',
    name: { ko: '쌍방향 검격', en: 'Twin Sword' },
    description: { ko: '좌우에 동시에 짧고 강한 검격을 냅니다.', en: 'Strikes hard on both sides at once.' },
    iconKey: 'weapon-sword', category: 'active', behavior: 'sideSlash', maxLevel: 5,
    stats: { damage: 30, cooldown: 1, count: 2, radius: 92, duration: 0.16, knockback: 1.2, pierce: 99 },
    bonuses: [
      { stat: 'damage', values: [4, 4, 6, 8] },
      { stat: 'radius', values: [6, 8, 10, 14] },
      { stat: 'cooldown', values: [-0.08, -0.08, -0.1, -0.12] },
    ],
  }),
  make({
    id: 'recovery',
    name: { ko: '재생', en: 'Recovery' },
    description: { ko: '일정 시간마다 체력을 회복합니다.', en: 'Restores health at regular intervals.' },
    iconKey: 'pickup-potion', category: 'passive', behavior: 'recovery', maxLevel: 5,
    stats: { recovery: 1, cooldown: 10 },
    bonuses: [
      { stat: 'recovery', values: [0.5, 0.5, 1, 1] },
      { stat: 'cooldown', values: [-0.05, -0.05, -0.08, -0.1] },
    ],
  }),
  make({
    id: 'lifesteal',
    name: { ko: '생명 흡수', en: 'Lifesteal' },
    description: { ko: '공격 적중 시 낮은 확률로 체력을 회복합니다.', en: 'Hits have a small chance to restore health.' },
    iconKey: 'weapon-dagger', category: 'passive', behavior: 'lifesteal', maxLevel: 5,
    stats: { recovery: 1, lifestealChance: 0.025 },
    bonuses: [
      { stat: 'lifestealChance', values: [0.01, 0.01, 0.015, 0.02] },
      { stat: 'recovery', values: [0, 0.5, 0.5, 1] },
    ],
  }),
  make({
    id: 'aoe',
    name: { ko: '범위 +', en: 'AOE +' },
    description: { ko: '모든 공격의 범위를 15% 늘립니다.', en: 'Increases the size of all attacks by 15%.' },
    iconKey: 'ui-circle', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'radius', values: [0.15, 0.15, 0.15, 0.15, 0.15] }],
  }),
  make({
    id: 'armor',
    name: { ko: '방어력 +', en: 'Armor +' },
    description: { ko: '받는 피해를 1 줄입니다. 최소 피해는 1입니다.', en: 'Reduces incoming damage by 1, to a minimum of 1.' },
    iconKey: 'ui-square', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'armor', values: [1, 1, 1, 1, 1] }],
  }),
  make({
    id: 'cooldown',
    name: { ko: '재사용 대기시간 +', en: 'Cooldown +' },
    description: { ko: '모든 무기의 재사용 대기시간을 단축합니다.', en: 'Reduces all weapon cooldowns.' },
    iconKey: 'ui-play', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'cooldown', values: [-0.15, -0.15, -0.15, -0.1, -0.15] }],
  }),
  make({
    id: 'damage',
    name: { ko: '공격력 +', en: 'Damage +' },
    description: { ko: '모든 공격 피해를 10% 늘립니다.', en: 'Increases all damage by 10%.' },
    iconKey: 'weapon-bomb', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'damage', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
  make({
    id: 'moveSpeed',
    name: { ko: '이동 속도 +', en: 'Speed +' },
    description: { ko: '이동 속도를 10% 늘립니다.', en: 'Increases movement speed by 10%.' },
    iconKey: 'ui-play', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'moveSpeed', values: [0.1, 0.1, 0.1, 0.1, 0.1] }],
  }),
  make({
    id: 'knockback',
    name: { ko: '밀치기 +', en: 'Knockback +' },
    description: { ko: '모든 공격의 밀치기 힘을 강화합니다.', en: 'Increases knockback from all attacks.' },
    iconKey: 'weapon-bat', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'knockback', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
  make({
    id: 'projectileCount',
    name: { ko: '투사체 수 +', en: 'Projectiles +' },
    description: { ko: '투사체 기반 무기의 발사 수를 늘립니다.', en: 'Adds projectiles to projectile-based weapons.' },
    iconKey: 'weapon-shuriken', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'count', values: [1, 1, 1, 1, 1] }],
  }),
  make({
    id: 'projectileSpeed',
    name: { ko: '투사체 속도 +', en: 'Projectile Speed +' },
    description: { ko: '모든 투사체의 속도를 10% 늘립니다.', en: 'Increases projectile speed by 10%.' },
    iconKey: 'weapon-machine-gun', category: 'passive', behavior: 'stat', maxLevel: 5,
    bonuses: [{ stat: 'projectileSpeed', values: [0.1, 0.1, 0.1, 0.1, 0.15] }],
  }),
]);

export const abilityById = new Map<AbilityId, AbilityDefinition>(abilities.map((ability) => [ability.id, ability]));

export function getAbility(id: AbilityId): AbilityDefinition {
  const ability = abilityById.get(id);
  if (!ability) throw new Error(`Unknown ability: ${id}`);
  return ability;
}

export function cumulativeAbilityBonus(id: AbilityId, level: number, stat: StatKey): number {
  const ability = getAbility(id);
  const bonus = ability.bonuses.find((entry) => entry.stat === stat);
  if (!bonus || level <= 1) return 0;
  return bonus.values.slice(0, level - 1).reduce((sum, value) => sum + value, 0);
}
