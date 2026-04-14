import type { HDScene } from './hd-types.js';

/**
 * Camera state for an HD scene.
 */
export interface CameraState {
  x: number;      // X offset (pan)
  y: number;      // Y offset (pan)
  zoom: number;   // Zoom level (1 = 100%)
  rotate: number; // Rotation in degrees
}

/**
 * Apply camera transform to all layers in a scene.
 * This modifies layer positions to simulate camera movement.
 *
 * Camera panning moves all layers in the opposite direction.
 * Camera zoom scales all layers from the center.
 * Camera rotation rotates all layers around the center.
 */
export function setCameraForFrame(scene: HDScene, camera: CameraState): void {
  const cx = scene.width / 2;
  const cy = scene.height / 2;

  for (const layer of scene.layers) {
    // Apply pan (camera moves right → layers move left)
    layer.x -= camera.x;
    layer.y -= camera.y;

    // Apply zoom from center
    if (camera.zoom !== 1) {
      const dx = layer.x - cx;
      const dy = layer.y - cy;
      layer.x = cx + dx * camera.zoom;
      layer.y = cy + dy * camera.zoom;
      layer.scale *= camera.zoom;
    }

    // Apply rotation from center
    if (camera.rotate !== 0) {
      const rad = (camera.rotate * Math.PI) / 180;
      const dx = layer.x - cx;
      const dy = layer.y - cy;
      layer.x = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
      layer.y = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
      layer.rotate += camera.rotate;
    }
  }
}

/**
 * Extract camera tracks from animation tracks.
 * Camera tracks use the special layerId "__camera__".
 */
export function extractCameraTracks(tracks: { layerId: string; property: string }[]): {
  cameraTracks: typeof tracks;
  layerTracks: typeof tracks;
} {
  const cameraTracks = tracks.filter((t) => t.layerId === '__camera__');
  const layerTracks = tracks.filter((t) => t.layerId !== '__camera__');
  return { cameraTracks, layerTracks };
}

/**
 * Default camera state (no transform).
 */
export function defaultCamera(): CameraState {
  return { x: 0, y: 0, zoom: 1, rotate: 0 };
}
