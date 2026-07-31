export interface PresentationPausable {
  pause: () => void;
  resume: () => void;
}

export function syncPresentationPause(
  paused: boolean,
  targets: readonly PresentationPausable[],
): void {
  for (const target of targets) {
    if (paused) target.pause();
    else target.resume();
  }
}
