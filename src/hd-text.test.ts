import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderTextLabel } from './hd-text.js';

describe('renderTextLabel', () => {
  it('renders text to a PNG buffer', async () => {
    const { buffer, width, height } = await renderTextLabel({ text: 'Hello' });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe('png');
  });

  it('respects custom font size', async () => {
    const small = await renderTextLabel({ text: 'Hi', fontSize: 16 });
    const large = await renderTextLabel({ text: 'Hi', fontSize: 64 });
    expect(large.height).toBeGreaterThan(small.height);
  });

  it('wraps text with maxWidth', async () => {
    const result = await renderTextLabel({
      text: 'This is a long text that should wrap to multiple lines',
      maxWidth: 200,
    });
    expect(result.width).toBeLessThanOrEqual(200);
    expect(result.height).toBeGreaterThan(50); // multiple lines
  });

  it('renders with background color', async () => {
    const { buffer } = await renderTextLabel({
      text: 'Badge',
      backgroundColor: '#ff0000',
    });
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
