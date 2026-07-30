import type { SeededRandom } from './rng';

export function chooseWeightedIndex(weights: readonly number[], rng: SeededRandom): number {
  if (weights.length === 0) throw new Error('At least one weight is required.');
  const sanitized = weights.map((weight) => Math.max(0, Number.isFinite(weight) ? weight : 0));
  const total = sanitized.reduce((sum, weight) => sum + weight, 0);
  if (total <= Number.EPSILON) return rng.integer(0, weights.length - 1);

  let cursor = rng.next() * total;
  for (let index = 0; index < sanitized.length; index += 1) {
    cursor -= sanitized[index] ?? 0;
    if (cursor <= 0) return index;
  }
  return sanitized.length - 1;
}
