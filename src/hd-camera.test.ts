import { describe, it, expect } from 'vitest';
import { setCameraForFrame, extractCameraTracks, defaultCamera } from './hd-camera.js';
import type { HDScene } from './hd-types.js';

function makeScene(): HDScene {
  return {
    id: 'test',
    width: 800,
    height: 600,
    background: '#000000',
    layers: [
      {
        id: 'l1', name: 'test', asset: '',
        x: 100, y: 100, width: 50, height: 50,
        opacity: 1, scale: 1, rotate: 0, visible: true, zIndex: 0,
      },
    ],
  };
}

describe('setCameraForFrame', () => {
  it('applies pan offset', () => {
    const scene = makeScene();
    setCameraForFrame(scene, { x: 10, y: 20, zoom: 1, rotate: 0 });
    // Camera right → layer moves left
    expect(scene.layers[0].x).toBe(90);
    expect(scene.layers[0].y).toBe(80);
  });

  it('applies zoom from center', () => {
    const scene = makeScene();
    // Layer at (100,100), center at (400,300)
    setCameraForFrame(scene, { x: 0, y: 0, zoom: 2, rotate: 0 });
    // dx = 100-400 = -300, zoomed: 400 + (-300)*2 = -200
    expect(scene.layers[0].x).toBe(-200);
    expect(scene.layers[0].scale).toBe(2);
  });

  it('no-op with default camera', () => {
    const scene = makeScene();
    setCameraForFrame(scene, defaultCamera());
    expect(scene.layers[0].x).toBe(100);
    expect(scene.layers[0].y).toBe(100);
    expect(scene.layers[0].scale).toBe(1);
  });
});

describe('extractCameraTracks', () => {
  it('separates camera tracks from layer tracks', () => {
    const tracks = [
      { layerId: '__camera__', property: 'x' },
      { layerId: 'layer-1', property: 'x' },
      { layerId: '__camera__', property: 'scale' },
    ];
    const { cameraTracks, layerTracks } = extractCameraTracks(tracks);
    expect(cameraTracks).toHaveLength(2);
    expect(layerTracks).toHaveLength(1);
  });
});

describe('defaultCamera', () => {
  it('returns identity camera', () => {
    const cam = defaultCamera();
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
    expect(cam.rotate).toBe(0);
  });
});
