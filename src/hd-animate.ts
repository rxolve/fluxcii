import type { HDScene, HDAnimation, HDTrack, HDAnimatableProperty } from './hd-types.js';
import { hdInterpolateKeyframes } from './hd-interpolate.js';
import { renderHDScene } from './hd-render.js';

/**
 * Set an animatable property on a layer.
 */
function setLayerProperty(
  layer: { x: number; y: number; opacity: number; scale: number; rotate: number; width: number; height: number },
  property: HDAnimatableProperty,
  value: number,
): void {
  switch (property) {
    case 'x': layer.x = value; break;
    case 'y': layer.y = value; break;
    case 'opacity': layer.opacity = Math.max(0, Math.min(1, value)); break;
    case 'scale': layer.scale = Math.max(0, value); break;
    case 'rotate': layer.rotate = value; break;
    case 'width': layer.width = Math.max(1, value); break;
    case 'height': layer.height = Math.max(1, value); break;
  }
}

/**
 * Apply all tracks to a scene snapshot for a given frame.
 * Returns a deep clone with track values applied.
 */
export function applyHDFrame(scene: HDScene, tracks: HDTrack[], frame: number): HDScene {
  const snapshot: HDScene = structuredClone(scene);

  for (const track of tracks) {
    const layer = snapshot.layers.find((l) => l.id === track.layerId);
    if (!layer) continue;

    const effectiveFrame = frame - (track.offset ?? 0);
    const value = hdInterpolateKeyframes(track.keyframes, effectiveFrame);
    setLayerProperty(layer, track.property, value);
  }

  return snapshot;
}

/**
 * Generate PNG buffers for all frames of an HD animation.
 */
export async function generateHDBuffers(scene: HDScene, animation: HDAnimation): Promise<Buffer[]> {
  const buffers: Buffer[] = [];

  for (let f = 0; f < animation.totalFrames; f++) {
    const snapshot = applyHDFrame(scene, animation.tracks, f);
    const buf = await renderHDScene(snapshot);
    buffers.push(buf);
  }

  return buffers;
}

/**
 * Generate base64-encoded PNG frames for all frames of an HD animation.
 */
export async function generateHDFrames(scene: HDScene, animation: HDAnimation): Promise<string[]> {
  const buffers = await generateHDBuffers(scene, animation);
  return buffers.map((buf) => buf.toString('base64'));
}

/**
 * Evaluate a single HD track at a given frame (for testing).
 */
export function evaluateHDTrack(track: HDTrack, frame: number): number {
  return hdInterpolateKeyframes(track.keyframes, frame - (track.offset ?? 0));
}
