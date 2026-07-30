import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AbilityChoiceView } from '../../src/game/core/types';
import { useSessionStore } from '../../src/stores/session';

const choice: AbilityChoiceView = {
  id: 'machineGun',
  level: 1,
  nextLevel: 2,
  maxLevel: 8,
  name: 'Machine Gun',
  description: 'Test choice',
  iconKey: 'weapon-machine-gun',
  iconUrl: '/assets/weapons/machine-gun.png',
  category: 'active',
};

describe('session overlay state', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('does not let a generic pause event overwrite the level-up overlay', () => {
    const session = useSessionStore();
    session.start('blue');
    session.showLevelUp([choice]);

    session.setPaused(true);

    expect(session.screen).toBe('levelUp');
    expect(session.choices).toEqual([choice]);
  });

  it('returns from level-up to play when the upgrade flow completes', () => {
    const session = useSessionStore();
    session.start('blue');
    session.showLevelUp([choice]);

    session.setPaused(false);

    expect(session.screen).toBe('playing');
    expect(session.choices).toEqual([]);
  });

  it('ignores stale pause events outside an active run', () => {
    const session = useSessionStore();
    session.setPaused(true);
    expect(session.screen).toBe('menu');
  });
});
