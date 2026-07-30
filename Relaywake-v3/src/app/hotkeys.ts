import type { AppScreen } from './screens';

export type GameplayHotkey =
  | { type: 'togglePause' }
  | { type: 'selectUpgrade'; index: number };

interface KeyboardEventLike {
  readonly code: string;
  readonly key: string;
  readonly repeat: boolean;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly target: EventTarget | null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function resolveGameplayHotkey(event: KeyboardEventLike, screen: AppScreen): GameplayHotkey | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return null;

  if (screen === 'levelUp') {
    const index = ['1', '2', '3'].indexOf(event.key);
    return index >= 0 ? { type: 'selectUpgrade', index } : null;
  }

  if (screen !== 'playing' && screen !== 'paused') return null;
  if (event.code === 'KeyP' || event.code === 'Escape') return { type: 'togglePause' };
  return null;
}
