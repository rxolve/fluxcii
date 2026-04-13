import { describe, it, expect, beforeAll } from 'vitest';
import { renderToBuffer, renderToBase64 } from './render.js';
import { createScene, addRect, addCircle, addText, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';

beforeAll(async () => {
  await loadPalettes();
  resetNodeCounter();
});

describe('renderToBuffer', () => {
  it('produces a valid PNG buffer', () => {
    const s = createScene('r1', 200, 200, 'void', 'kurz-space');
    addRect(s, {
      x: 0, y: 0, width: 200, height: 200,
      style: {
        fill: {
          type: 'linear',
          angle: 90,
          stops: [
            { offset: 0, color: 'void' },
            { offset: 1, color: 'deep-blue' },
          ],
        },
      },
    });
    addCircle(s, { cx: 100, cy: 100, r: 40, style: { fill: 'bright-blue' } });
    addText(s, { x: 100, y: 180, text: 'fluxcii', style: { fill: 'white' }, textAnchor: 'middle' });

    const buf = renderToBuffer(s);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
    // PNG magic bytes
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });
});

describe('renderToBase64', () => {
  it('returns a base64 string', () => {
    const s = createScene('r2', 100, 100, '#000');
    const b64 = renderToBase64(s);
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
    // Should be valid base64
    expect(() => Buffer.from(b64, 'base64')).not.toThrow();
  });
});
