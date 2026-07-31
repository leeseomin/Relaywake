import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { AbilityChoiceView, HudSnapshot, RunSummary } from '../game/core/types';
import type { CharacterId } from '../game/data/characters';
import type { AppScreen } from '../app/screens';
import { resolvePauseScreen } from './sessionTransitions';

export type { AppScreen } from '../app/screens';

const emptyHud = (): HudSnapshot => ({
  hp: 1,
  maxHp: 1,
  xp: 0,
  xpRequired: 5,
  level: 1,
  elapsedSeconds: 0,
  remainingSeconds: 600,
  kills: 0,
  coins: 0,
  bossId: null,
  bossHp: null,
  bossMaxHp: null,
  bossOffscreen: false,
  bossDirectionRadians: null,
  abilities: [],
});

export const useSessionStore = defineStore('session', () => {
  const screen = ref<AppScreen>('menu');
  const selectedCharacter = ref<CharacterId>('blue');
  const hud = ref(emptyHud());
  const choices = ref<AbilityChoiceView[]>([]);
  const summary = ref<RunSummary | null>(null);
  const gameReady = ref(false);
  const toast = ref('');
  const isInRun = computed(() => !['menu', 'settings'].includes(screen.value));

  function start(characterId: CharacterId): void {
    selectedCharacter.value = characterId;
    hud.value = emptyHud();
    choices.value = [];
    summary.value = null;
    gameReady.value = false;
    toast.value = '';
    screen.value = 'playing';
  }

  function setHud(snapshot: HudSnapshot): void {
    hud.value = snapshot;
  }

  function showLevelUp(nextChoices: AbilityChoiceView[]): void {
    if (summary.value) return;
    choices.value = nextChoices;
    screen.value = 'levelUp';
  }

  function setPaused(paused: boolean): void {
    const previous = screen.value;
    screen.value = resolvePauseScreen(previous, paused, summary.value !== null);
    if (!paused && previous === 'levelUp' && screen.value === 'playing') choices.value = [];
  }

  function endRun(result: RunSummary): void {
    summary.value = result;
    screen.value = 'gameOver';
  }

  function openSettings(): void {
    screen.value = 'settings';
  }

  function toMenu(): void {
    screen.value = 'menu';
    gameReady.value = false;
    choices.value = [];
    summary.value = null;
    toast.value = '';
  }

  return {
    screen, selectedCharacter, hud, choices, summary, gameReady, toast, isInRun,
    start, setHud, showLevelUp, setPaused, endRun, openSettings, toMenu,
  };
});
