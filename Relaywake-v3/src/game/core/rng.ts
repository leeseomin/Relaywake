export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  public between(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  public integer(min: number, maxInclusive: number): number {
    return Math.floor(this.between(min, maxInclusive + 1));
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty array.');
    const value = items[this.integer(0, items.length - 1)];
    if (value === undefined) throw new Error('Random index was outside the array.');
    return value;
  }

  public shuffle<T>(items: readonly T[]): T[] {
    const output = [...items];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      const current = output[index];
      const other = output[swapIndex];
      if (current === undefined || other === undefined) continue;
      output[index] = other;
      output[swapIndex] = current;
    }
    return output;
  }
}
