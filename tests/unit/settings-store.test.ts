import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as persistence from '../../src/persistence/db';
import {
  defaultProfile,
  defaultSettings,
  type Settings,
} from '../../src/persistence/schemas';
import { useProfileStore } from '../../src/stores/profile';
import { useSettingsStore } from '../../src/stores/settings';

describe('settings persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('defaults to English when no saved settings exist', async () => {
    vi.spyOn(persistence, 'readSettings').mockResolvedValueOnce(undefined);
    const store = useSettingsStore();

    await store.hydrate();

    expect(store.settings.locale).toBe('en');
  });

  it('does not change memory state when persistence fails', async () => {
    const store = useSettingsStore();
    const before = JSON.parse(JSON.stringify(store.settings)) as Settings;
    vi.spyOn(persistence, 'writeSettings').mockRejectedValueOnce(
      new Error('simulated settings write failure'),
    );

    await expect(store.patch({ soundEnabled: false })).rejects.toThrow(
      'simulated settings write failure',
    );

    expect(store.settings).toEqual(before);
  });

  it('publishes the new memory state only after persistence succeeds', async () => {
    const store = useSettingsStore();
    let finishWrite: (() => void) | undefined;
    vi.spyOn(persistence, 'writeSettings').mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
    );

    const pending = store.patch({ soundEnabled: false });
    await Promise.resolve();
    expect(store.settings.soundEnabled).toBe(true);

    finishWrite?.();
    await pending;

    expect(store.settings.soundEnabled).toBe(false);
  });

  it('serializes concurrent patches so different fields are not lost', async () => {
    const store = useSettingsStore();
    const writes: Settings[] = [];
    vi.spyOn(persistence, 'writeSettings').mockImplementation(async (settings) => {
      writes.push(settings);
    });

    await Promise.all([
      store.patch({ soundEnabled: false }),
      store.patch({ screenShake: false }),
    ]);

    expect(store.settings).toMatchObject({
      soundEnabled: false,
      screenShake: false,
    });
    expect(writes.at(-1)).toMatchObject({
      soundEnabled: false,
      screenShake: false,
    });
  });

  it('continues queued writes after a failure without rolling back a later success', async () => {
    const store = useSettingsStore();
    const write = vi.spyOn(persistence, 'writeSettings');
    write.mockRejectedValueOnce(new Error('simulated first write failure'));
    write.mockResolvedValueOnce();

    const [failed, succeeded] = await Promise.allSettled([
      store.patch({ soundEnabled: false }),
      store.patch({ screenShake: false }),
    ]);

    expect(failed.status).toBe('rejected');
    expect(succeeded.status).toBe('fulfilled');
    expect(store.settings).toMatchObject({
      soundEnabled: true,
      screenShake: false,
    });
  });

  it('waits for a pending settings write before atomically resetting all data', async () => {
    const settingsStore = useSettingsStore();
    const profileStore = useProfileStore();
    let finishWrite: (() => void) | undefined;
    vi.spyOn(persistence, 'writeSettings').mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
    );
    const reset = vi.spyOn(persistence, 'resetDatabase').mockResolvedValue({
      profile: defaultProfile(),
      settings: defaultSettings(),
    });

    const patch = settingsStore.patch({ soundEnabled: false });
    await Promise.resolve();
    const resetAll = profileStore.reset();
    await Promise.resolve();

    expect(reset).not.toHaveBeenCalled();
    finishWrite?.();
    await patch;
    await resetAll;

    expect(reset).toHaveBeenCalledOnce();
    expect(settingsStore.settings.soundEnabled).toBe(true);
    expect(profileStore.profile.totalRuns).toBe(0);
  });
});
