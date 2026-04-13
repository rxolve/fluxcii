import { describe, it, expect, beforeAll } from 'vitest';
import { generateFrames, evaluateTrack } from './animate.js';
import { createScene, addCircle, resetNodeCounter } from './scene.js';
import { loadPalettes } from './palette.js';
import type { Animation, Track } from './animation-types.js';

beforeAll(async () => {
  await loadPalettes();
  resetNodeCounter();
});

describe('evaluateTrack', () => {
  it('evaluates numeric track at specific frames', () => {
    const track: Track = {
      nodeId: 'n0001',
      property: 'cx',
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 10, value: 100 },
      ],
    };
    expect(evaluateTrack(track, 0)).toBe(0);
    expect(evaluateTrack(track, 5)).toBeCloseTo(50, 5);
    expect(evaluateTrack(track, 10)).toBe(100);
  });

  it('evaluates track with easing', () => {
    const track: Track = {
      nodeId: 'n0001',
      property: 'cx',
      keyframes: [
        { frame: 0, value: 0, easing: 'ease-in' },
        { frame: 10, value: 100 },
      ],
    };
    const v = evaluateTrack(track, 5) as number;
    expect(v).toBeLessThan(50); // ease-in is slower at start
  });
});

describe('generateFrames', () => {
  it('generates correct number of frames', () => {
    resetNodeCounter();
    const scene = createScene('anim-test-1', 200, 200, '#000');
    const circle = addCircle(scene, { cx: 0, cy: 100, r: 20, style: { fill: '#ff0000' } });

    const animation: Animation = {
      id: 'a1',
      sceneId: scene.id,
      totalFrames: 5,
      tracks: [
        {
          nodeId: circle.id,
          property: 'cx',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 4, value: 100 },
          ],
        },
      ],
    };

    const frames = generateFrames(scene, animation);
    expect(frames).toHaveLength(5);
    // Each frame should be a valid base64 string
    for (const frame of frames) {
      expect(typeof frame).toBe('string');
      expect(frame.length).toBeGreaterThan(0);
      // Check PNG magic bytes in decoded buffer
      const buf = Buffer.from(frame, 'base64');
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
    }
  });

  it('does not mutate the original scene', () => {
    resetNodeCounter();
    const scene = createScene('anim-test-2', 200, 200, '#000');
    const circle = addCircle(scene, { cx: 50, cy: 100, r: 20 });

    const animation: Animation = {
      id: 'a2',
      sceneId: scene.id,
      totalFrames: 3,
      tracks: [
        {
          nodeId: circle.id,
          property: 'cx',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 2, value: 200 },
          ],
        },
      ],
    };

    generateFrames(scene, animation);
    // Original scene circle should be unchanged
    expect(circle.cx).toBe(50);
  });

  it('integration: circle cx track linear vs ease-in', () => {
    resetNodeCounter();
    const scene = createScene('anim-test-3', 200, 200, '#000');
    const circle = addCircle(scene, { cx: 0, cy: 100, r: 10 });

    // Linear: frame 5 of 10 should yield cx=50
    const linearTrack: Track = {
      nodeId: circle.id,
      property: 'cx',
      keyframes: [
        { frame: 0, value: 0 },
        { frame: 9, value: 100 },
      ],
    };
    const linearVal = evaluateTrack(linearTrack, 4.5) as number;
    expect(linearVal).toBeCloseTo(50, 1);

    // Ease-in: same frames should yield cx < 50
    const easeInTrack: Track = {
      nodeId: circle.id,
      property: 'cx',
      keyframes: [
        { frame: 0, value: 0, easing: 'ease-in' },
        { frame: 9, value: 100 },
      ],
    };
    const easeInVal = evaluateTrack(easeInTrack, 4.5) as number;
    expect(easeInVal).toBeLessThan(50);
  });

  it('integration: color interpolation in frames', () => {
    resetNodeCounter();
    const scene = createScene('anim-test-4', 100, 100, '#000');
    const circle = addCircle(scene, { cx: 50, cy: 50, r: 30, style: { fill: '#000000' } });

    const colorTrack: Track = {
      nodeId: circle.id,
      property: 'style.fill',
      keyframes: [
        { frame: 0, value: '#000000' },
        { frame: 10, value: '#ffffff' },
      ],
    };
    // At t=0.5 (frame 5), fill should be #808080
    const val = evaluateTrack(colorTrack, 5);
    expect(val).toBe('#808080');
  });
});
