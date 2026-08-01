import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Dexie from 'dexie';
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  db,
  readProfile,
  readSettings,
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

  it('includes Fire Master in a new local profile and accepts fire-character runs', async () => {
    const profile = defaultProfile();
    const fireRun: RunRow = { ...run, id: 'run-fire-master', characterId: 'fire' };

    expect(profile.unlockedCharacters).toContain('fire');
    await expect(writeRunAndProfile(fireRun, profile)).resolves.toMatchObject({
      inserted: true,
      profile: { totalRuns: 1 },
    });
    await expect(db.runs.get(fireRun.id)).resolves.toEqual(fireRun);
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

  it('quarantines and repairs a malformed profile without blocking later reads', async () => {
    const malformed = {
      ...defaultProfile(),
      coins: -12,
      unlockedCharacters: ['blue', 'blue', 'removed-character'],
      discoveredAbilities: ['machineGun', 'removed-ability'],
    };
    await db.profiles.put(malformed as unknown as Profile);

    const recovered = await readProfile();

    expect(recovered).toMatchObject({
      id: 'main',
      coins: 0,
      unlockedCharacters: ['blue'],
      discoveredAbilities: ['machineGun'],
    });
    await expect(db.profiles.get('main')).resolves.toEqual(recovered);
    await expect(db.recovery.count()).resolves.toBe(1);
    await expect(db.recovery.toCollection().first()).resolves.toMatchObject({
      store: 'profiles',
      value: malformed,
    });

    await expect(readProfile()).resolves.toEqual(recovered);
    await expect(db.recovery.count()).resolves.toBe(1);
  });

  it('quarantines malformed settings and preserves the valid legacy fields', async () => {
    const malformed = {
      ...defaultSettings(),
      locale: 'unsupported',
      soundEnabled: false,
      damageNumbers: 'yes',
    };
    await db.settings.put(malformed as unknown as ReturnType<typeof defaultSettings>);

    const recovered = await readSettings();

    expect(recovered).toMatchObject({
      id: 'main',
      locale: 'en',
      soundEnabled: false,
      damageNumbers: true,
    });
    await expect(db.settings.get('main')).resolves.toEqual(recovered);
    await expect(db.recovery.count()).resolves.toBe(1);
  });

  it.each(['ja', 'zh-Hans', 'es', 'fr'] as const)(
    'keeps the supported %s locale while reading settings',
    async (locale) => {
      const settings = { ...defaultSettings(), locale };
      await db.settings.put(settings);

      await expect(readSettings()).resolves.toEqual(settings);
      await expect(db.recovery.count()).resolves.toBe(0);
    },
  );

  it('opens a version-1 database and migrates its incomplete profile on first read', async () => {
    db.close();
    await db.delete();

    const legacy = new Dexie(DATABASE_NAME);
    legacy.version(1).stores({
      profiles: 'id, updatedAt',
      settings: 'id, updatedAt',
      runs: 'id, endedAt, characterId, victory, kills',
    });
    await legacy.open();
    await legacy.table('profiles').put({
      id: 'main',
      coins: 17,
      unlockedCharacters: ['blue'],
      bestTimeSeconds: 50,
      bestKills: 8,
      totalRuns: 1,
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    legacy.close();

    await db.open();
    expect(db.verno).toBe(DATABASE_VERSION);
    await expect(readProfile()).resolves.toMatchObject({
      coins: 17,
      unlockedCharacters: ['blue'],
      discoveredAbilities: [],
    });
    await expect(db.recovery.count()).resolves.toBe(1);
  });

  it('repairs the malformed source even when its recovery backup cannot be committed', async () => {
    const malformed = { ...defaultProfile(), coins: -1 };
    await db.profiles.put(malformed as unknown as Profile);
    const rejectRecovery = (): never => {
      throw new Error('simulated recovery failure');
    };
    db.recovery.hook('creating', rejectRecovery);

    try {
      await expect(readProfile()).resolves.toMatchObject({ coins: 0 });
      await expect(db.profiles.get('main')).resolves.toMatchObject({ coins: 0 });
    } finally {
      db.recovery.hook('creating').unsubscribe(rejectRecovery);
    }

    await expect(readProfile()).resolves.toMatchObject({ coins: 0 });
  });

  it('returns safe defaults when every malformed-profile repair write fails', async () => {
    const malformed = { ...defaultProfile(), coins: -1 };
    await db.profiles.put(malformed as unknown as Profile);
    const rejectRecovery = (): never => {
      throw new Error('simulated recovery failure');
    };
    const rejectReplacement = (): never => {
      throw new Error('simulated replacement failure');
    };
    db.recovery.hook('creating', rejectRecovery);
    db.profiles.hook('updating', rejectReplacement);

    try {
      await expect(readProfile()).resolves.toMatchObject({ coins: 0 });
      await expect(readProfile()).resolves.toMatchObject({ coins: 0 });
      await expect(db.profiles.get('main')).resolves.toEqual(malformed);
    } finally {
      db.recovery.hook('creating').unsubscribe(rejectRecovery);
      db.profiles.hook('updating').unsubscribe(rejectReplacement);
    }
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
      db.recovery.put({
        id: 'existing-recovery',
        store: 'profiles',
        quarantinedAt: '2026-07-29T00:00:00.000Z',
        reason: 'existing recovery record',
        value: { coins: -1 },
      }),
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
      await expect(db.recovery.get('existing-recovery')).resolves.toBeDefined();
    } finally {
      db.settings.hook('creating').unsubscribe(rejectSettings);
    }
  });
});
