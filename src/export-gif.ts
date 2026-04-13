import sharp from 'sharp';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
import { DEFAULT_FRAME_DELAY } from './constants.js';

export interface GifOptions {
  delay?: number;
  loop?: boolean;
}

export async function encodeGif(
  pngBuffers: Buffer[],
  width: number,
  height: number,
  options?: GifOptions,
): Promise<Buffer> {
  const delay = options?.delay ?? DEFAULT_FRAME_DELAY;
  const loop = options?.loop ?? true;

  const gif = GIFEncoder();

  for (const png of pngBuffers) {
    const { data } = await sharp(png)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);

    gif.writeFrame(indexed, width, height, {
      palette,
      delay,
      repeat: loop ? 0 : -1,
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}
