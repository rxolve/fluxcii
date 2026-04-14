import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { renderComposition } from './compose.js';
import { createScene, addRect, resetNodeCounter } from './scene.js';
import { storeScene, storeAnimation, clearStore } from './store.js';
import { loadPalettes } from './palette.js';
import type { Animation } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
});

beforeEach(() => {
  clearStore();
  resetNodeCounter();
});

describe('renderComposition', () => {
  it('sequences two animation segments', () => {
    // Create scene + animation 1
    const s1 = createScene('s1', 100, 100, '#FF0000');
    addRect(s1, { x: 0, y: 0, width: 100, height: 100, name: 'bg' });
    storeScene(s1);
    const a1: Animation = {
      id: 'a1', sceneId: 's1', totalFrames: 4,
      tracks: [{ nodeId: 'root', property: 'style.opacity', keyframes: [{ frame: 0, value: 1 }, { frame: 3, value: 0 }] }],
    };
    storeAnimation(a1);

    // Create scene + animation 2
    const s2 = createScene('s2', 100, 100, '#0000FF');
    addRect(s2, { x: 0, y: 0, width: 100, height: 100, name: 'bg2' });
    storeScene(s2);
    const a2: Animation = {
      id: 'a2', sceneId: 's2', totalFrames: 3,
      tracks: [],
    };
    storeAnimation(a2);

    const buffers = renderComposition({
      segments: [
        { animId: 'a1', startFrame: 0, endFrame: 2 },
        { animId: 'a2', startFrame: 0, endFrame: 3 },
      ],
    });

    expect(buffers).toHaveLength(5); // 2 from a1 + 3 from a2
    // All should be valid PNG buffers
    for (const buf of buffers) {
      expect(buf.length).toBeGreaterThan(0);
    }
  });

  it('handles single segment', () => {
    const s = createScene('s1', 50, 50, '#000');
    storeScene(s);
    const a: Animation = { id: 'a1', sceneId: 's1', totalFrames: 2, tracks: [] };
    storeAnimation(a);

    const buffers = renderComposition({
      segments: [{ animId: 'a1', startFrame: 0, endFrame: 2 }],
    });
    expect(buffers).toHaveLength(2);
  });

  it('clamps out-of-range frames', () => {
    const s = createScene('s1', 50, 50);
    storeScene(s);
    const a: Animation = { id: 'a1', sceneId: 's1', totalFrames: 3, tracks: [] };
    storeAnimation(a);

    const buffers = renderComposition({
      segments: [{ animId: 'a1', startFrame: 0, endFrame: 100 }],
    });
    expect(buffers).toHaveLength(3); // clamped to totalFrames
  });
});
