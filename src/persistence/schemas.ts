import { z } from 'zod';
import { AbilityIdSchema, CharacterIdSchema } from '../game/data/schemas';
import { locales } from '../game/data/localization';

export const ProfileSchema = z.object({
  id: z.literal('main'),
  coins: z.number().int().nonnegative(),
  unlockedCharacters: z.array(CharacterIdSchema),
  bestTimeSeconds: z.number().nonnegative(),
  bestKills: z.number().int().nonnegative(),
  totalRuns: z.number().int().nonnegative(),
  discoveredAbilities: z.array(AbilityIdSchema),
  updatedAt: z.string(),
});

export const SettingsSchema = z.object({
  id: z.literal('main'),
  locale: z.enum(locales),
  soundEnabled: z.boolean(),
  screenShake: z.boolean(),
  damageNumbers: z.boolean(),
  updatedAt: z.string(),
});

export const RunRowSchema = z.object({
  id: z.string(),
  characterId: CharacterIdSchema,
  victory: z.boolean(),
  elapsedSeconds: z.number().nonnegative(),
  kills: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  coins: z.number().int().nonnegative(),
  damageDealt: z.number().nonnegative(),
  endedAt: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type RunRow = z.infer<typeof RunRowSchema>;

export const defaultProfile = (): Profile => ProfileSchema.parse({
  id: 'main',
  coins: 0,
  unlockedCharacters: ['blue', 'purple', 'white', 'gray', 'fire'],
  bestTimeSeconds: 0,
  bestKills: 0,
  totalRuns: 0,
  discoveredAbilities: [],
  updatedAt: new Date().toISOString(),
});

export const defaultSettings = (): Settings => SettingsSchema.parse({
  id: 'main',
  locale: 'en',
  soundEnabled: true,
  screenShake: true,
  damageNumbers: true,
  updatedAt: new Date().toISOString(),
});
