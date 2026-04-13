import { describe, it, expect } from 'vitest';
import { parsePath, pathLength, pointAtProgress } from './path-sample.js';

describe('parsePath', () => {
  it('parses M L commands', () => {
    const segs = parsePath('M 0 0 L 100 0');
    expect(segs).toHaveLength(2);
    expect(segs[0].type).toBe('M');
    expect(segs[1].type).toBe('L');
  });

  it('parses cubic bezier', () => {
    const segs = parsePath('M 0 0 C 25 50 75 50 100 0');
    expect(segs).toHaveLength(2);
    expect(segs[1].type).toBe('C');
  });

  it('parses Z close path', () => {
    const segs = parsePath('M 0 0 L 100 0 L 100 100 Z');
    const types = segs.map((s) => s.type);
    expect(types).toContain('Z');
  });
});

describe('pathLength', () => {
  it('returns 100 for horizontal line M 0 0 L 100 0', () => {
    const segs = parsePath('M 0 0 L 100 0');
    expect(pathLength(segs)).toBeCloseTo(100, 5);
  });

  it('returns correct length for triangle with Z', () => {
    // Right triangle: (0,0)→(100,0)→(100,100)→Z back to (0,0)
    // Legs: 100 + 100 + hypotenuse ~141.42
    const segs = parsePath('M 0 0 L 100 0 L 100 100 Z');
    const len = pathLength(segs);
    expect(len).toBeCloseTo(100 + 100 + Math.sqrt(20000), 1);
  });

  it('returns positive length for cubic bezier', () => {
    const segs = parsePath('M 0 0 C 50 100 50 100 100 0');
    expect(pathLength(segs)).toBeGreaterThan(100);
  });
});

describe('pointAtProgress', () => {
  it('returns start at progress 0', () => {
    const segs = parsePath('M 0 0 L 100 0');
    const pt = pointAtProgress(segs, 0);
    expect(pt.x).toBeCloseTo(0, 5);
    expect(pt.y).toBeCloseTo(0, 5);
  });

  it('returns midpoint at progress 0.5', () => {
    const segs = parsePath('M 0 0 L 100 0');
    const pt = pointAtProgress(segs, 0.5);
    expect(pt.x).toBeCloseTo(50, 5);
    expect(pt.y).toBeCloseTo(0, 5);
  });

  it('returns end at progress 1', () => {
    const segs = parsePath('M 0 0 L 100 0');
    const pt = pointAtProgress(segs, 1);
    expect(pt.x).toBeCloseTo(100, 5);
    expect(pt.y).toBeCloseTo(0, 5);
  });

  it('works with cubic bezier at midpoint', () => {
    const segs = parsePath('M 0 0 C 0 100 100 100 100 0');
    const pt = pointAtProgress(segs, 0.5);
    // Midpoint of symmetric cubic: x≈50, y≈75
    expect(pt.x).toBeCloseTo(50, 0);
    expect(pt.y).toBeCloseTo(75, 0);
  });

  it('clamps progress to [0, 1]', () => {
    const segs = parsePath('M 0 0 L 100 0');
    const ptNeg = pointAtProgress(segs, -1);
    expect(ptNeg.x).toBeCloseTo(0, 5);
    const ptOver = pointAtProgress(segs, 2);
    expect(ptOver.x).toBeCloseTo(100, 5);
  });
});
