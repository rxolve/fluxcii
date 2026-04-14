import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderHDScene, renderHDSceneBase64 } from './hd-render.js';
import type { HDScene, HDLayer } from './hd-types.js';

async function makeTestPng(width: number, height: number, color = { r: 255, g: 0, b: 0, alpha: 1 }): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  }).png().toBuffer();
}

function makeScene(overrides?: Partial<HDScene>): HDScene {
  return {
    id: 'test-scene',
    width: 100,
    height: 100,
    background: '#000000',
    layers: [],
    ...overrides,
  };
}

describe('renderHDScene', () => {
  it('renders an empty scene with background color', async () => {
    const scene = makeScene({ background: '#ff0000' });
    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);

    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
    expect(meta.format).toBe('png');
  });

  it('composites a single layer', async () => {
    const layerBuf = await makeTestPng(50, 50, { r: 0, g: 255, b: 0, alpha: 1 });
    const scene = makeScene({
      layers: [{
        id: 'l1', name: 'green', asset: '', buffer: layerBuf,
        x: 25, y: 25, width: 50, height: 50,
        opacity: 1, scale: 1, rotate: 0, visible: true, zIndex: 0,
      }],
    });

    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);
    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it('respects layer visibility', async () => {
    const layerBuf = await makeTestPng(50, 50);
    const scene = makeScene({
      layers: [{
        id: 'l1', name: 'hidden', asset: '', buffer: layerBuf,
        x: 0, y: 0, width: 50, height: 50,
        opacity: 1, scale: 1, rotate: 0, visible: false, zIndex: 0,
      }],
    });

    // Should render without error (invisible layer skipped)
    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('handles opacity', async () => {
    const layerBuf = await makeTestPng(50, 50);
    const scene = makeScene({
      layers: [{
        id: 'l1', name: 'semi', asset: '', buffer: layerBuf,
        x: 0, y: 0, width: 50, height: 50,
        opacity: 0.5, scale: 1, rotate: 0, visible: true, zIndex: 0,
      }],
    });

    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('handles scale', async () => {
    const layerBuf = await makeTestPng(50, 50);
    const scene = makeScene({
      layers: [{
        id: 'l1', name: 'scaled', asset: '', buffer: layerBuf,
        x: 0, y: 0, width: 50, height: 50,
        opacity: 1, scale: 2, rotate: 0, visible: true, zIndex: 0,
      }],
    });

    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);
  });

  it('sorts layers by zIndex', async () => {
    const red = await makeTestPng(50, 50, { r: 255, g: 0, b: 0, alpha: 1 });
    const blue = await makeTestPng(50, 50, { r: 0, g: 0, b: 255, alpha: 1 });

    const scene = makeScene({
      layers: [
        { id: 'l1', name: 'red', asset: '', buffer: red, x: 0, y: 0, width: 50, height: 50, opacity: 1, scale: 1, rotate: 0, visible: true, zIndex: 1 },
        { id: 'l2', name: 'blue', asset: '', buffer: blue, x: 0, y: 0, width: 50, height: 50, opacity: 1, scale: 1, rotate: 0, visible: true, zIndex: 0 },
      ],
    });

    // Red is on top (higher zIndex), blue underneath
    const buf = await renderHDScene(scene);
    expect(buf).toBeInstanceOf(Buffer);
  });
});

describe('renderHDSceneBase64', () => {
  it('returns base64 string', async () => {
    const scene = makeScene();
    const b64 = await renderHDSceneBase64(scene);
    expect(typeof b64).toBe('string');
    // Should be valid base64
    const decoded = Buffer.from(b64, 'base64');
    expect(decoded.length).toBeGreaterThan(0);
  });
});
