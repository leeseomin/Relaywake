import { describe, expect, it } from 'vitest';
import { resolveGameplayHotkey } from '../../src/app/hotkeys';

const event = (values: Partial<KeyboardEvent> = {}): KeyboardEvent => ({
  code: '',
  key: '',
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  target: null,
  ...values,
} as KeyboardEvent);

describe('gameplay hotkeys', () => {
  it('toggles pause only while a run is actively playing or manually paused', () => {
    expect(resolveGameplayHotkey(event({ code: 'KeyP', key: 'p' }), 'playing')).toEqual({ type: 'togglePause' });
    expect(resolveGameplayHotkey(event({ code: 'Escape', key: 'Escape' }), 'paused')).toEqual({ type: 'togglePause' });
    expect(resolveGameplayHotkey(event({ code: 'KeyP', key: 'p' }), 'levelUp')).toBeNull();
    expect(resolveGameplayHotkey(event({ code: 'Escape', key: 'Escape' }), 'menu')).toBeNull();
  });

  it('ignores key-repeat and modified shortcuts so one press cannot toggle multiple times', () => {
    expect(resolveGameplayHotkey(event({ code: 'KeyP', key: 'p', repeat: true }), 'playing')).toBeNull();
    expect(resolveGameplayHotkey(event({ code: 'KeyP', key: 'p', ctrlKey: true }), 'playing')).toBeNull();
  });

  it('maps number keys to visible level-up choices', () => {
    expect(resolveGameplayHotkey(event({ code: 'Digit1', key: '1' }), 'levelUp')).toEqual({
      type: 'selectUpgrade',
      index: 0,
    });
    expect(resolveGameplayHotkey(event({ code: 'Numpad3', key: '3' }), 'levelUp')).toEqual({
      type: 'selectUpgrade',
      index: 2,
    });
  });
});
