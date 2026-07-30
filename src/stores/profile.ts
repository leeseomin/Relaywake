import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { readProfile, resetDatabase, writeProfile, writeRun } from '../persistence/db';
import { defaultProfile, ProfileSchema } from '../persistence/schemas';
import type { RunSummary } from '../game/core/types';

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(defaultProfile());
  const hydrated = ref(false);
  const coins = computed(() => profile.value.coins);

  async function hydrate(): Promise<void> {
    if (hydrated.value) return;
    profile.value = (await readProfile()) ?? defaultProfile();
    hydrated.value = true;
  }

  async function recordRun(summary: RunSummary): Promise<void> {
    await writeRun(summary);
    const discovered = new Set(profile.value.discoveredAbilities);
    const next = ProfileSchema.parse({
      ...profile.value,
      coins: profile.value.coins + summary.coins,
      bestTimeSeconds: Math.max(profile.value.bestTimeSeconds, summary.elapsedSeconds),
      bestKills: Math.max(profile.value.bestKills, summary.kills),
      totalRuns: profile.value.totalRuns + 1,
      discoveredAbilities: [...discovered],
      updatedAt: new Date().toISOString(),
    });
    profile.value = next;
    await writeProfile(next);
  }

  async function reset(): Promise<void> {
    await resetDatabase();
    profile.value = defaultProfile();
    hydrated.value = true;
    await writeProfile(profile.value);
  }

  return { profile, hydrated, coins, hydrate, recordRun, reset };
});
