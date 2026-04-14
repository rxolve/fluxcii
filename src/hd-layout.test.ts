import { describe, it, expect } from 'vitest';
import { resolvePosition, isSemanticPosition, SEMANTIC_POSITION_NAMES } from './hd-layout.js';

describe('isSemanticPosition', () => {
  it('returns true for valid positions', () => {
    expect(isSemanticPosition('center')).toBe(true);
    expect(isSemanticPosition('top-left')).toBe(true);
    expect(isSemanticPosition('off-right')).toBe(true);
  });

  it('returns false for invalid positions', () => {
    expect(isSemanticPosition('middle')).toBe(false);
    expect(isSemanticPosition('nowhere')).toBe(false);
  });
});

describe('resolvePosition', () => {
  const w = 1920;
  const h = 1080;
  const ew = 200;
  const eh = 100;

  it('resolves center', () => {
    const pos = resolvePosition('center', w, h, ew, eh);
    expect(pos.x).toBe(860); // (1920-200)/2
    expect(pos.y).toBe(490); // (1080-100)/2
  });

  it('resolves top-left with margin', () => {
    const pos = resolvePosition('top-left', w, h, ew, eh);
    expect(pos.x).toBe(96); // 5% of 1920
    expect(pos.y).toBe(54); // 5% of 1080
  });

  it('resolves bottom-right with margin', () => {
    const pos = resolvePosition('bottom-right', w, h, ew, eh);
    expect(pos.x).toBe(w - ew - 96);
    expect(pos.y).toBe(h - eh - 54);
  });

  it('resolves off-left (offscreen)', () => {
    const pos = resolvePosition('off-left', w, h, ew, eh);
    expect(pos.x).toBe(-ew);
  });

  it('resolves off-right (offscreen)', () => {
    const pos = resolvePosition('off-right', w, h, ew, eh);
    expect(pos.x).toBe(w);
  });

  it('has 13 position names', () => {
    expect(SEMANTIC_POSITION_NAMES).toHaveLength(13);
  });
});
