import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  db,
  readProfile,
  resetDatabase,
  writeRunAndProfile,
} from '../../src/persistence/db';
import {
  defaultProfile,
  defaultSettings,
  type Profile,
  type RunRow,
} from '../../src/persistence/schemas';
import { useProfileStore } from '../../src/stores/profile';

const run: RunRow = {
  id: 'run-atomicity',
  characterId: 'blue',
  victory: true,
  elapsedSeconds: 120,
  kills: 35,
  level: 8,
  coins: 10,
  damageDealt: 2500,
  endedAt: '2026-07-30T00:02:00.000Z',
};

describe('run/profile persistence', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    db.close();
    await db.delete();
    await db.open();
  });

  it('commits a run and its profile together', async () => {
    const result = await writeRunAndProfile(run, defaultProfile());

    await expect(db.runs.get(run.id)).resolves.toEqual(run);
    await expect(readProfile()).resolves.toEqual(result.profile);
    expect(result).toMatchObject({
      inserted: true,
      profile: {
        coins: run.coins,
        bestTimeSeconds: run.elapsedSeconds,
        bestKills: run.kills,
        totalRuns: 1,
      },
    });
  });

  it('rolls the run back when the profile write fails', async () => {
    const rejectProfile = (): never => {
      throw new Error('simulated profile write failure');
    };
    db.profiles.hook('creating', rejectProfile);

    try {
      await expect(writeRunAndProfile(run, defaultProfile())).rejects.toThrow(
        'simulated profile write failure',
      );
      await expect(db.runs.get(run.id)).resolves.toBeUndefined();
      await expect(readProfile()).resolves.toBeUndefined();
    } finally {
      db.profiles.hook('creating').unsubscribe(rejectProfile);
    }
  });

  it('preserves an existing profile when its update fails', async () => {
    const existing = {
      ...defaultProfile(),
      coins: 4,
      totalRuns: 1,
      updatedAt: '2026-07-29T00:00:00.000Z',
    };
    await db.profiles.put(existing);
    const rejectProfile = (): never => {
      throw new Error('simulated profile update failure');
    };
    db.profiles.hook('updating', rejectProfile);

    try {
      await expect(writeRunAndProfile(run, defaultProfile())).rejects.toThrow(
        'simulated profile update failure',
      );
      await expect(db.runs.get(run.id)).resolves.toBeUndefined();
      await expect(readProfile()).resolves.toEqual(existing);
    } finally {
      db.profiles.hook('updating').unsubscribe(rejectProfile);
    }
  });

  it('updates Pinia only after the transaction commits', async () => {
    const store = useProfileStore();
    const before = JSON.parse(JSON.stringify(store.profile)) as Profile;
    const rejectProfile = (): never => {
      throw new Error('simulated profile write failure');
    };
    db.profiles.hook('creating', rejectProfile);

    try {
      await expect(store.recordRun(run)).rejects.toThrow('simulated profile write failure');
      expect(store.profile).toEqual(before);
      await expect(db.runs.count()).resolves.toBe(0);
    } finally {
      db.profiles.hook('creating').unsubscribe(rejectProfile);
    }
  });

  it('hydrates the same profile after a successful commit', async () => {
    const writer = useProfileStore();
    await writer.recordRun(run);
    const persisted = await readProfile();

    setActivePinia(createPinia());
    const reloaded = useProfileStore();
    await reloaded.hydrate();

    expect(reloaded.profile).toEqual(persisted);
    expect(reloaded.profile).toEqual(writer.profile);
  });

  it('serializes concurrent run commits without losing profile totals', async () => {
    const store = useProfileStore();
    const secondRun: RunRow = {
      ...run,
      id: 'run-concurrent',
      coins: 6,
      kills: 40,
      endedAt: '2026-07-30T00:03:00.000Z',
    };

    await Promise.all([store.recordRun(run), store.recordRun(secondRun)]);

    expect(store.profile.totalRuns).toBe(2);
    expect(store.profile.coins).toBe(16);
    expect(store.profile.bestKills).toBe(40);
    await expect(db.runs.count()).resolves.toBe(2);
    await expect(readProfile()).resolves.toEqual(store.profile);
  });

  it('does not count the same run id twice', async () => {
    const store = useProfileStore();

    await store.recordRun(run);
    await store.recordRun(run);

    expect(store.profile.totalRuns).toBe(1);
    expect(store.profile.coins).toBe(run.coins);
    await expect(db.runs.count()).resolves.toBe(1);
    await expect(readProfile()).resolves.toEqual(store.profile);
  });

  it('rolls back the whole database reset when a default write fails', async () => {
    const originalProfile = {
      ...defaultProfile(),
      coins: 25,
      totalRuns: 1,
      updatedAt: '2026-07-29T00:00:00.000Z',
    };
    const originalSettings = {
      ...defaultSettings(),
      soundEnabled: false,
      updatedAt: '2026-07-29T00:00:00.000Z',
    };
    await Promise.all([
      db.profiles.put(originalProfile),
      db.settings.put(originalSettings),
      db.runs.put(run),
    ]);
    const rejectSettings = (): never => {
      throw new Error('simulated reset settings failure');
    };
    db.settings.hook('creating', rejectSettings);

    try {
      await expect(resetDatabase()).rejects.toThrow('simulated reset settings failure');
      await expect(db.profiles.get('main')).resolves.toEqual(originalProfile);
      await expect(db.settings.get('main')).resolves.toEqual(originalSettings);
      await expect(db.runs.get(run.id)).resolves.toEqual(run);
    } finally {
      db.settings.hook('creating').unsubscribe(rejectSettings);
    }
  });
});
