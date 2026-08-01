import Dexie, { type EntityTable } from 'dexie';
import { AbilityIdSchema, CharacterIdSchema } from '../game/data/schemas';
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

export const DATABASE_NAME = 'c2-nightfall';
export const DATABASE_VERSION = 2;

export interface RecoveryRow {
  id: string;
  store: 'profiles' | 'settings';
  quarantinedAt: string;
  reason: string;
  value: unknown;
}

export class C2Database extends Dexie {
  declare profiles: EntityTable<Profile, 'id'>;
  declare settings: EntityTable<Settings, 'id'>;
  declare runs: EntityTable<RunRow, 'id'>;
  declare recovery: EntityTable<RecoveryRow, 'id'>;

  public constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      profiles: 'id, updatedAt',
      settings: 'id, updatedAt',
      runs: 'id, endedAt, characterId, victory, kills',
    });
    this.version(DATABASE_VERSION).stores({
      profiles: 'id, updatedAt',
      settings: 'id, updatedAt',
      runs: 'id, endedAt, characterId, victory, kills',
      recovery: 'id, store, quarantinedAt',
    });
  }
}

export const db = new C2Database();

export async function readProfile(): Promise<Profile | undefined> {
  const row: unknown = await db.profiles.get('main');
  if (row === undefined) return undefined;

  const parsed = ProfileSchema.safeParse(row);
  if (parsed.success) return parsed.data;

  const recovered = migrateProfile(row) ?? defaultProfile();
  await repairProfile(row, recovered, parsed.error.message);
  return recovered;
}

export async function readSettings(): Promise<Settings | undefined> {
  const row: unknown = await db.settings.get('main');
  if (row === undefined) return undefined;

  const parsed = SettingsSchema.safeParse(row);
  if (parsed.success) return parsed.data;

  const recovered = migrateSettings(row) ?? defaultSettings();
  await repairSettings(row, recovered, parsed.error.message);
  return recovered;
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

  return db.transaction('rw', db.runs, db.profiles, db.recovery, async () => {
    const [existingRun, storedProfile] = await Promise.all([
      db.runs.get(parsedRun.id),
      db.profiles.get('main'),
    ]);
    const storedProfileResult = ProfileSchema.safeParse(storedProfile);
    const base = storedProfileResult.success ? storedProfileResult.data : parsedFallback;
    if (storedProfile !== undefined && !storedProfileResult.success) {
      await db.recovery.put(createRecoveryRow(
        'profiles',
        storedProfile,
        storedProfileResult.error.message,
      ));
    }
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

  await db.transaction('rw', db.profiles, db.settings, db.runs, db.recovery, async () => {
    await Promise.all([
      db.profiles.clear(),
      db.settings.clear(),
      db.runs.clear(),
      db.recovery.clear(),
    ]);
    await Promise.all([db.profiles.put(profile), db.settings.put(settings)]);
  });

  return { profile, settings };
}

function createRecoveryRow(
  store: RecoveryRow['store'],
  value: unknown,
  reason: string,
): RecoveryRow {
  const suffix = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return {
    id: `${store}-${suffix}`,
    store,
    quarantinedAt: new Date().toISOString(),
    reason,
    value,
  };
}

async function repairProfile(
  value: unknown,
  recovered: Profile,
  reason: string,
): Promise<void> {
  try {
    await db.transaction('rw', db.profiles, db.recovery, async () => {
      await db.recovery.put(createRecoveryRow('profiles', value, reason));
      await db.profiles.put(recovered);
    });
  } catch (quarantineError) {
    // A full recovery backup can fail independently (for example, when storage is full).
    // Replacing the bad row still prevents it from blocking every later application start.
    try {
      await db.profiles.put(recovered);
    } catch (replacementError) {
      console.error('The malformed profile could not be persisted after recovery.', {
        quarantineError,
        replacementError,
      });
    }
  }
}

async function repairSettings(
  value: unknown,
  recovered: Settings,
  reason: string,
): Promise<void> {
  try {
    await db.transaction('rw', db.settings, db.recovery, async () => {
      await db.recovery.put(createRecoveryRow('settings', value, reason));
      await db.settings.put(recovered);
    });
  } catch (quarantineError) {
    try {
      await db.settings.put(recovered);
    } catch (replacementError) {
      console.error('The malformed settings could not be persisted after recovery.', {
        quarantineError,
        replacementError,
      });
    }
  }
}

function migrateProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const fallback = defaultProfile();
  const candidate = {
    id: 'main',
    coins: nonnegativeNumber(value.coins, fallback.coins, true),
    unlockedCharacters: validUniqueValues(
      value.unlockedCharacters,
      CharacterIdSchema.safeParse.bind(CharacterIdSchema),
      fallback.unlockedCharacters,
    ),
    bestTimeSeconds: nonnegativeNumber(
      value.bestTimeSeconds,
      fallback.bestTimeSeconds,
      false,
    ),
    bestKills: nonnegativeNumber(value.bestKills, fallback.bestKills, true),
    totalRuns: nonnegativeNumber(value.totalRuns, fallback.totalRuns, true),
    discoveredAbilities: validUniqueValues(
      value.discoveredAbilities,
      AbilityIdSchema.safeParse.bind(AbilityIdSchema),
      fallback.discoveredAbilities,
    ),
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt.length > 0
      ? value.updatedAt
      : fallback.updatedAt,
  };
  const parsed = ProfileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function migrateSettings(value: unknown): Settings | null {
  if (!isRecord(value)) return null;
  const fallback = defaultSettings();
  const candidate = {
    id: 'main',
    locale: value.locale === 'ko' || value.locale === 'en' ? value.locale : fallback.locale,
    soundEnabled: typeof value.soundEnabled === 'boolean'
      ? value.soundEnabled
      : fallback.soundEnabled,
    screenShake: typeof value.screenShake === 'boolean'
      ? value.screenShake
      : fallback.screenShake,
    damageNumbers: typeof value.damageNumbers === 'boolean'
      ? value.damageNumbers
      : fallback.damageNumbers,
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt.length > 0
      ? value.updatedAt
      : fallback.updatedAt,
  };
  const parsed = SettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonnegativeNumber(value: unknown, fallback: number, integer: boolean): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return integer ? Math.floor(value) : value;
}

function validUniqueValues<T>(
  value: unknown,
  parse: (entry: unknown) => { success: boolean; data?: T },
  fallback: T[],
): T[] {
  if (!Array.isArray(value)) return [...fallback];
  const valid: T[] = [];
  for (const entry of value) {
    const parsed = parse(entry);
    if (parsed.success && parsed.data !== undefined && !valid.includes(parsed.data)) {
      valid.push(parsed.data);
    }
  }
  return valid;
}
