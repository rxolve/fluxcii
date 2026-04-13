import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

/**
 * Generate a sprite sheet image via Gemini image generation.
 */
export async function generateSpriteSheet(
  prompt: string,
  frames: number,
  apiKey: string,
): Promise<Buffer> {
  const enhanced = `${prompt}, pixel art sprite sheet, side profile, ${frames} frames in a single horizontal row, white background, evenly spaced, consistent character size, no text, no labels`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp-image-generation',
    contents: enhanced,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('Gemini returned no content');

  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini returned no image data');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

/**
 * Slice a horizontal sprite sheet into individual frame buffers.
 */
export async function sliceSpriteSheet(
  buffer: Buffer,
  frameCount: number,
): Promise<Buffer[]> {
  const trimmed = await sharp(buffer)
    .trim({ threshold: 30 })
    .toBuffer({ resolveWithObject: true });

  const tW = trimmed.info.width;
  const tH = trimmed.info.height;
  const frameW = Math.floor(tW / frameCount);

  const frames: Buffer[] = [];
  for (let i = 0; i < frameCount; i++) {
    const left = i * frameW;
    const width = i < frameCount - 1 ? frameW : tW - left;
    const frame = await sharp(trimmed.data)
      .extract({ left, top: 0, width, height: tH })
      .png()
      .toBuffer();
    frames.push(frame);
  }
  return frames;
}

/**
 * Remove white/near-white background pixels by making them transparent.
 */
export async function removeWhiteBg(buf: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 230 && g > 230 && b > 230) {
      data[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      data[i + 3] = Math.round(255 * (1 - (r + g + b - 630) / (690 - 630)));
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Build the enhanced prompt string (exported for testing).
 */
export function buildPrompt(prompt: string, frames: number): string {
  return `${prompt}, pixel art sprite sheet, side profile, ${frames} frames in a single horizontal row, white background, evenly spaced, consistent character size, no text, no labels`;
}
