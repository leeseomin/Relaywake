import type { AbilityChoiceView, HudSnapshot, RunSummary } from '../game/core/types';

type GameEventMap = {
  ready: undefined;
  hud: HudSnapshot;
  levelUp: AbilityChoiceView[];
  paused: boolean;
  runEnded: RunSummary;
  toast: string;
};

type Listener<T> = (payload: T) => void;

class TypedEventBus {
  private readonly listeners = new Map<keyof GameEventMap, Set<Listener<never>>>();

  public on<K extends keyof GameEventMap>(type: K, listener: Listener<GameEventMap[K]>): () => void {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set<Listener<never>>();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener as Listener<never>);
    return () => this.off(type, listener);
  }

  public off<K extends keyof GameEventMap>(type: K, listener: Listener<GameEventMap[K]>): void {
    this.listeners.get(type)?.delete(listener as Listener<never>);
  }

  public emit<K extends keyof GameEventMap>(type: K, payload: GameEventMap[K]): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const listener of bucket) listener(payload as never);
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const gameEvents = new TypedEventBus();
