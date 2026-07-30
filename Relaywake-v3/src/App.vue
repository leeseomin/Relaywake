<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gameEvents } from './app/gameEvents';
import { resolveGameplayHotkey } from './app/hotkeys';
import GameHud from './components/GameHud.vue';
import GameOverDialog from './components/GameOverDialog.vue';
import GameViewport from './components/GameViewport.vue';
import LevelUpDialog from './components/LevelUpDialog.vue';
import MainMenu from './components/MainMenu.vue';
import PauseDialog from './components/PauseDialog.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import TouchControls from './components/TouchControls.vue';
import { gameController } from './game/GameController';
import type { RunSummary, StartRunOptions } from './game/core/types';
import type { AbilityId } from './game/data/schemas';
import type { CharacterId } from './game/data/characters';
import { t } from './game/data/localization';
import { useProfileStore } from './stores/profile';
import { useSessionStore } from './stores/session';
import { useSettingsStore } from './stores/settings';

const profileStore = useProfileStore();
const settingsStore = useSettingsStore();
const session = useSessionStore();
const currentOptions = ref<StartRunOptions | null>(null);
const runKey = ref(0);
const booting = ref(true);
const toastTimer = ref<number | null>(null);
const e2e = new URLSearchParams(window.location.search).get('e2e') === '1';
const locale = computed(() => settingsStore.settings.locale);
const isGameplayVisible = computed(() => ['playing', 'levelUp', 'paused', 'gameOver'].includes(session.screen));
const cleanups: Array<() => void> = [];

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown);
  let storageUnavailable = false;
  try {
    await Promise.all([profileStore.hydrate(), settingsStore.hydrate()]);
  } catch (error) {
    storageUnavailable = true;
    console.error('Local profile storage could not be initialized.', error);
  }
  booting.value = false;

  cleanups.push(
    gameEvents.on('ready', () => {
      session.gameReady = true;
      gameController.syncTouchVector();
      if (e2e) gameController.exposeTestBridge();
      else showToast(t(locale.value, 'runHint'));
    }),
    gameEvents.on('hud', (snapshot) => session.setHud(snapshot)),
    gameEvents.on('levelUp', (choices) => session.showLevelUp(choices)),
    gameEvents.on('paused', (paused) => session.setPaused(paused)),
    gameEvents.on('runEnded', (summary) => void handleRunEnded(summary)),
    gameEvents.on('toast', showToast),
  );

  if (storageUnavailable) showToast(t(locale.value, 'storageUnavailable'));
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  for (const cleanup of cleanups) cleanup();
  gameController.destroy();
  if (toastTimer.value !== null) window.clearTimeout(toastTimer.value);
});

function buildRunOptions(characterId: CharacterId): StartRunOptions {
  return {
    characterId,
    seed: e2e ? 20260729 : Date.now(),
    e2e,
    preferences: {
      locale: settingsStore.settings.locale,
      soundEnabled: settingsStore.settings.soundEnabled,
      screenShake: settingsStore.settings.screenShake,
      damageNumbers: settingsStore.settings.damageNumbers,
    },
  };
}

async function startRun(characterId: CharacterId): Promise<void> {
  gameController.destroy();
  session.start(characterId);
  currentOptions.value = buildRunOptions(characterId);
  runKey.value += 1;
  await nextTick();
}

async function restartRun(): Promise<void> {
  await startRun(session.selectedCharacter);
}

function selectAbility(id: AbilityId): void {
  if (session.screen !== 'levelUp') return;
  gameController.chooseAbility(id);
}

function pauseRun(): void {
  if (session.screen !== 'playing') return;
  gameController.pause();
}

function resumeRun(): void {
  if (session.screen !== 'paused') return;
  gameController.resume();
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  const action = resolveGameplayHotkey(event, session.screen);
  if (!action) return;
  event.preventDefault();

  if (action.type === 'togglePause') {
    if (session.screen === 'playing') pauseRun();
    else resumeRun();
    return;
  }

  const choice = session.choices[action.index];
  if (choice) selectAbility(choice.id);
}

function quitRun(): void {
  gameController.destroy();
  currentOptions.value = null;
  session.toMenu();
}

async function handleRunEnded(summary: RunSummary): Promise<void> {
  session.endRun(summary);
  try {
    await profileStore.recordRun(summary);
  } catch (error) {
    console.error('Run result could not be saved.', error);
    showToast(t(locale.value, 'saveFailed'));
  }
}

async function resetProfile(): Promise<void> {
  try {
    await profileStore.reset();
    showToast(t(locale.value, 'profileReset'));
  } catch (error) {
    console.error('Profile reset failed.', error);
    showToast(t(locale.value, 'saveFailed'));
  }
}

async function patchSettings(
  values: Parameters<typeof settingsStore.patch>[0],
): Promise<void> {
  try {
    await settingsStore.patch(values);
  } catch (error) {
    console.error('Settings could not be saved.', error);
    showToast(t(locale.value, 'saveFailed'));
  }
}

function showToast(message: string): void {
  session.toast = message;
  if (toastTimer.value !== null) window.clearTimeout(toastTimer.value);
  toastTimer.value = window.setTimeout(() => {
    session.toast = '';
    toastTimer.value = null;
  }, 2600);
}
</script>

<template>
  <main class="app-root">
    <div v-if="booting" class="boot-screen" aria-live="polite">
      <div class="boot-mark">C2</div>
      <p>Loading local profile…</p>
    </div>

    <MainMenu
      v-else-if="session.screen === 'menu'"
      :locale="locale"
      :coins="profileStore.coins"
      @start="startRun"
      @settings="session.openSettings"
    />

    <SettingsPanel
      v-else-if="session.screen === 'settings'"
      :settings="settingsStore.settings"
      @patch="patchSettings"
      @reset="resetProfile"
      @back="session.toMenu"
    />

    <section v-else-if="isGameplayVisible" class="game-shell">
      <GameViewport
        v-if="currentOptions"
        :key="runKey"
        :options="currentOptions"
      />
      <div class="screen-vignette" aria-hidden="true"></div>
      <GameHud
        :hud="session.hud"
        :locale="locale"
        :interactive="session.screen === 'playing'"
        @pause="pauseRun"
      />
      <TouchControls
        :disabled="session.screen !== 'playing'"
        :locale="locale"
        @pause="pauseRun"
      />

      <Transition name="overlay">
        <LevelUpDialog
          v-if="session.screen === 'levelUp'"
          :choices="session.choices"
          :locale="locale"
          @select="selectAbility"
        />
      </Transition>

      <Transition name="overlay">
        <PauseDialog
          v-if="session.screen === 'paused'"
          :locale="locale"
          @resume="resumeRun"
          @quit="quitRun"
        />
      </Transition>

      <Transition name="overlay">
        <GameOverDialog
          v-if="session.screen === 'gameOver' && session.summary"
          :summary="session.summary"
          :locale="locale"
          @restart="restartRun"
          @quit="quitRun"
        />
      </Transition>

      <div v-if="!session.gameReady" class="game-loading">
        <div class="spinner"></div>
        <span>Initializing Phaser 4 world…</span>
      </div>
    </section>

    <Transition name="toast">
      <div v-if="session.toast" class="toast-message" role="status">{{ session.toast }}</div>
    </Transition>
  </main>
</template>
