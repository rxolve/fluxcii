import { describe, it, expect, beforeAll } from 'vitest';
import { createSpritesheet } from './export-spritesheet.js';
import { createScene, addRect, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';
import { generateBuffers } from './animate.js';
import type { Animation } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
});

function makeBuffers(count: number, w: number, h: number) {
  resetNodeCounter();
  const scene = createScene('ss-test', w, h, '#000');
  const r = addRect(scene, { x: 0, y: 0, width: w, height: h, style: { fill: '#ff0000' } });
  const animation: Animation = {
    id: 'ss-a1',
    sceneId: scene.id,
    totalFrames: count,
    tracks: [{
      nodeId: r.id,
      property: 'x',
      keyframes: [{ frame: 0, value: 0 }, { frame: count - 1, value: 50 }],
    }],
  };
  return { scene, animation, buffers: generateBuffers(scene, animation) };
}

describe('createSpritesheet', () => {
  it('horizontal layout: N frames → Nx1 grid', async () => {
    const { buffers } = makeBuffers(4, 100, 100);
    const result = await createSpritesheet(buffers, 100, 100, { layout: 'horizontal' });
    expect(result.width).toBe(400);
    expect(result.height).toBe(100);
    expect(result.columns).toBe(4);
    expect(result.rows).toBe(1);
    expect(result.frameCount).toBe(4);
  });

  it('vertical layout: N frames → 1xN grid', async () => {
    const { buffers } = makeBuffers(3, 100, 100);
    const result = await createSpritesheet(buffers, 100, 100, { layout: 'vertical' });
    expect(result.width).toBe(100);
    expect(result.height).toBe(300);
    expect(result.columns).toBe(1);
    expect(result.rows).toBe(3);
  });

  it('grid layout with columns: 4 frames 100x100 grid(2) → 200x200', async () => {
    const { buffers } = makeBuffers(4, 100, 100);
    const result = await createSpritesheet(buffers, 100, 100, { layout: 'grid', columns: 2 });
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.columns).toBe(2);
    expect(result.rows).toBe(2);
  });

  it('produces valid PNG buffer', async () => {
    const { buffers } = makeBuffers(2, 50, 50);
    const result = await createSpritesheet(buffers, 50, 50);
    // PNG magic bytes
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50);
    expect(result.buffer[2]).toBe(0x4e);
    expect(result.buffer[3]).toBe(0x47);
  });
});
