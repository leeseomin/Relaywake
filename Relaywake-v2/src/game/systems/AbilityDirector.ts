import { abilities, cumulativeAbilityBonus, getAbility } from '../data/abilities';
import type { AbilityDefinition, AbilityId, StatKey, WeaponStats } from '../data/schemas';
import type { SeededRandom } from '../core/rng';

export interface AbilityState {
  id: AbilityId;
  level: number;
  cooldownRemaining: number;
}

export interface GlobalModifiers {
  damage: number;
  cooldown: number;
  projectileSpeed: number;
  count: number;
  radius: number;
  knockback: number;
  armor: number;
  moveSpeed: number;
}

export class AbilityDirector {
  private readonly states = new Map<AbilityId, AbilityState>();

  public constructor(private readonly rng: SeededRandom) {}

  public grant(id: AbilityId): AbilityState {
    const current = this.states.get(id);
    const definition = getAbility(id);
    if (current) {
      current.level = Math.min(definition.maxLevel, current.level + 1);
      return current;
    }
    const state: AbilityState = { id, level: 1, cooldownRemaining: 0 };
    this.states.set(id, state);
    return state;
  }

  public get(id: AbilityId): AbilityState | undefined {
    return this.states.get(id);
  }

  public owned(): AbilityState[] {
    return [...this.states.values()];
  }

  public buildChoices(count: number): AbilityDefinition[] {
    const available = abilities.filter((ability) => {
      const state = this.states.get(ability.id);
      return !state || state.level < ability.maxLevel;
    });
    return this.rng.shuffle(available).slice(0, count);
  }

  public tick(deltaSeconds: number): void {
    for (const state of this.states.values()) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - deltaSeconds);
    }
  }

  public isReady(id: AbilityId): boolean {
    return (this.states.get(id)?.cooldownRemaining ?? Number.POSITIVE_INFINITY) <= 0;
  }

  public trigger(id: AbilityId, cooldown: number): void {
    const state = this.states.get(id);
    if (state) state.cooldownRemaining = Math.max(0.02, cooldown);
  }

  public effectiveStats(id: AbilityId): WeaponStats {
    const definition = getAbility(id);
    const level = this.states.get(id)?.level ?? 0;
    const stats = { ...definition.stats };
    if (level <= 0) return stats;

    for (const stat of Object.keys(stats) as StatKey[]) {
      const bonus = cumulativeAbilityBonus(id, level, stat);
      const current = stats[stat];
      if (typeof current === 'number') stats[stat] = current + bonus;
    }

    const global = this.globalModifiers();
    stats.damage *= global.damage;
    stats.cooldown *= global.cooldown;
    stats.projectileSpeed *= global.projectileSpeed;
    stats.count = Math.max(1, Math.round(stats.count + (definition.category === 'active' ? global.count : 0)));
    stats.radius *= global.radius;
    stats.knockback *= global.knockback;
    return stats;
  }

  public globalModifiers(): GlobalModifiers {
    return {
      damage: 1 + this.sumPassive('damage', 'damage'),
      cooldown: Math.max(0.2, 1 + this.sumPassive('cooldown', 'cooldown')),
      projectileSpeed: 1 + this.sumPassive('projectileSpeed', 'projectileSpeed'),
      count: this.sumPassive('projectileCount', 'count'),
      radius: 1 + this.sumPassive('aoe', 'radius'),
      knockback: 1 + this.sumPassive('knockback', 'knockback'),
      armor: this.sumPassive('armor', 'armor'),
      moveSpeed: 1 + this.sumPassive('moveSpeed', 'moveSpeed'),
    };
  }

  private sumPassive(id: AbilityId, stat: StatKey): number {
    const state = this.states.get(id);
    if (!state) return 0;
    const definition = getAbility(id);
    const bonus = definition.bonuses.find((entry) => entry.stat === stat);
    if (!bonus) return definition.stats[stat];
    return bonus.values.slice(0, state.level).reduce((sum, value) => sum + value, 0);
  }
}
