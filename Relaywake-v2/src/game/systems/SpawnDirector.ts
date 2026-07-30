import { sampleScalar, sampleVector } from '../core/curves';
import type { SeededRandom } from '../core/rng';
import { chooseWeightedIndex } from '../core/weighted';
import { levelOne, regularEnemyOrder } from '../data/level';
import type { EnemyId } from '../data/enemies';

export interface SpawnTick {
  regularEnemies: EnemyId[];
  spawnMiniBoss: boolean;
  spawnFinalBoss: boolean;
}

export class SpawnDirector {
  private accumulator = 0;
  private miniBossSpawned = false;
  private finalBossSpawned = false;

  public constructor(
    private readonly rng: SeededRandom,
    private readonly durationSeconds = levelOne.durationSeconds,
    private readonly miniBossSeconds = levelOne.miniBossTimeSeconds,
  ) {}

  public update(deltaSeconds: number, elapsedSeconds: number): SpawnTick {
    const progress = Math.min(1, elapsedSeconds / this.durationSeconds);
    const spawnRate = sampleScalar(levelOne.spawnRate, progress);
    this.accumulator += deltaSeconds * spawnRate;
    const regularEnemies: EnemyId[] = [];
    const probabilities = sampleVector(levelOne.spawnChance, progress);

    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      const index = chooseWeightedIndex(probabilities, this.rng);
      const enemy = regularEnemyOrder[index];
      if (enemy) regularEnemies.push(enemy);
    }

    const spawnMiniBoss = !this.miniBossSpawned && elapsedSeconds >= this.miniBossSeconds;
    if (spawnMiniBoss) this.miniBossSpawned = true;

    const spawnFinalBoss = !this.finalBossSpawned && elapsedSeconds >= this.durationSeconds;
    if (spawnFinalBoss) this.finalBossSpawned = true;

    return { regularEnemies, spawnMiniBoss, spawnFinalBoss };
  }

  public hpMultiplier(enemyIndex: number, elapsedSeconds: number): number {
    const progress = Math.min(1, elapsedSeconds / this.durationSeconds);
    const buffs = sampleVector(levelOne.hpBuffs, progress);
    return 1 + Math.max(0, buffs[enemyIndex] ?? 0);
  }
}
