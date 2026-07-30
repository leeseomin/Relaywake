export interface PoolLifecycle<T> {
  create: () => T;
  activate: (item: T) => void;
  deactivate: (item: T) => void;
  destroy?: (item: T) => void;
}

export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly inUse = new Set<T>();

  public constructor(private readonly lifecycle: PoolLifecycle<T>, initialSize = 0) {
    for (let index = 0; index < initialSize; index += 1) {
      const item = lifecycle.create();
      lifecycle.deactivate(item);
      this.available.push(item);
    }
  }

  public acquire(): T {
    const item = this.available.pop() ?? this.lifecycle.create();
    this.inUse.add(item);
    this.lifecycle.activate(item);
    return item;
  }

  public release(item: T): void {
    if (!this.inUse.delete(item)) return;
    this.lifecycle.deactivate(item);
    this.available.push(item);
  }

  public releaseAll(): void {
    for (const item of [...this.inUse]) this.release(item);
  }

  public destroy(): void {
    this.releaseAll();
    const destroy = this.lifecycle.destroy;
    if (destroy) {
      for (const item of this.available) destroy(item);
    }
    this.available.length = 0;
  }

  public get activeCount(): number {
    return this.inUse.size;
  }
}
