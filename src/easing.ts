import type { EasingName, CubicBezier } from './animation-types.js';

export type EasingFn = (t: number) => number;

const linear: EasingFn = (t) => t;
const easeIn: EasingFn = (t) => t * t;
const easeOut: EasingFn = (t) => t * (2 - t);
const easeInOut: EasingFn = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeInCubic: EasingFn = (t) => t * t * t;
const easeOutCubic: EasingFn = (t) => (--t) * t * t + 1;
const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// ── New easing functions ──

const bounce: EasingFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

const elastic: EasingFn = (t) => {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
};

const back: EasingFn = (t) => {
  const s = 1.70158;
  return t * t * ((s + 1) * t - s);
};

const easeInExpo: EasingFn = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));
const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const stepStart: EasingFn = (_t) => 1;
const stepEnd: EasingFn = (t) => (t >= 1 ? 1 : 0);

const easings: Record<EasingName, EasingFn> = {
  linear,
  'ease-in': easeIn,
  'ease-out': easeOut,
  'ease-in-out': easeInOut,
  'ease-in-cubic': easeInCubic,
  'ease-out-cubic': easeOutCubic,
  'ease-in-out-cubic': easeInOutCubic,
  bounce,
  elastic,
  back,
  'ease-in-expo': easeInExpo,
  'ease-out-expo': easeOutExpo,
  'step-start': stepStart,
  'step-end': stepEnd,
};

export function getEasing(name: EasingName = 'linear'): EasingFn {
  return easings[name];
}

// ── Cubic Bezier ──

export function bezierEasing(x1: number, y1: number, x2: number, y2: number): EasingFn {
  // Newton-Raphson method to find t for a given x
  const EPSILON = 1e-6;
  const sampleX = (t: number) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const sampleY = (t: number) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  const sampleDX = (t: number) => 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson iterations
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleX(t) - x;
      if (Math.abs(currentX) < EPSILON) return sampleY(t);
      const dx = sampleDX(t);
      if (Math.abs(dx) < EPSILON) break;
      t -= currentX / dx;
    }

    // Bisection fallback
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const currentX = sampleX(t);
      if (Math.abs(currentX - x) < EPSILON) return sampleY(t);
      if (x > currentX) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

export function resolveEasing(easing?: EasingName | CubicBezier): EasingFn {
  if (!easing) return linear;
  if (typeof easing === 'string') return getEasing(easing);
  return bezierEasing(easing.x1, easing.y1, easing.x2, easing.y2);
}
