import { describe, it, expect } from 'vitest';
import { getEasing } from './easing.js';

describe('easing functions', () => {
  const names = [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'ease-in-cubic',
    'ease-out-cubic',
    'ease-in-out-cubic',
  ] as const;

  for (const name of names) {
    describe(name, () => {
      const fn = getEasing(name);

      it('returns 0 at t=0', () => {
        expect(fn(0)).toBeCloseTo(0, 5);
      });

      it('returns 1 at t=1', () => {
        expect(fn(1)).toBeCloseTo(1, 5);
      });

      it('returns values between 0 and 1 for t in (0,1)', () => {
        for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
          const v = fn(t);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      });
    });
  }

  it('linear is identity', () => {
    const fn = getEasing('linear');
    expect(fn(0.3)).toBeCloseTo(0.3, 10);
    expect(fn(0.7)).toBeCloseTo(0.7, 10);
  });

  it('ease-in starts slow (below linear at t=0.25)', () => {
    const fn = getEasing('ease-in');
    expect(fn(0.25)).toBeLessThan(0.25);
  });

  it('ease-out starts fast (above linear at t=0.25)', () => {
    const fn = getEasing('ease-out');
    expect(fn(0.25)).toBeGreaterThan(0.25);
  });

  it('ease-in-out is symmetric around t=0.5', () => {
    const fn = getEasing('ease-in-out');
    expect(fn(0.5)).toBeCloseTo(0.5, 5);
  });

  it('defaults to linear', () => {
    const fn = getEasing();
    expect(fn(0.42)).toBeCloseTo(0.42, 10);
  });
});
