<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { gameController } from '../game/GameController';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ disabled: boolean; locale: Locale }>();
const emit = defineEmits<{ pause: [] }>();
const stick = ref<HTMLDivElement | null>(null);
const knobX = ref(0);
const knobY = ref(0);
const activePointer = ref<number | null>(null);

function updatePointer(event: PointerEvent): void {
  if (!stick.value || props.disabled) return;
  const rect = stick.value.getBoundingClientRect();
  const radius = Math.max(1, rect.width * 0.34);
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(x, y);
  const scale = length > radius ? radius / length : 1;
  knobX.value = x * scale;
  knobY.value = y * scale;
  gameController.setTouchVector(knobX.value / radius, knobY.value / radius);
}

function resetStick(): void {
  const pointerId = activePointer.value;
  activePointer.value = null;
  knobX.value = 0;
  knobY.value = 0;
  gameController.setTouchVector(0, 0);

  if (pointerId !== null && stick.value?.hasPointerCapture(pointerId)) {
    try {
      stick.value.releasePointerCapture(pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }
  }
}

function pointerDown(event: PointerEvent): void {
  if (props.disabled || activePointer.value !== null || event.button !== 0) return;
  event.preventDefault();
  activePointer.value = event.pointerId;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  updatePointer(event);
}

function pointerMove(event: PointerEvent): void {
  if (activePointer.value !== event.pointerId) return;
  event.preventDefault();
  updatePointer(event);
}

function pointerUp(event: PointerEvent): void {
  if (activePointer.value !== event.pointerId) return;
  resetStick();
}

function handleVisibilityChange(): void {
  if (document.hidden) resetStick();
}

watch(() => props.disabled, (disabled) => {
  if (disabled) resetStick();
});

onMounted(() => {
  window.addEventListener('blur', resetStick);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('blur', resetStick);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  resetStick();
});
</script>

<template>
  <div class="touch-controls" :class="{ disabled: props.disabled }">
    <div
      ref="stick"
      class="touch-stick"
      role="application"
      :aria-label="t(props.locale, 'touchMove')"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
      @lostpointercapture="pointerUp"
      @contextmenu.prevent
    >
      <div class="touch-knob" :style="{ transform: `translate(${knobX}px, ${knobY}px)` }"></div>
    </div>
    <button
      class="touch-pause"
      type="button"
      :aria-label="t(props.locale, 'pause')"
      :disabled="props.disabled"
      @click="emit('pause')"
    >Ⅱ</button>
  </div>
</template>
