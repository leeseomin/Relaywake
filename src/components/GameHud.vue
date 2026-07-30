<script setup lang="ts">
import { computed } from 'vue';
import type { HudSnapshot } from '../game/core/types';
import { formatClock } from '../game/core/math';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ hud: HudSnapshot; locale: Locale; interactive: boolean }>();
const emit = defineEmits<{ pause: [] }>();
const hpRatio = computed(() => Math.max(0, Math.min(1, props.hud.hp / Math.max(1, props.hud.maxHp))));
const xpRatio = computed(() => Math.max(0, Math.min(1, props.hud.xp / Math.max(1, props.hud.xpRequired))));
const lowHealth = computed(() => hpRatio.value <= 0.3);
const criticalTime = computed(() => props.hud.remainingSeconds <= 60);
const bossRatio = computed(() => {
  if (props.hud.bossHp === null || props.hud.bossMaxHp === null) return 0;
  return Math.max(0, Math.min(1, props.hud.bossHp / Math.max(1, props.hud.bossMaxHp)));
});
</script>

<template>
  <header class="game-hud" data-testid="game-hud">
    <div class="hud-left">
      <div class="hud-character" :class="{ 'low-health': lowHealth }">
        <span class="hud-level">LV {{ props.hud.level }}</span>
        <div class="hud-bars">
          <div
            class="bar health-bar"
            role="progressbar"
            :aria-label="t(props.locale, 'health')"
            :aria-valuenow="Math.ceil(props.hud.hp)"
            aria-valuemin="0"
            :aria-valuemax="props.hud.maxHp"
          ><i :style="{ transform: `scaleX(${hpRatio})` }"></i></div>
          <div
            class="bar xp-bar"
            role="progressbar"
            :aria-label="t(props.locale, 'experience')"
            :aria-valuenow="props.hud.xp"
            aria-valuemin="0"
            :aria-valuemax="props.hud.xpRequired"
          ><i :style="{ transform: `scaleX(${xpRatio})` }"></i></div>
        </div>
        <span class="hud-hp">{{ Math.ceil(props.hud.hp) }} / {{ props.hud.maxHp }}</span>
        <span v-if="lowHealth" class="danger-chip" aria-live="polite">{{ t(props.locale, 'danger') }}</span>
      </div>
      <div class="ability-rack" :aria-label="t(props.locale, 'abilities')">
        <div v-for="ability in props.hud.abilities" :key="ability.id" class="ability-chip">
          <img :src="ability.iconUrl" alt="" />
          <b>{{ ability.level }}</b>
        </div>
      </div>
    </div>

    <div class="hud-center" :class="{ critical: criticalTime }">
      <strong>{{ formatClock(props.hud.remainingSeconds) }}</strong>
      <small>{{ t(props.locale, 'time') }}</small>
    </div>

    <div class="hud-right">
      <div class="metric"><small>{{ t(props.locale, 'kills') }}</small><strong>{{ props.hud.kills }}</strong></div>
      <div class="metric"><small>{{ t(props.locale, 'coins') }}</small><strong>◆ {{ props.hud.coins }}</strong></div>
      <button
        class="hud-pause"
        type="button"
        :aria-label="t(props.locale, 'pause')"
        :title="`${t(props.locale, 'pause')} (P / Esc)`"
        :disabled="!props.interactive"
        @click="emit('pause')"
      >Ⅱ</button>
    </div>
  </header>

  <div v-if="props.hud.bossHp !== null" class="boss-hud">
    <span>BOSS SIGNAL</span>
    <div
      role="progressbar"
      aria-label="Boss health"
      :aria-valuenow="Math.max(0, Math.ceil(props.hud.bossHp ?? 0))"
      aria-valuemin="0"
      :aria-valuemax="props.hud.bossMaxHp ?? 1"
    ><i :style="{ transform: `scaleX(${bossRatio})` }"></i></div>
    <b>{{ Math.max(0, Math.ceil(props.hud.bossHp ?? 0)) }}</b>
  </div>
</template>
