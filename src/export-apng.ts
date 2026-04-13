import sharp from 'sharp';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const UPNG = require('upng-js');
import { DEFAULT_FRAME_DELAY } from './constants.js';

export interface ApngOptions {
  delay?: number;
  loop?: boolean;
}

export async function encodeApng(
  pngBuffers: Buffer[],
  options?: ApngOptions,
): Promise<Buffer> {
  const delay = options?.delay ?? DEFAULT_FRAME_DELAY;

  const rawFrames: Buffer[] = [];
  let width = 0;
  let height = 0;

  for (const png of pngBuffers) {
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    rawFrames.push(data);
    width = info.width;
    height = info.height;
  }

  const delays = new Array(rawFrames.length).fill(delay);
  const cnum = 0; // lossless
  return Buffer.from(UPNG.encode(rawFrames, width, height, cnum, delays));
}
