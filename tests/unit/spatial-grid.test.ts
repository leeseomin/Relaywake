import { describe, expect, it } from 'vitest';
import { SpatialHashGrid } from '../../src/game/systems/SpatialHashGrid';

interface Point {
  id: number;
  x: number;
  y: number;
  active: boolean;
  label: string;
}

describe('SpatialHashGrid', () => {
  it('returns only active points inside the query radius', () => {
    const grid = new SpatialHashGrid<Point>(32);
    grid.rebuild([
      { id: 1, x: 0, y: 0, active: true, label: 'near' },
      { id: 2, x: 80, y: 0, active: true, label: 'far' },
      { id: 3, x: 4, y: 4, active: false, label: 'inactive' },
    ]);
    expect(grid.queryCircle(0, 0, 20).map((point) => point.label)).toEqual(['near']);
  });
});
