<script setup lang="ts">
import { ref } from 'vue';
import type { Settings } from '../persistence/schemas';
import { t } from '../game/data/localization';

const props = defineProps<{ settings: Settings }>();
const emit = defineEmits<{
  patch: [values: Partial<Omit<Settings, 'id' | 'updatedAt'>>];
  reset: [];
  back: [];
}>();
const confirmingReset = ref(false);

function confirmReset(): void {
  emit('reset');
  confirmingReset.value = false;
}
</script>

<template>
  <section class="settings-screen">
    <header class="settings-header">
      <div>
        <p class="panel-kicker">SYSTEM / LOCAL PROFILE</p>
        <h1>{{ t(props.settings.locale, 'settings') }}</h1>
      </div>
      <button class="icon-button" type="button" :aria-label="t(props.settings.locale, 'back')" @click="emit('back')">←</button>
    </header>

    <div class="settings-card">
      <label class="setting-row">
        <span><strong>{{ t(props.settings.locale, 'sound') }}</strong><small>Web Audio synthesized feedback</small></span>
        <input
          type="checkbox"
          :checked="props.settings.soundEnabled"
          @click.prevent="emit('patch', { soundEnabled: !props.settings.soundEnabled })"
        />
      </label>
      <label class="setting-row">
        <span><strong>{{ t(props.settings.locale, 'screenShake') }}</strong><small>Camera impact feedback</small></span>
        <input
          type="checkbox"
          :checked="props.settings.screenShake"
          @click.prevent="emit('patch', { screenShake: !props.settings.screenShake })"
        />
      </label>
      <label class="setting-row">
        <span><strong>{{ t(props.settings.locale, 'damageNumbers') }}</strong><small>Floating combat text</small></span>
        <input
          type="checkbox"
          :checked="props.settings.damageNumbers"
          @click.prevent="emit('patch', { damageNumbers: !props.settings.damageNumbers })"
        />
      </label>
      <div class="setting-row">
        <span><strong>{{ t(props.settings.locale, 'locale') }}</strong><small>UI and upgrade text</small></span>
        <div class="segmented-control" role="group" :aria-label="t(props.settings.locale, 'locale')">
          <button type="button" :class="{ active: props.settings.locale === 'ko' }" @click="emit('patch', { locale: 'ko' })">한국어</button>
          <button type="button" :class="{ active: props.settings.locale === 'en' }" @click="emit('patch', { locale: 'en' })">EN</button>
        </div>
      </div>
    </div>

    <div class="settings-danger">
      <div>
        <strong>IndexedDB / Dexie</strong>
        <p v-if="!confirmingReset">Runs, preferences and progression are stored only in this browser.</p>
        <p v-else class="danger-copy" role="alert">{{ t(props.settings.locale, 'resetWarning') }}</p>
      </div>
      <button v-if="!confirmingReset" type="button" @click="confirmingReset = true">
        {{ t(props.settings.locale, 'resetProfile') }}
      </button>
      <div v-else class="danger-actions">
        <button type="button" @click="confirmingReset = false">{{ t(props.settings.locale, 'cancel') }}</button>
        <button class="confirm-danger" type="button" @click="confirmReset">{{ t(props.settings.locale, 'confirmReset') }}</button>
      </div>
    </div>

    <button class="primary-action settings-back" type="button" @click="emit('back')">{{ t(props.settings.locale, 'back') }}</button>
  </section>
</template>
