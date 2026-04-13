import type { AnimatableProperty, EasingName, Keyframe } from './animation-types.js';
import { getEasing } from './easing.js';

// ── Color helpers ──

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

// ── Lerp functions ──

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(lerpNumber(r1, r2, t), lerpNumber(g1, g2, t), lerpNumber(b1, b2, t));
}

// ── Property type detection ──

const COLOR_PROPERTIES: ReadonlySet<AnimatableProperty> = new Set([
  'style.fill',
  'style.stroke.color',
]);

export function isColorProperty(prop: AnimatableProperty): boolean {
  return COLOR_PROPERTIES.has(prop);
}

// ── Keyframe interpolation ──

export function interpolateKeyframes(
  keyframes: Keyframe[],
  frame: number,
  property: AnimatableProperty,
): number | string {
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
  const easing = getEasing(kfA.easing);
  const t = easing(raw);

  if (isColorProperty(property)) {
    return lerpColor(kfA.value as string, kfB.value as string, t);
  }
  return lerpNumber(kfA.value as number, kfB.value as number, t);
}
