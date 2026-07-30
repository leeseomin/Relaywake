<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { StartRunOptions } from '../game/core/types';
import { gameController } from '../game/GameController';

const props = defineProps<{ options: StartRunOptions }>();
const container = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!container.value) throw new Error('Game container was not mounted.');
  gameController.mount(container.value, props.options);
});

onBeforeUnmount(() => gameController.destroy());
</script>

<template>
  <div ref="container" class="game-viewport" data-testid="game-viewport"></div>
</template>
