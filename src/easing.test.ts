import { describe, it, expect } from 'vitest';
import { getEasing, bezierEasing, resolveEasing } from './easing.js';

describe('easing functions', () => {
  const names = [
    'linear',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'ease-in-cubic',
    'ease-out-cubic',
    'ease-in-out-cubic',
    'bounce',
    'elastic',
    'back',
    'ease-in-expo',
    'ease-out-expo',
    'step-start',
    'step-end',
  ] as const;

  for (const name of names) {
    describe(name, () => {
      const fn = getEasing(name);

      if (name !== 'step-start') {
        it('returns 0 at t=0', () => {
          expect(fn(0)).toBeCloseTo(0, 5);
        });
      }

      if (name !== 'step-end') {
        it('returns 1 at t=1', () => {
          expect(fn(1)).toBeCloseTo(1, 5);
        });
      }

      if (!['elastic', 'back'].includes(name)) {
        it('returns values between 0 and 1 for t in (0,1)', () => {
          for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
            const v = fn(t);
            expect(v).toBeGreaterThanOrEqual(-0.1);
            expect(v).toBeLessThanOrEqual(1.1);
          }
        });
      }
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

  it('step-start always returns 1 (except t=0 boundary)', () => {
    const fn = getEasing('step-start');
    expect(fn(0.5)).toBe(1);
    expect(fn(0.01)).toBe(1);
  });

  it('step-end returns 0 until t=1', () => {
    const fn = getEasing('step-end');
    expect(fn(0.5)).toBe(0);
    expect(fn(0.99)).toBe(0);
    expect(fn(1)).toBe(1);
  });
});

describe('bezierEasing', () => {
  it('linear bezier (0,0,1,1) approximates identity', () => {
    const fn = bezierEasing(0, 0, 1, 1);
    expect(fn(0)).toBeCloseTo(0, 2);
    expect(fn(0.5)).toBeCloseTo(0.5, 2);
    expect(fn(1)).toBeCloseTo(1, 2);
  });

  it('ease equivalent (0.25, 0.1, 0.25, 1.0)', () => {
    const fn = bezierEasing(0.25, 0.1, 0.25, 1.0);
    expect(fn(0)).toBeCloseTo(0, 2);
    expect(fn(1)).toBeCloseTo(1, 2);
    // Should start slow
    expect(fn(0.1)).toBeLessThan(0.1);
  });
});

describe('resolveEasing', () => {
  it('resolves named easing', () => {
    const fn = resolveEasing('bounce');
    expect(fn(0)).toBeCloseTo(0, 5);
    expect(fn(1)).toBeCloseTo(1, 5);
  });

  it('resolves cubic-bezier object', () => {
    const fn = resolveEasing({ x1: 0.42, y1: 0, x2: 0.58, y2: 1 });
    expect(fn(0)).toBeCloseTo(0, 2);
    expect(fn(1)).toBeCloseTo(1, 2);
  });

  it('defaults to linear when undefined', () => {
    const fn = resolveEasing(undefined);
    expect(fn(0.5)).toBeCloseTo(0.5, 10);
  });
});
