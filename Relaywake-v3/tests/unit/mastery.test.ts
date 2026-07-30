import { describe, expect, it } from 'vitest';
import { applyCharacterAbilityModifiers } from '../../src/game/core/mastery';
import { getAbility } from '../../src/game/data/abilities';
import { getCharacter } from '../../src/game/data/characters';


describe('character ability mastery', () => {
  it('amplifies Fire Master fire damage and duration while reducing fire cooldown', () => {
    const base = { ...getAbility('molotov').stats };
    const adjusted = applyCharacterAbilityModifiers(getCharacter('fire'), 'molotov', base);

    expect(adjusted.damage).toBeCloseTo(base.damage * 1.25);
    expect(adjusted.cooldown).toBeCloseTo(base.cooldown * 0.85);
    expect(adjusted.duration).toBeCloseTo(base.duration * 1.2);
  });

  it('does not apply fire mastery to non-fire abilities or other characters', () => {
    const projectile = { ...getAbility('machineGun').stats };
    const regularFire = { ...getAbility('molotov').stats };

    expect(applyCharacterAbilityModifiers(getCharacter('fire'), 'machineGun', projectile))
      .toBe(projectile);
    expect(applyCharacterAbilityModifiers(getCharacter('blue'), 'molotov', regularFire))
      .toEqual(regularFire);
  });
});
