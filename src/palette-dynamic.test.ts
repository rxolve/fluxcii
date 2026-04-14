import { describe, it, expect, beforeAll } from 'vitest';
import { loadPalettes, registerPalette, deletePalette, listPalettes, getPalette } from './palette.js';
import type { Palette } from './types.js';

beforeAll(async () => {
  await loadPalettes();
});

describe('dynamic palette registration', () => {
  it('registers and retrieves a custom palette', () => {
    const custom: Palette = {
      id: 'my-custom',
      name: 'My Custom',
      theme: 'custom',
      colors: [
        { name: 'sky', hex: '#87CEEB' },
        { name: 'grass', hex: '#228B22' },
      ],
      background: '#FFFFFF',
      foreground: '#000000',
    };
    registerPalette(custom);

    const p = getPalette('my-custom');
    expect(p.name).toBe('My Custom');
    expect(p.colors).toHaveLength(2);
    expect(p.colors[0].hex).toBe('#87CEEB');
  });

  it('shows custom palette in list', () => {
    const all = listPalettes();
    const found = all.find((p) => p.id === 'my-custom');
    expect(found).toBeDefined();
  });

  it('deletes a custom palette', () => {
    expect(deletePalette('my-custom')).toBe(true);
    expect(deletePalette('my-custom')).toBe(false);
  });

  it('built-in palettes still exist', () => {
    const p = getPalette('kurz-space');
    expect(p.id).toBe('kurz-space');
  });
});
