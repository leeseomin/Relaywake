<script setup lang="ts">
import { computed, ref } from 'vue';
import { assetPath } from '../game/assets';
import { characters, type CharacterId } from '../game/data/characters';
import {
  defaultFieldThemeId,
  fieldThemes,
  type FieldThemeId,
} from '../game/data/fieldThemes';
import { t, type Locale } from '../game/data/localization';

const props = defineProps<{ locale: Locale; coins: number }>();
const emit = defineEmits<{
  start: [characterId: CharacterId, fieldThemeId: FieldThemeId];
  settings: [];
}>();
const selected = ref<CharacterId>('blue');
const selectedFieldTheme = ref<FieldThemeId>(defaultFieldThemeId);
const selectedCharacter = computed(() => characters.find((character) => character.id === selected.value) ?? characters[0]);
const characterSprites: Record<CharacterId, string> = {
  blue: assetPath('character-roseglass'),
  purple: assetPath('character-startail'),
  white: assetPath('character-moonhare'),
  gray: assetPath('character-dunehorn'),
  fire: assetPath('character-fire'),
};
const characterCodes: Record<CharacterId, string> = {
  blue: 'ROSEGLASS',
  purple: 'STARTAIL',
  white: 'MOONHARE',
  gray: 'DUNEHORN',
  fire: 'FIRE',
};
function statWidth(value: number, min: number, max: number): string {
  return `${Math.round(((value - min) / (max - min)) * 60 + 32)}%`;
}
</script>

<template>
  <section class="menu-screen">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">SURVIVE · ADAPT · OUTLAST</p>
        <h1>{{ t(props.locale, 'title') }}</h1>
      </div>
      <div class="hero-actions">
        <button
          class="icon-button menu-settings-button"
          type="button"
          :aria-label="t(props.locale, 'settings')"
          @click="emit('settings')"
        >{{ t(props.locale, 'settings').toLocaleUpperCase(props.locale) }}</button>
        <a
          class="icon-button github-link"
          href="https://github.com/leeseomin/Relaywake"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Relaywake GitHub repository"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.05 0 0 .96-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"
            />
          </svg>
        </a>
      </div>
    </div>

    <section class="operative-panel">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">01 / LOADOUT</p>
          <h2>{{ t(props.locale, 'chooseCharacter') }}</h2>
        </div>
        <div class="coin-balance">
          <span>◆</span>{{ props.coins.toLocaleString() }}<small>{{ t(props.locale, 'coins').toLocaleUpperCase(props.locale) }}</small>
        </div>
      </div>

      <div class="character-layout">
        <div class="loadout-sidebar">
          <div class="character-list" role="radiogroup" :aria-label="t(props.locale, 'chooseCharacter')">
            <button
              v-for="character in characters"
              :key="character.id"
              class="character-card"
              :class="{ selected: selected === character.id, 'fire-master': character.id === 'fire' }"
              :data-testid="`character-${character.id}`"
              type="button"
              role="radio"
              :aria-checked="selected === character.id"
              @click="selected = character.id"
            >
              <span
                class="character-frame"
                :style="{ backgroundImage: `url(${characterSprites[character.id]})` }"
              ></span>
              <span class="character-label">
                <strong>{{ character.name[props.locale] }}</strong>
                <small>{{ character.startingAbility }}</small>
              </span>
              <span class="selection-mark">{{ selected === character.id ? '●' : '○' }}</span>
            </button>
          </div>

          <section class="field-selector">
            <div class="field-selector-heading">
              <p class="detail-code">02 / {{ t(props.locale, 'chooseField') }}</p>
              <span>{{ t(props.locale, 'visualOnly') }}</span>
            </div>
            <div
              class="field-theme-options"
              role="radiogroup"
              :aria-label="t(props.locale, 'chooseField')"
            >
              <button
                v-for="theme in fieldThemes"
                :key="theme.id"
                class="field-theme-card"
                :class="{ selected: selectedFieldTheme === theme.id }"
                :data-testid="`field-theme-${theme.id}`"
                type="button"
                role="radio"
                :aria-checked="selectedFieldTheme === theme.id"
                @click="selectedFieldTheme = theme.id"
              >
                <span
                  class="field-theme-preview"
                  :style="{ backgroundImage: `url(${assetPath(theme.assetKey)})` }"
                  aria-hidden="true"
                ></span>
                <span class="field-theme-copy">
                  <strong>{{ theme.name[props.locale] }}</strong>
                  <small>{{ theme.description[props.locale] }}</small>
                </span>
                <span class="selection-mark">
                  {{ selectedFieldTheme === theme.id ? '●' : '○' }}
                </span>
              </button>
            </div>
          </section>
        </div>

        <article v-if="selectedCharacter" class="character-detail">
          <div class="detail-header">
            <div>
              <p class="detail-code">OPERATIVE / {{ characterCodes[selectedCharacter.id] }}</p>
              <h3>{{ selectedCharacter.name[props.locale] }}</h3>
            </div>
            <span class="ready-chip">READY</span>
          </div>
          <p>{{ selectedCharacter.description[props.locale] }}</p>
          <dl class="stats-grid">
            <div>
              <dt>HP</dt><dd><span :style="{ width: statWidth(selectedCharacter.maxHp, 80, 130) }"></span></dd>
              <b>{{ selectedCharacter.maxHp }}</b>
            </div>
            <div>
              <dt>SPD</dt><dd><span :style="{ width: statWidth(selectedCharacter.moveSpeed, 155, 210) }"></span></dd>
              <b>{{ selectedCharacter.moveSpeed }}</b>
            </div>
            <div>
              <dt>ARM</dt><dd><span :style="{ width: statWidth(selectedCharacter.armor, 0, 3) }"></span></dd>
              <b>{{ selectedCharacter.armor }}</b>
            </div>
            <div>
              <dt>LUCK</dt><dd><span :style="{ width: statWidth(selectedCharacter.luck, 0.8, 1.2) }"></span></dd>
              <b>{{ selectedCharacter.luck.toFixed(2) }}</b>
            </div>
          </dl>

          <button
            class="primary-action start-operation-action"
            type="button"
            data-testid="start-run"
            @click="emit('start', selected, selectedFieldTheme)"
          >
            <span>{{ t(props.locale, 'start') }}</span><span aria-hidden="true">→</span>
          </button>
          <p class="control-note">{{ t(props.locale, 'controls') }}</p>
        </article>
      </div>
    </section>

  </section>
</template>
