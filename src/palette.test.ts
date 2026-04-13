import { describe, it, expect, beforeAll } from 'vitest';
import { loadPalettes, getPalette, listPalettes, resolveColorName } from './palette.js';

beforeAll(async () => {
  await loadPalettes();
});

describe('loadPalettes', () => {
  it('loads all 4 palettes', () => {
    const all = listPalettes();
    expect(all.length).toBe(4);
  });
});

describe('getPalette', () => {
  it('returns default palette', () => {
    const p = getPalette();
    expect(p.id).toBe('kurz-space');
  });

  it('returns specific palette', () => {
    const p = getPalette('kurz-bio');
    expect(p.id).toBe('kurz-bio');
    expect(p.name).toBe('Kurzgesagt Biology');
  });

  it('falls back to default for unknown id', () => {
    const p = getPalette('nonexistent');
    expect(p.id).toBe('kurz-space');
  });
});

describe('resolveColorName', () => {
  it('resolves a palette color name to hex', () => {
    const p = getPalette('kurz-space');
    expect(resolveColorName('bright-blue', p)).toBe('#2E7DFF');
  });

  it('returns input unchanged if not a palette name', () => {
    const p = getPalette('kurz-space');
    expect(resolveColorName('#FF0000', p)).toBe('#FF0000');
  });
});
