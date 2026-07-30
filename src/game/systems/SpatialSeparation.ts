import { SpatialHashGrid, type SpatialPoint } from './SpatialHashGrid';

export interface SpatialCircle extends SpatialPoint {
  radius: number;
}

/**
 * Rebuilds the supplied grid from current positions, resolves each overlapping
 * pair once, then rebuilds it again so later collision systems see the adjusted
 * positions.
 */
export function separateSpatialCircles<T extends SpatialCircle>(
  items: readonly T[],
  grid: SpatialHashGrid<T>,
): number {
  grid.rebuild(items);
  let activeCount = 0;
  let maxRadius = 0;
  for (const item of items) {
    if (!item.active) continue;
    activeCount += 1;
    maxRadius = Math.max(maxRadius, item.radius);
  }
  if (activeCount < 2) return 0;

  let separationCount = 0;

  for (const item of items) {
    if (!item.active) continue;
    const neighbors = grid.queryCircle(item.x, item.y, item.radius + maxRadius);
    for (const neighbor of neighbors) {
      if (neighbor.id <= item.id || !neighbor.active) continue;
      const separationX = item.x - neighbor.x;
      const separationY = item.y - neighbor.y;
      let separationLength = Math.hypot(separationX, separationY);
      const desiredDistance = item.radius + neighbor.radius;
      if (separationLength >= desiredDistance) continue;

      let normalX: number;
      let normalY: number;
      if (separationLength <= Number.EPSILON) {
        const angle = ((item.id * 97 + neighbor.id * 53) % 360) * (Math.PI / 180);
        normalX = Math.cos(angle);
        normalY = Math.sin(angle);
        separationLength = 0;
      } else {
        normalX = separationX / separationLength;
        normalY = separationY / separationLength;
      }

      const correction = (desiredDistance - separationLength) * 0.5;
      item.x += normalX * correction;
      item.y += normalY * correction;
      neighbor.x -= normalX * correction;
      neighbor.y -= normalY * correction;
      separationCount += 1;
    }
  }

  grid.rebuild(items);
  return separationCount;
}
