<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ locale: Locale }>();
const emit = defineEmits<{ resume: []; quit: [] }>();
const confirmingQuit = ref(false);
const cancelButton = ref<HTMLButtonElement | null>(null);

async function requestQuit(): Promise<void> {
  confirmingQuit.value = true;
  await nextTick();
  cancelButton.value?.focus();
}

function cancelQuit(): void {
  confirmingQuit.value = false;
}

function handleDialogKeydown(event: KeyboardEvent): void {
  if (event.repeat || (event.code !== 'Escape' && event.code !== 'KeyP')) return;
  event.preventDefault();
  event.stopPropagation();
  if (confirmingQuit.value) cancelQuit();
  else emit('resume');
}
</script>

<template>
  <div class="modal-backdrop" data-testid="pause-dialog">
    <section
      class="compact-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      @keydown="handleDialogKeydown"
    >
      <p class="dialog-code">SYSTEM / HOLD</p>
      <h2 id="pause-title">{{ t(props.locale, 'pause') }}</h2>

      <template v-if="!confirmingQuit">
        <p class="pause-hint">{{ t(props.locale, 'pauseHint') }}</p>
        <button class="primary-action" type="button" autofocus @click="emit('resume')">
          {{ t(props.locale, 'resume') }}
        </button>
        <button class="secondary-action" type="button" @click="requestQuit">
          {{ t(props.locale, 'quit') }}
        </button>
      </template>

      <div v-else class="quit-confirmation" role="alert">
        <p>{{ t(props.locale, 'quitWarning') }}</p>
        <div class="dialog-actions equal-actions">
          <button ref="cancelButton" class="secondary-action" type="button" @click="cancelQuit">
            {{ t(props.locale, 'cancel') }}
          </button>
          <button class="danger-action" type="button" @click="emit('quit')">
            {{ t(props.locale, 'confirmQuit') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
