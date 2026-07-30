import { describe, expect, it, vi } from 'vitest';
import { ObjectPool } from '../../src/game/systems/ObjectPool';

describe('ObjectPool', () => {
  it('reuses released objects and executes lifecycle hooks', () => {
    const create = vi.fn(() => ({ active: false }));
    const activate = vi.fn((item: { active: boolean }) => { item.active = true; });
    const deactivate = vi.fn((item: { active: boolean }) => { item.active = false; });
    const pool = new ObjectPool({ create, activate, deactivate }, 1);
    const first = pool.acquire();
    expect(first.active).toBe(true);
    pool.release(first);
    const second = pool.acquire();
    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
    expect(pool.activeCount).toBe(1);
  });
});
