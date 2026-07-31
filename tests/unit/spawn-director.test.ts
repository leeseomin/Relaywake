import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/game/core/rng';
import { SpawnDirector } from '../../src/game/systems/SpawnDirector';

describe('SpawnDirector', () => {
  it('emits regular enemies from the ported rate curve', () => {
    const director = new SpawnDirector(new SeededRandom(1), 600, 300);
    const tick = director.update(1.1, 0);
    expect(tick.regularEnemies.length).toBe(1);
    expect(tick.spawnMiniBoss).toBe(false);
  });

  it('spawns each boss only once', () => {
    const director = new SpawnDirector(new SeededRandom(1), 20, 10);
    expect(director.update(0, 10).spawnMiniBoss).toBe(true);
    expect(director.update(0, 11).spawnMiniBoss).toBe(false);
    expect(director.update(0, 20).spawnFinalBoss).toBe(true);
    expect(director.update(0, 21).spawnFinalBoss).toBe(false);
  });
});
