import sharp from 'sharp';
import type { HDScene, HDLayer } from './hd-types.js';

/**
 * Parse a hex color string to RGBA components.
 */
function parseColor(hex: string): { r: number; g: number; b: number; alpha: number } {
  const h = hex.replace('#', '');
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      alpha: 1,
    };
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      alpha: parseInt(h.slice(6, 8), 16) / 255,
    };
  }
  return { r: 0, g: 0, b: 0, alpha: 1 };
}

/**
 * Apply opacity to a PNG buffer by multiplying alpha channel.
 */
async function applyOpacity(buffer: Buffer, opacity: number): Promise<Buffer> {
  if (opacity >= 1) return buffer;
  if (opacity <= 0) {
    // Fully transparent — return 1x1 transparent pixel
    return sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer();
  }

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 3; i < pixels.length; i += 4) {
    pixels[i] = Math.round(pixels[i] * opacity);
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Render a single layer to a positioned overlay for sharp.composite().
 */
async function renderLayer(
  layer: HDLayer,
  sceneWidth: number,
  sceneHeight: number,
): Promise<sharp.OverlayOptions | null> {
  if (!layer.visible || !layer.buffer || layer.opacity <= 0) return null;

  const scaledW = Math.max(1, Math.round(layer.width * layer.scale));
  const scaledH = Math.max(1, Math.round(layer.height * layer.scale));

  let processed = await sharp(layer.buffer)
    .resize(scaledW, scaledH, { fit: 'fill' })
    .png()
    .toBuffer();

  // Apply rotation
  if (layer.rotate !== 0) {
    processed = await sharp(processed)
      .rotate(layer.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  // Apply opacity
  if (layer.opacity < 1) {
    processed = await applyOpacity(processed, layer.opacity);
  }

  // Get final dimensions after rotation
  const meta = await sharp(processed).metadata();
  const finalW = meta.width ?? scaledW;
  const finalH = meta.height ?? scaledH;

  // Calculate top-left position (layer x,y is center-based for rotation consistency)
  const left = Math.round(layer.x - (finalW - layer.width * layer.scale) / 2);
  const top = Math.round(layer.y - (finalH - layer.height * layer.scale) / 2);

  // Create a full-scene transparent canvas and place the layer on it
  // This handles negative offsets and overflow
  const canvas = sharp({
    create: {
      width: sceneWidth,
      height: sceneHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Compute the visible region
  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const dstLeft = Math.max(0, left);
  const dstTop = Math.max(0, top);
  const visibleW = Math.min(finalW - srcLeft, sceneWidth - dstLeft);
  const visibleH = Math.min(finalH - srcTop, sceneHeight - dstTop);

  if (visibleW <= 0 || visibleH <= 0) return null;

  // Extract visible portion of the processed layer
  const cropped = await sharp(processed)
    .extract({ left: srcLeft, top: srcTop, width: visibleW, height: visibleH })
    .png()
    .toBuffer();

  return {
    input: cropped,
    left: dstLeft,
    top: dstTop,
    blend: 'over' as const,
  };
}

/**
 * Render an HDScene to a PNG buffer.
 * Composites all visible layers sorted by zIndex onto a colored background.
 */
export async function renderHDScene(scene: HDScene): Promise<Buffer> {
  const bg = parseColor(scene.background);

  // Create background canvas
  let canvas = sharp({
    create: {
      width: scene.width,
      height: scene.height,
      channels: 4,
      background: { r: bg.r, g: bg.g, b: bg.b, alpha: bg.alpha },
    },
  });

  // Sort layers by zIndex
  const sorted = [...scene.layers]
    .filter((l) => l.visible && l.buffer && l.opacity > 0)
    .sort((a, b) => a.zIndex - b.zIndex);

  // Render each layer to an overlay
  const overlays: sharp.OverlayOptions[] = [];
  for (const layer of sorted) {
    const overlay = await renderLayer(layer, scene.width, scene.height);
    if (overlay) overlays.push(overlay);
  }

  if (overlays.length > 0) {
    canvas = canvas.composite(overlays);
  }

  return canvas.png().toBuffer();
}

/**
 * Render an HDScene to a base64-encoded PNG string.
 */
export async function renderHDSceneBase64(scene: HDScene): Promise<string> {
  const buf = await renderHDScene(scene);
  return buf.toString('base64');
}
