import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { readSettings, resetDatabase, writeSettings } from '../persistence/db';
import {
  defaultSettings,
  SettingsSchema,
  type Profile,
  type Settings,
} from '../persistence/schemas';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(defaultSettings());
  const hydrated = ref(false);
  const locale = computed(() => settings.value.locale);
  let persistenceQueue = Promise.resolve();

  async function hydrate(): Promise<void> {
    if (hydrated.value) return;
    settings.value = (await readSettings()) ?? defaultSettings();
    hydrated.value = true;
  }

  function enqueuePersistence<T>(operation: () => Promise<T>): Promise<T> {
    const pending = persistenceQueue.then(operation);
    persistenceQueue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  function patch(values: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<void> {
    return enqueuePersistence(async () => {
      const previous = settings.value;
      const next = SettingsSchema.parse({
        ...previous,
        ...values,
        updatedAt: new Date().toISOString(),
      });
      try {
        await writeSettings(next);
        settings.value = next;
      } catch (error) {
        // Replacing the object also restores controlled form elements changed by the browser.
        settings.value = SettingsSchema.parse(previous);
        throw error;
      }
    });
  }

  function resetAllPersistence(): Promise<{ profile: Profile; settings: Settings }> {
    return enqueuePersistence(async () => {
      const reset = await resetDatabase();
      settings.value = reset.settings;
      hydrated.value = true;
      return reset;
    });
  }

  return { settings, hydrated, locale, hydrate, patch, resetAllPersistence };
});
