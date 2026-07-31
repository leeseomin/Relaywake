import { describe, expect, it } from 'vitest';
import { SpatialHashGrid } from '../../src/game/systems/SpatialHashGrid';
import {
  separateSpatialCircles,
  type SpatialCircle,
} from '../../src/game/systems/SpatialSeparation';

describe('spatial separation', () => {
  it('uses current positions and leaves the grid ready for collision queries', () => {
    const first: SpatialCircle = { id: 1, active: true, x: 0, y: 0, radius: 10 };
    const second: SpatialCircle = { id: 2, active: true, x: 500, y: 0, radius: 10 };
    const grid = new SpatialHashGrid<SpatialCircle>(32);
    grid.rebuild([first, second]);

    first.x = 200;
    second.x = 205;
    expect(separateSpatialCircles([first, second], grid)).toBe(1);

    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeCloseTo(20);
    expect(grid.queryCircle(first.x, first.y, 1)).toContain(first);
    expect(grid.queryCircle(second.x, second.y, 1)).toContain(second);
  });

  it('separates circles that occupy exactly the same point', () => {
    const first: SpatialCircle = { id: 11, active: true, x: 4, y: 8, radius: 7 };
    const second: SpatialCircle = { id: 12, active: true, x: 4, y: 8, radius: 5 };
    const grid = new SpatialHashGrid<SpatialCircle>(32);

    separateSpatialCircles([first, second], grid);

    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeCloseTo(12);
  });
});
