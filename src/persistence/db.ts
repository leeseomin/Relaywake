import Dexie, { type EntityTable } from 'dexie';
import { ProfileSchema, RunRowSchema, SettingsSchema, type Profile, type RunRow, type Settings } from './schemas';

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

export async function writeProfile(profile: Profile): Promise<void> {
  await db.profiles.put(ProfileSchema.parse(profile));
}

export async function readSettings(): Promise<Settings | undefined> {
  const row = await db.settings.get('main');
  return row ? SettingsSchema.parse(row) : undefined;
}

export async function writeSettings(settings: Settings): Promise<void> {
  await db.settings.put(SettingsSchema.parse(settings));
}

export async function writeRun(run: RunRow): Promise<void> {
  await db.runs.put(RunRowSchema.parse(run));
}

export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', db.profiles, db.settings, db.runs, async () => {
    await Promise.all([db.profiles.clear(), db.settings.clear(), db.runs.clear()]);
  });
}
