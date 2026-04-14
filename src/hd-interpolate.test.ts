import { describe, it, expect } from 'vitest';
import { hdLerp, hdInterpolateKeyframes } from './hd-interpolate.js';
import type { HDKeyframe } from './hd-types.js';

describe('hdLerp', () => {
  it('interpolates between two numbers', () => {
    expect(hdLerp(0, 10, 0)).toBe(0);
    expect(hdLerp(0, 10, 0.5)).toBe(5);
    expect(hdLerp(0, 10, 1)).toBe(10);
  });

  it('handles negative values', () => {
    expect(hdLerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('hdInterpolateKeyframes', () => {
  it('throws on empty keyframes', () => {
    expect(() => hdInterpolateKeyframes([], 0)).toThrow('Track has no keyframes');
  });

  it('holds first value before first keyframe', () => {
    const kfs: HDKeyframe[] = [
      { frame: 10, value: 100 },
      { frame: 20, value: 200 },
    ];
    expect(hdInterpolateKeyframes(kfs, 0)).toBe(100);
    expect(hdInterpolateKeyframes(kfs, 5)).toBe(100);
  });

  it('holds last value after last keyframe', () => {
    const kfs: HDKeyframe[] = [
      { frame: 0, value: 0 },
      { frame: 10, value: 100 },
    ];
    expect(hdInterpolateKeyframes(kfs, 15)).toBe(100);
    expect(hdInterpolateKeyframes(kfs, 100)).toBe(100);
  });

  it('interpolates linearly between keyframes', () => {
    const kfs: HDKeyframe[] = [
      { frame: 0, value: 0, easing: 'linear' },
      { frame: 10, value: 100 },
    ];
    expect(hdInterpolateKeyframes(kfs, 5)).toBe(50);
  });

  it('applies easing from source keyframe', () => {
    const kfs: HDKeyframe[] = [
      { frame: 0, value: 0, easing: 'ease-in' },
      { frame: 10, value: 100 },
    ];
    // ease-in is quadratic: t*t, so at t=0.5 → 0.25
    const result = hdInterpolateKeyframes(kfs, 5);
    expect(result).toBe(25);
  });

  it('handles multiple keyframes', () => {
    const kfs: HDKeyframe[] = [
      { frame: 0, value: 0, easing: 'linear' },
      { frame: 10, value: 100, easing: 'linear' },
      { frame: 20, value: 50 },
    ];
    expect(hdInterpolateKeyframes(kfs, 5)).toBe(50);
    expect(hdInterpolateKeyframes(kfs, 15)).toBe(75);
  });

  it('handles cubic bezier easing', () => {
    const kfs: HDKeyframe[] = [
      { frame: 0, value: 0, easing: { x1: 0, y1: 0, x2: 1, y2: 1 } }, // linear bezier
      { frame: 10, value: 100 },
    ];
    const result = hdInterpolateKeyframes(kfs, 5);
    expect(result).toBeCloseTo(50, 0);
  });
});
