import { describe, it, expect } from 'vitest';
import { lerpNumber, lerpColor, interpolateKeyframes, isColorProperty } from './interpolate.js';
import type { Keyframe, AnimatableProperty } from './animation-types.js';

describe('lerpNumber', () => {
  it('returns a at t=0', () => {
    expect(lerpNumber(10, 20, 0)).toBe(10);
  });

  it('returns b at t=1', () => {
    expect(lerpNumber(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerpNumber(0, 100, 0.5)).toBe(50);
  });
});

describe('lerpColor', () => {
  it('returns first color at t=0', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('returns second color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns midpoint gray at t=0.5', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('interpolates individual channels', () => {
    expect(lerpColor('#ff0000', '#00ff00', 0.5)).toBe('#808000');
  });
});

describe('isColorProperty', () => {
  it('identifies color properties', () => {
    expect(isColorProperty('style.fill')).toBe(true);
    expect(isColorProperty('style.stroke.color')).toBe(true);
  });

  it('rejects numeric properties', () => {
    expect(isColorProperty('cx')).toBe(false);
    expect(isColorProperty('style.opacity')).toBe(false);
  });
});

describe('interpolateKeyframes', () => {
  const numericKfs: Keyframe[] = [
    { frame: 0, value: 0 },
    { frame: 10, value: 100 },
  ];

  it('holds first value before first keyframe', () => {
    expect(interpolateKeyframes(numericKfs, -5, 'cx')).toBe(0);
  });

  it('holds last value after last keyframe', () => {
    expect(interpolateKeyframes(numericKfs, 15, 'cx')).toBe(100);
  });

  it('returns exact value at keyframe', () => {
    expect(interpolateKeyframes(numericKfs, 0, 'cx')).toBe(0);
    expect(interpolateKeyframes(numericKfs, 10, 'cx')).toBe(100);
  });

  it('interpolates linearly at midpoint (default easing)', () => {
    expect(interpolateKeyframes(numericKfs, 5, 'cx')).toBeCloseTo(50, 5);
  });

  it('applies ease-in easing', () => {
    const kfs: Keyframe[] = [
      { frame: 0, value: 0, easing: 'ease-in' },
      { frame: 10, value: 100 },
    ];
    const v = interpolateKeyframes(kfs, 5, 'cx') as number;
    // ease-in at t=0.5 → 0.25 → value 25
    expect(v).toBeLessThan(50);
    expect(v).toBeCloseTo(25, 5);
  });

  it('interpolates colors', () => {
    const kfs: Keyframe[] = [
      { frame: 0, value: '#000000' },
      { frame: 10, value: '#ffffff' },
    ];
    expect(interpolateKeyframes(kfs, 5, 'style.fill')).toBe('#808080');
  });

  it('handles multi-keyframe tracks', () => {
    const kfs: Keyframe[] = [
      { frame: 0, value: 0 },
      { frame: 5, value: 50 },
      { frame: 10, value: 0 },
    ];
    expect(interpolateKeyframes(kfs, 0, 'x')).toBe(0);
    expect(interpolateKeyframes(kfs, 5, 'x')).toBe(50);
    expect(interpolateKeyframes(kfs, 10, 'x')).toBe(0);
    // Midpoints
    expect(interpolateKeyframes(kfs, 2.5, 'x')).toBeCloseTo(25, 5);
    expect(interpolateKeyframes(kfs, 7.5, 'x')).toBeCloseTo(25, 5);
  });

  it('throws for empty keyframes', () => {
    expect(() => interpolateKeyframes([], 0, 'cx')).toThrow('no keyframes');
  });
});
