import { describe, it, expect, beforeAll } from 'vitest';
import { encodeApng } from './export-apng.js';
import { createScene, addCircle, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';
import { generateBuffers } from './animate.js';
import type { Animation } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
});

describe('encodeApng', () => {
  it('produces PNG with acTL chunk (animated PNG)', async () => {
    resetNodeCounter();
    const scene = createScene('apng-test-1', 100, 100, '#000');
    const c = addCircle(scene, { cx: 50, cy: 50, r: 20, style: { fill: '#ff0000' } });

    const animation: Animation = {
      id: 'apng-a1',
      sceneId: scene.id,
      totalFrames: 5,
      tracks: [{
        nodeId: c.id,
        property: 'cx',
        keyframes: [{ frame: 0, value: 10 }, { frame: 4, value: 90 }],
      }],
    };

    const pngBuffers = generateBuffers(scene, animation);
    const apng = await encodeApng(pngBuffers);

    // PNG magic bytes
    expect(apng[0]).toBe(0x89);
    expect(apng[1]).toBe(0x50); // P
    expect(apng[2]).toBe(0x4e); // N
    expect(apng[3]).toBe(0x47); // G

    // Contains acTL chunk (animation control)
    const str = apng.toString('latin1');
    expect(str).toContain('acTL');
  });
});
