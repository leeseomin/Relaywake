import { clamp, lerp } from './math';

export interface ScalarKeyframe {
  t: number;
  value: number;
}

export interface VectorKeyframe {
  t: number;
  values: readonly number[];
}

function findSpan<T extends { t: number }>(frames: readonly T[], time: number): readonly [T, T] {
  if (frames.length === 0) throw new Error('At least one keyframe is required.');
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) throw new Error('Invalid keyframe collection.');
  if (time <= first.t) return [first, first];
  if (time >= last.t) return [last, last];

  for (let index = 0; index < frames.length - 1; index += 1) {
    const left = frames[index];
    const right = frames[index + 1];
    if (left && right && time >= left.t && time <= right.t) return [left, right];
  }
  return [last, last];
}

export function sampleScalar(frames: readonly ScalarKeyframe[], time: number): number {
  const [left, right] = findSpan(frames, clamp(time, 0, 1));
  if (left.t === right.t) return left.value;
  const local = (time - left.t) / (right.t - left.t);
  return lerp(left.value, right.value, clamp(local, 0, 1));
}

export function sampleVector(frames: readonly VectorKeyframe[], time: number): number[] {
  const [left, right] = findSpan(frames, clamp(time, 0, 1));
  const length = Math.max(left.values.length, right.values.length);
  if (left.t === right.t) return Array.from({ length }, (_, index) => left.values[index] ?? 0);
  const local = clamp((time - left.t) / (right.t - left.t), 0, 1);
  return Array.from({ length }, (_, index) => lerp(left.values[index] ?? 0, right.values[index] ?? 0, local));
}
