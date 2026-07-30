import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { readProfile, writeRunAndProfile } from '../persistence/db';
import { defaultProfile } from '../persistence/schemas';
import type { RunSummary } from '../game/core/types';
import { useSettingsStore } from './settings';

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(defaultProfile());
  const hydrated = ref(false);
  const coins = computed(() => profile.value.coins);
  let recordQueue = Promise.resolve();

  async function hydrate(): Promise<void> {
    if (hydrated.value) return;
    profile.value = (await readProfile()) ?? defaultProfile();
    hydrated.value = true;
  }

  function recordRun(summary: RunSummary): Promise<void> {
    const operation = recordQueue.then(async () => {
      const result = await writeRunAndProfile(summary, profile.value);
      profile.value = result.profile;
    });
    recordQueue = operation.catch(() => undefined);
    return operation;
  }

  function reset(): Promise<void> {
    const operation = recordQueue.then(async () => {
      const reset = await useSettingsStore().resetAllPersistence();
      profile.value = reset.profile;
      hydrated.value = true;
    });
    recordQueue = operation.catch(() => undefined);
    return operation;
  }

  return { profile, hydrated, coins, hydrate, recordRun, reset };
});
