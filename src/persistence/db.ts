import Dexie, { type EntityTable } from 'dexie';
import {
  defaultProfile,
  defaultSettings,
  ProfileSchema,
  RunRowSchema,
  SettingsSchema,
  type Profile,
  type RunRow,
  type Settings,
} from './schemas';

export class C2Database extends Dexie {
  declare profiles: EntityTable<Profile, 'id'>;
  declare settings: EntityTable<Settings, 'id'>;
  declare runs: EntityTable<RunRow, 'id'>;

  public constructor() {
    super('c2-nightfall');
    this.version(1).stores({
      profiles: 'id, updatedAt',
      settings: 'id, updatedAt',
      runs: 'id, endedAt, characterId, victory, kills',
    });
  }
}

export const db = new C2Database();

export async function readProfile(): Promise<Profile | undefined> {
  const row = await db.profiles.get('main');
  return row ? ProfileSchema.parse(row) : undefined;
}

export async function readSettings(): Promise<Settings | undefined> {
  const row = await db.settings.get('main');
  return row ? SettingsSchema.parse(row) : undefined;
}

export async function writeSettings(settings: Settings): Promise<void> {
  await db.settings.put(SettingsSchema.parse(settings));
}

export async function writeRunAndProfile(
  run: RunRow,
  fallbackProfile: Profile,
): Promise<{ inserted: boolean; profile: Profile }> {
  const parsedRun = RunRowSchema.parse(run);
  const parsedFallback = ProfileSchema.parse(fallbackProfile);

  return db.transaction('rw', db.runs, db.profiles, async () => {
    const [existingRun, storedProfile] = await Promise.all([
      db.runs.get(parsedRun.id),
      db.profiles.get('main'),
    ]);
    const base = storedProfile ? ProfileSchema.parse(storedProfile) : parsedFallback;
    if (existingRun) return { inserted: false, profile: base };

    const profile = ProfileSchema.parse({
      ...base,
      coins: base.coins + parsedRun.coins,
      bestTimeSeconds: Math.max(base.bestTimeSeconds, parsedRun.elapsedSeconds),
      bestKills: Math.max(base.bestKills, parsedRun.kills),
      totalRuns: base.totalRuns + 1,
      updatedAt: new Date().toISOString(),
    });
    await db.runs.put(parsedRun);
    await db.profiles.put(profile);
    return { inserted: true, profile };
  });
}

export async function resetDatabase(): Promise<{ profile: Profile; settings: Settings }> {
  const profile = defaultProfile();
  const settings = defaultSettings();

  await db.transaction('rw', db.profiles, db.settings, db.runs, async () => {
    await Promise.all([db.profiles.clear(), db.settings.clear(), db.runs.clear()]);
    await Promise.all([db.profiles.put(profile), db.settings.put(settings)]);
  });

  return { profile, settings };
}
