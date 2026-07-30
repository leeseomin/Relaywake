export interface SpatialPoint {
  id: number;
  x: number;
  y: number;
  active: boolean;
}

export class SpatialHashGrid<T extends SpatialPoint> {
  private readonly cells = new Map<string, T[]>();

  public constructor(private readonly cellSize: number) {
    if (cellSize <= 0) throw new Error('cellSize must be positive.');
  }

  public clear(): void {
    this.cells.clear();
  }

  public insert(item: T): void {
    if (!item.active) return;
    const key = this.keyFor(item.x, item.y);
    const cell = this.cells.get(key);
    if (cell) cell.push(item);
    else this.cells.set(key, [item]);
  }

  public rebuild(items: readonly T[]): void {
    this.clear();
    for (const item of items) this.insert(item);
  }

  public queryCircle(x: number, y: number, radius: number): T[] {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const radiusSquared = radius * radius;
    const matches: T[] = [];

    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        const cell = this.cells.get(`${cellX}:${cellY}`);
        if (!cell) continue;
        for (const item of cell) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (item.active && dx * dx + dy * dy <= radiusSquared) matches.push(item);
        }
      }
    }
    return matches;
  }

  private keyFor(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`;
  }
}
