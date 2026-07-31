<script setup lang="ts">
import type { RunSummary } from '../game/core/types';
import { formatClock } from '../game/core/math';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ summary: RunSummary; locale: Locale }>();
const emit = defineEmits<{ restart: []; quit: [] }>();
</script>

<template>
  <div class="modal-backdrop" data-testid="game-over-dialog">
    <section class="result-dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <p class="dialog-code">OPERATION / COMPLETE</p>
      <h2 id="result-title" :class="{ victory: props.summary.victory }">
        {{ props.summary.victory ? t(props.locale, 'victory') : t(props.locale, 'defeat') }}
      </h2>
      <div class="result-grid">
        <div><small>{{ t(props.locale, 'time') }}</small><strong>{{ formatClock(props.summary.elapsedSeconds) }}</strong></div>
        <div><small>{{ t(props.locale, 'kills') }}</small><strong>{{ props.summary.kills }}</strong></div>
        <div><small>{{ t(props.locale, 'level') }}</small><strong>{{ props.summary.level }}</strong></div>
        <div><small>{{ t(props.locale, 'coins') }}</small><strong>◆ {{ props.summary.coins }}</strong></div>
      </div>
      <p class="damage-report">DMG OUTPUT · {{ Math.round(props.summary.damageDealt).toLocaleString() }}</p>
      <div class="dialog-actions">
        <button class="primary-action" type="button" autofocus @click="emit('restart')">{{ t(props.locale, 'restart') }}</button>
        <button class="secondary-action" type="button" @click="emit('quit')">{{ t(props.locale, 'quit') }}</button>
      </div>
    </section>
  </div>
</template>
