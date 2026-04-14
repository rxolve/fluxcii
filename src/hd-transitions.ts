import sharp from 'sharp';

export type TransitionType = 'cut' | 'dissolve' | 'fade' | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'wipe-down';

/**
 * Blend two frames during a transition.
 *
 * @param fromBuffer - The outgoing frame (PNG)
 * @param toBuffer - The incoming frame (PNG)
 * @param progress - Transition progress (0 = fully from, 1 = fully to)
 * @param type - Transition type
 * @param width - Frame width
 * @param height - Frame height
 */
export async function blendTransition(
  fromBuffer: Buffer,
  toBuffer: Buffer,
  progress: number,
  type: TransitionType,
  width: number,
  height: number,
): Promise<Buffer> {
  if (progress <= 0) return fromBuffer;
  if (progress >= 1) return toBuffer;

  switch (type) {
    case 'cut':
      return progress >= 0.5 ? toBuffer : fromBuffer;

    case 'dissolve':
      return crossDissolve(fromBuffer, toBuffer, progress, width, height);

    case 'fade':
      return fadeThrough(fromBuffer, toBuffer, progress, width, height);

    case 'wipe-left':
      return wipe(fromBuffer, toBuffer, progress, width, height, 'left');

    case 'wipe-right':
      return wipe(fromBuffer, toBuffer, progress, width, height, 'right');

    case 'wipe-up':
      return wipe(fromBuffer, toBuffer, progress, width, height, 'up');

    case 'wipe-down':
      return wipe(fromBuffer, toBuffer, progress, width, height, 'down');

    default:
      return progress >= 0.5 ? toBuffer : fromBuffer;
  }
}

/**
 * Cross-dissolve: linear blend between two frames.
 */
async function crossDissolve(
  fromBuf: Buffer,
  toBuf: Buffer,
  progress: number,
  width: number,
  height: number,
): Promise<Buffer> {
  const fromRaw = await sharp(fromBuf).ensureAlpha().raw().toBuffer();
  const toRaw = await sharp(toBuf).ensureAlpha().raw().toBuffer();

  const result = Buffer.alloc(fromRaw.length);
  for (let i = 0; i < fromRaw.length; i++) {
    result[i] = Math.round(fromRaw[i] * (1 - progress) + toRaw[i] * progress);
  }

  return sharp(result, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Fade through black: out fades to black, then in fades from black.
 */
async function fadeThrough(
  fromBuf: Buffer,
  toBuf: Buffer,
  progress: number,
  width: number,
  height: number,
): Promise<Buffer> {
  if (progress < 0.5) {
    // Fading out
    const fadeProgress = progress * 2;
    const fromRaw = await sharp(fromBuf).ensureAlpha().raw().toBuffer();
    const result = Buffer.alloc(fromRaw.length);
    for (let i = 0; i < fromRaw.length; i += 4) {
      result[i] = Math.round(fromRaw[i] * (1 - fadeProgress));
      result[i + 1] = Math.round(fromRaw[i + 1] * (1 - fadeProgress));
      result[i + 2] = Math.round(fromRaw[i + 2] * (1 - fadeProgress));
      result[i + 3] = fromRaw[i + 3];
    }
    return sharp(result, { raw: { width, height, channels: 4 } }).png().toBuffer();
  } else {
    // Fading in
    const fadeProgress = (progress - 0.5) * 2;
    const toRaw = await sharp(toBuf).ensureAlpha().raw().toBuffer();
    const result = Buffer.alloc(toRaw.length);
    for (let i = 0; i < toRaw.length; i += 4) {
      result[i] = Math.round(toRaw[i] * fadeProgress);
      result[i + 1] = Math.round(toRaw[i + 1] * fadeProgress);
      result[i + 2] = Math.round(toRaw[i + 2] * fadeProgress);
      result[i + 3] = toRaw[i + 3];
    }
    return sharp(result, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }
}

/**
 * Directional wipe transition.
 */
async function wipe(
  fromBuf: Buffer,
  toBuf: Buffer,
  progress: number,
  width: number,
  height: number,
  direction: 'left' | 'right' | 'up' | 'down',
): Promise<Buffer> {
  const fromRaw = await sharp(fromBuf).ensureAlpha().raw().toBuffer();
  const toRaw = await sharp(toBuf).ensureAlpha().raw().toBuffer();
  const result = Buffer.alloc(fromRaw.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let useNew: boolean;

      switch (direction) {
        case 'left':
          useNew = x < width * progress;
          break;
        case 'right':
          useNew = x > width * (1 - progress);
          break;
        case 'up':
          useNew = y < height * progress;
          break;
        case 'down':
          useNew = y > height * (1 - progress);
          break;
      }

      const src = useNew ? toRaw : fromRaw;
      result[idx] = src[idx];
      result[idx + 1] = src[idx + 1];
      result[idx + 2] = src[idx + 2];
      result[idx + 3] = src[idx + 3];
    }
  }

  return sharp(result, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
