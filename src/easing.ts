import type { EasingName } from './animation-types.js';

export type EasingFn = (t: number) => number;

const linear: EasingFn = (t) => t;
const easeIn: EasingFn = (t) => t * t;
const easeOut: EasingFn = (t) => t * (2 - t);
const easeInOut: EasingFn = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeInCubic: EasingFn = (t) => t * t * t;
const easeOutCubic: EasingFn = (t) => (--t) * t * t + 1;
const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const easings: Record<EasingName, EasingFn> = {
  linear,
  'ease-in': easeIn,
  'ease-out': easeOut,
  'ease-in-out': easeInOut,
  'ease-in-cubic': easeInCubic,
  'ease-out-cubic': easeOutCubic,
  'ease-in-out-cubic': easeInOutCubic,
};

export function getEasing(name: EasingName = 'linear'): EasingFn {
  return easings[name];
}
