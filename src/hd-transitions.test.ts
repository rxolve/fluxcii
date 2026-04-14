import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { blendTransition } from './hd-transitions.js';

async function makeFrame(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: 10, height: 10, channels: 4, background: { r, g, b, alpha: 1 } },
  }).png().toBuffer();
}

describe('blendTransition', () => {
  it('returns from frame at progress 0', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const result = await blendTransition(from, to, 0, 'dissolve', 10, 10);
    expect(result).toBe(from);
  });

  it('returns to frame at progress 1', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const result = await blendTransition(from, to, 1, 'dissolve', 10, 10);
    expect(result).toBe(to);
  });

  it('cut transitions at midpoint', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const before = await blendTransition(from, to, 0.4, 'cut', 10, 10);
    const after = await blendTransition(from, to, 0.6, 'cut', 10, 10);
    expect(before).toBe(from);
    expect(after).toBe(to);
  });

  it('dissolve produces valid output', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const result = await blendTransition(from, to, 0.5, 'dissolve', 10, 10);
    expect(result).toBeInstanceOf(Buffer);
    const meta = await sharp(result).metadata();
    expect(meta.width).toBe(10);
    expect(meta.height).toBe(10);
  });

  it('fade produces valid output', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const result = await blendTransition(from, to, 0.5, 'fade', 10, 10);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('wipe-left produces valid output', async () => {
    const from = await makeFrame(255, 0, 0);
    const to = await makeFrame(0, 0, 255);
    const result = await blendTransition(from, to, 0.5, 'wipe-left', 10, 10);
    expect(result).toBeInstanceOf(Buffer);
  });
});
