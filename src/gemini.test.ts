import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { removeWhiteBg, sliceSpriteSheet, buildPrompt } from './gemini.js';

describe('buildPrompt', () => {
  it('enhances prompt with sprite sheet instructions', () => {
    const result = buildPrompt('a running cat', 6);
    expect(result).toContain('a running cat');
    expect(result).toContain('6 frames');
    expect(result).toContain('horizontal row');
    expect(result).toContain('white background');
  });

  it('includes frame count in prompt', () => {
    const result = buildPrompt('walking robot', 4);
    expect(result).toContain('4 frames');
  });
});

describe('removeWhiteBg', () => {
  it('makes white pixels fully transparent', async () => {
    // Create a 2x1 image: one white pixel (255,255,255), one red pixel (255,0,0)
    const input = await sharp(
      Buffer.from([255, 255, 255, 255, 0, 0, 255, 255]),
      { raw: { width: 2, height: 1, channels: 4 } },
    )
      .png()
      .toBuffer();

    const result = await removeWhiteBg(input);
    const { data } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // White pixel → transparent
    expect(data[3]).toBe(0);
    // Red pixel → opaque
    expect(data[7]).toBe(255);
  });

  it('feathers near-white pixels', async () => {
    // Near-white pixel (220, 220, 220) should get partial transparency
    const input = await sharp(
      Buffer.from([220, 220, 220, 255]),
      { raw: { width: 1, height: 1, channels: 4 } },
    )
      .png()
      .toBuffer();

    const result = await removeWhiteBg(input);
    const { data } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Should be semi-transparent (not 0, not 255)
    expect(data[3]).toBeGreaterThan(0);
    expect(data[3]).toBeLessThan(255);
  });
});

describe('sliceSpriteSheet', () => {
  it('slices horizontal strip into N equal frames', async () => {
    // Create a 120x40 image (should yield 3 frames of 40x40)
    const input = await sharp({
      create: { width: 120, height: 40, channels: 4, background: { r: 100, g: 150, b: 200, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const frames = await sliceSpriteSheet(input, 3);
    expect(frames).toHaveLength(3);

    for (const frame of frames) {
      const meta = await sharp(frame).metadata();
      expect(meta.width).toBe(40);
      expect(meta.height).toBe(40);
    }
  });

  it('handles single frame', async () => {
    const input = await sharp({
      create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const frames = await sliceSpriteSheet(input, 1);
    expect(frames).toHaveLength(1);
  });
});
