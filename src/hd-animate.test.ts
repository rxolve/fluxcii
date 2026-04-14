import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { applyHDFrame, generateHDBuffers, generateHDFrames, evaluateHDTrack } from './hd-animate.js';
import type { HDScene, HDAnimation, HDTrack } from './hd-types.js';

async function makeTestPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 128, g: 128, b: 128, alpha: 1 } },
  }).png().toBuffer();
}

async function makeTestScene(): Promise<HDScene> {
  const buf = await makeTestPng(50, 50);
  return {
    id: 'test-scene',
    width: 200,
    height: 200,
    background: '#000000',
    layers: [
      {
        id: 'layer-1',
        name: 'test-layer',
        asset: '',
        buffer: buf,
        x: 75,
        y: 75,
        width: 50,
        height: 50,
        opacity: 1,
        scale: 1,
        rotate: 0,
        visible: true,
        zIndex: 0,
      },
    ],
  };
}

describe('applyHDFrame', () => {
  it('applies tracks to a scene snapshot', async () => {
    const scene = await makeTestScene();
    const tracks: HDTrack[] = [
      {
        layerId: 'layer-1',
        property: 'x',
        keyframes: [
          { frame: 0, value: 0, easing: 'linear' },
          { frame: 10, value: 100 },
        ],
      },
    ];

    const snapshot = applyHDFrame(scene, tracks, 5);
    expect(snapshot.layers[0].x).toBe(50);
    // Original should be unchanged
    expect(scene.layers[0].x).toBe(75);
  });

  it('applies opacity tracks with clamping', async () => {
    const scene = await makeTestScene();
    const tracks: HDTrack[] = [
      {
        layerId: 'layer-1',
        property: 'opacity',
        keyframes: [
          { frame: 0, value: 0, easing: 'linear' },
          { frame: 10, value: 1 },
        ],
      },
    ];

    const snapshot = applyHDFrame(scene, tracks, 5);
    expect(snapshot.layers[0].opacity).toBeCloseTo(0.5, 1);
  });

  it('handles track offset', async () => {
    const scene = await makeTestScene();
    const tracks: HDTrack[] = [
      {
        layerId: 'layer-1',
        property: 'x',
        keyframes: [
          { frame: 0, value: 0, easing: 'linear' },
          { frame: 10, value: 100 },
        ],
        offset: 5,
      },
    ];

    // At frame 5, effective frame is 0 → value = 0
    const snapshot = applyHDFrame(scene, tracks, 5);
    expect(snapshot.layers[0].x).toBe(0);
  });

  it('skips missing layers', async () => {
    const scene = await makeTestScene();
    const tracks: HDTrack[] = [
      {
        layerId: 'nonexistent',
        property: 'x',
        keyframes: [{ frame: 0, value: 100 }],
      },
    ];

    // Should not throw
    const snapshot = applyHDFrame(scene, tracks, 0);
    expect(snapshot.layers[0].x).toBe(75); // unchanged
  });
});

describe('evaluateHDTrack', () => {
  it('evaluates a track at a given frame', () => {
    const track: HDTrack = {
      layerId: 'layer-1',
      property: 'x',
      keyframes: [
        { frame: 0, value: 0, easing: 'linear' },
        { frame: 10, value: 100 },
      ],
    };

    expect(evaluateHDTrack(track, 0)).toBe(0);
    expect(evaluateHDTrack(track, 5)).toBe(50);
    expect(evaluateHDTrack(track, 10)).toBe(100);
  });
});

describe('generateHDBuffers', () => {
  it('generates correct number of frame buffers', async () => {
    const scene = await makeTestScene();
    const anim: HDAnimation = {
      id: 'test-anim',
      sceneId: 'test-scene',
      totalFrames: 5,
      tracks: [],
    };

    const buffers = await generateHDBuffers(scene, anim);
    expect(buffers).toHaveLength(5);
    for (const buf of buffers) {
      expect(buf).toBeInstanceOf(Buffer);
    }
  });
});

describe('generateHDFrames', () => {
  it('generates base64 frames', async () => {
    const scene = await makeTestScene();
    const anim: HDAnimation = {
      id: 'test-anim',
      sceneId: 'test-scene',
      totalFrames: 3,
      tracks: [],
    };

    const frames = await generateHDFrames(scene, anim);
    expect(frames).toHaveLength(3);
    for (const f of frames) {
      expect(typeof f).toBe('string');
      // Valid base64
      expect(Buffer.from(f, 'base64').length).toBeGreaterThan(0);
    }
  });
});
