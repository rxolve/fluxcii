import type { HDKeyframe } from './hd-types.js';
import { resolveEasing } from './easing.js';

/**
 * Linearly interpolate between two numbers.
 */
export function hdLerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate a value from a sorted keyframe array at a given frame.
 * Numeric only — no color lerp (HD layers use opacity/scale/rotate/position).
 */
export function hdInterpolateKeyframes(
  keyframes: HDKeyframe[],
  frame: number,
): number {
  if (keyframes.length === 0) throw new Error('Track has no keyframes');

  // Before first keyframe — hold first value
  if (frame <= keyframes[0].frame) return keyframes[0].value;

  // After last keyframe — hold last value
  const last = keyframes[keyframes.length - 1];
  if (frame >= last.frame) return last.value;

  // Find surrounding pair
  let lo = 0;
  for (let i = 1; i < keyframes.length; i++) {
    if (keyframes[i].frame >= frame) {
      lo = i - 1;
      break;
    }
  }
  const hi = lo + 1;
  const kfA = keyframes[lo];
  const kfB = keyframes[hi];

  // Compute progress and apply easing from kfA
  const span = kfB.frame - kfA.frame;
  const raw = span === 0 ? 1 : (frame - kfA.frame) / span;
  const easing = resolveEasing(kfA.easing);
  const t = easing(raw);

  return hdLerp(kfA.value, kfB.value, t);
}
