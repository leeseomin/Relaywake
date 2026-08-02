<script setup lang="ts">
import type { AbilityChoiceView } from '../game/core/types';
import type { AbilityId } from '../game/data/schemas';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ choices: AbilityChoiceView[]; locale: Locale }>();
const emit = defineEmits<{ select: [id: AbilityId] }>();
</script>

<template>
  <div class="modal-backdrop" data-testid="level-up-dialog">
    <section
      class="level-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="t(props.locale, 'levelUp')"
    >
      <header>
        <p>FIELD ADAPTATION</p>
        <h2>{{ t(props.locale, 'levelUp') }}</h2>
        <span>{{ t(props.locale, 'chooseUpgrade') }}</span>
        <small class="level-shortcut">{{ t(props.locale, 'keyboardSelect') }}</small>
      </header>
      <div class="upgrade-grid">
        <button
          v-for="(choice, index) in props.choices"
          :key="choice.id"
          class="upgrade-card"
          type="button"
          :autofocus="index === 0"
          :aria-keyshortcuts="String(index + 1)"
          :data-testid="`upgrade-${choice.id}`"
          @click="emit('select', choice.id)"
        >
          <span class="upgrade-index">0{{ index + 1 }}</span>
          <span
            class="upgrade-icon"
            :class="{ 'gravity-pulse-upgrade-icon': choice.id === 'gravityPulse' }"
          >
            <span v-if="choice.id === 'gravityPulse'" class="gravity-pulse-glyph" aria-hidden="true">
              <span class="gravity-pulse-ring gravity-pulse-ring-outer"></span>
              <span class="gravity-pulse-ring gravity-pulse-ring-middle"></span>
              <span class="gravity-pulse-ring gravity-pulse-ring-inner"></span>
              <span class="gravity-pulse-core"></span>
            </span>
            <img v-else :src="choice.iconUrl" alt="" />
          </span>
          <span class="upgrade-type">{{ t(props.locale, choice.category === 'active' ? 'activeAbility' : 'passiveAbility') }}</span>
          <strong>{{ choice.name }}</strong>
          <span class="upgrade-level">LV {{ choice.level }} → {{ choice.nextLevel }}</span>
          <p>{{ choice.description }}</p>
          <i>{{ index + 1 }} · {{ t(props.locale, 'select') }} →</i>
        </button>
      </div>
    </section>
  </div>
</template>
