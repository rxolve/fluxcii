import { describe, it, expect, beforeAll } from 'vitest';
import { resolveFrameSequence, generateBuffers } from './animate.js';
import { createScene, addCircle, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';
import type { Animation } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
});

describe('resolveFrameSequence', () => {
  it('normal mode returns 0..N-1', () => {
    expect(resolveFrameSequence(5, 'normal')).toEqual([0, 1, 2, 3, 4]);
  });

  it('reverse mode returns N-1..0', () => {
    expect(resolveFrameSequence(5, 'reverse')).toEqual([4, 3, 2, 1, 0]);
  });

  it('pingpong mode returns 0..N-1..1', () => {
    expect(resolveFrameSequence(5, 'pingpong')).toEqual([0, 1, 2, 3, 4, 3, 2, 1]);
  });

  it('pingpong with 5 frames yields 8 output frames', () => {
    expect(resolveFrameSequence(5, 'pingpong')).toHaveLength(8);
  });

  it('defaults to normal', () => {
    expect(resolveFrameSequence(3)).toEqual([0, 1, 2]);
  });
});

describe('generateBuffers', () => {
  it('returns Buffer[] with correct count for pingpong', () => {
    resetNodeCounter();
    const scene = createScene('pb-test-1', 100, 100, '#000');
    const c = addCircle(scene, { cx: 50, cy: 50, r: 20, style: { fill: '#ff0000' } });

    const animation: Animation = {
      id: 'pb-a1',
      sceneId: scene.id,
      totalFrames: 4,
      tracks: [{ nodeId: c.id, property: 'cx', keyframes: [{ frame: 0, value: 0 }, { frame: 3, value: 100 }] }],
      mode: 'pingpong',
    };

    const buffers = generateBuffers(scene, animation);
    // pingpong(4) = [0,1,2,3,2,1] = 6 frames
    expect(buffers).toHaveLength(6);
    for (const buf of buffers) {
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf[0]).toBe(0x89); // PNG magic
    }
  });

  it('respects track offset', () => {
    resetNodeCounter();
    const scene = createScene('pb-test-2', 100, 100, '#000');
    const c = addCircle(scene, { cx: 0, cy: 50, r: 10, style: { fill: '#ff0000' } });

    // With offset=2, at frame 0 the effective frame is -2 (holds first keyframe value)
    const animation: Animation = {
      id: 'pb-a2',
      sceneId: scene.id,
      totalFrames: 5,
      tracks: [{
        nodeId: c.id,
        property: 'cx',
        keyframes: [{ frame: 0, value: 0 }, { frame: 4, value: 100 }],
        offset: 2,
      }],
    };

    const buffers = generateBuffers(scene, animation);
    expect(buffers).toHaveLength(5);
  });
});
