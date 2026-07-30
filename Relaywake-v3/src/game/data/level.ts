import { LevelDefinitionSchema } from './schemas';

export const levelOne = LevelDefinitionSchema.parse({
  id: 'level-1-nightfall',
  durationSeconds: 600,
  miniBossTimeSeconds: 300,
  chestIntervalSeconds: 30,
  initialGemCount: 25,
  spawnRate: [
    { t: 0, value: 1 },
    { t: 0.1, value: 3 },
    { t: 0.43, value: 4.5 },
    { t: 0.48, value: 1 },
    { t: 0.55, value: 1.5 },
    { t: 0.65, value: 3.5 },
    { t: 0.975, value: 6 },
    { t: 1, value: 2 },
  ],
  spawnChance: [
    { t: 0, values: [1, 0, 0, 0, 0, 0] },
    { t: 0.05, values: [1, 0, 0, 0, 0, 0] },
    { t: 0.25, values: [0.25, 0.75, 0, 0, 0, 0] },
    { t: 0.35, values: [0.15, 0.6, 0.25, 0, 0, 0] },
    { t: 0.43, values: [0, 0.25, 0.75, 0, 0, 0] },
    { t: 0.48, values: [0.8, 0.1, 0.1, 0, 0, 0] },
    { t: 0.55, values: [1, 0, 0, 0, 0, 0] },
    { t: 0.6, values: [0.3, 0.3, 0.3, 0.1, 0, 0] },
    { t: 0.7, values: [0.3, 0.3, 0.3, 0, 0.1, 0] },
    { t: 0.8, values: [0.3, 0.3, 0.3, 0, 0, 0.1] },
    { t: 0.9, values: [0.25, 0.25, 0.25, 0.05, 0.1, 0.1] },
    { t: 1, values: [0.3, 0.3, 0.4, 0, 0, 0] },
  ],
  hpBuffs: [
    { t: 0, values: [0, 0, 0, 0, 0, 0] },
    { t: 0.5, values: [1, 1, 1, 0, 0, 0] },
    { t: 1, values: [2, 2, 2, 1, 1, 1] },
  ],
});

export const regularEnemyOrder = ['crawler', 'crab', 'brute', 'wizard', 'nailhead', 'gravity'] as const;
