import { describe, it, expect, beforeAll } from 'vitest';
import { encodeGif } from './export-gif.js';
import { createScene, addCircle, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';
import { generateBuffers } from './animate.js';
import type { Animation } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
});

describe('encodeGif', () => {
  it('produces GIF89a output from animation buffers', async () => {
    resetNodeCounter();
    const scene = createScene('gif-test-1', 100, 100, '#000');
    const c = addCircle(scene, { cx: 50, cy: 50, r: 20, style: { fill: '#ff0000' } });

    const animation: Animation = {
      id: 'gif-a1',
      sceneId: scene.id,
      totalFrames: 5,
      tracks: [{
        nodeId: c.id,
        property: 'cx',
        keyframes: [{ frame: 0, value: 10 }, { frame: 4, value: 90 }],
      }],
    };

    const pngBuffers = generateBuffers(scene, animation);
    const gif = await encodeGif(pngBuffers, 100, 100);

    // GIF89a magic bytes
    expect(gif[0]).toBe(0x47); // G
    expect(gif[1]).toBe(0x49); // I
    expect(gif[2]).toBe(0x46); // F
    expect(gif[3]).toBe(0x38); // 8
    expect(gif[4]).toBe(0x39); // 9
    expect(gif[5]).toBe(0x61); // a
    expect(gif.length).toBeGreaterThan(0);
  });
});
