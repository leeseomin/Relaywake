import type { StartRunOptions } from './core/types';

let pendingRunOptions: StartRunOptions | null = null;

export function setPendingRunOptions(options: StartRunOptions): void {
  pendingRunOptions = options;
}

export function clearPendingRunOptions(): void {
  pendingRunOptions = null;
}

export function consumePendingRunOptions(): StartRunOptions {
  if (!pendingRunOptions) throw new Error('No pending run options were provided.');
  const options = pendingRunOptions;
  pendingRunOptions = null;
  return options;
}
