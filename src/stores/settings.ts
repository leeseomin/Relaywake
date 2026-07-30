import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { readSettings, writeSettings } from '../persistence/db';
import { defaultSettings, SettingsSchema, type Settings } from '../persistence/schemas';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(defaultSettings());
  const hydrated = ref(false);
  const locale = computed(() => settings.value.locale);

  async function hydrate(): Promise<void> {
    if (hydrated.value) return;
    settings.value = (await readSettings()) ?? defaultSettings();
    hydrated.value = true;
  }

  async function patch(values: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<void> {
    settings.value = SettingsSchema.parse({
      ...settings.value,
      ...values,
      updatedAt: new Date().toISOString(),
    });
    await writeSettings(settings.value);
  }

  async function reset(): Promise<void> {
    settings.value = defaultSettings();
    hydrated.value = true;
    await writeSettings(settings.value);
  }

  return { settings, hydrated, locale, hydrate, patch, reset };
});
