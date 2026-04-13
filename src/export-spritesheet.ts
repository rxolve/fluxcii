import sharp from 'sharp';

export type SpritesheetLayout = 'horizontal' | 'vertical' | 'grid';

export interface SpritesheetOptions {
  layout?: SpritesheetLayout;
  columns?: number;
}

export interface SpritesheetResult {
  buffer: Buffer;
  columns: number;
  rows: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export async function createSpritesheet(
  pngBuffers: Buffer[],
  frameWidth: number,
  frameHeight: number,
  options?: SpritesheetOptions,
): Promise<SpritesheetResult> {
  const layout = options?.layout ?? 'horizontal';
  const count = pngBuffers.length;

  let columns: number;
  let rows: number;

  switch (layout) {
    case 'horizontal':
      columns = count;
      rows = 1;
      break;
    case 'vertical':
      columns = 1;
      rows = count;
      break;
    case 'grid':
      columns = options?.columns ?? Math.ceil(Math.sqrt(count));
      rows = Math.ceil(count / columns);
      break;
  }

  const width = columns * frameWidth;
  const height = rows * frameHeight;

  const composites: sharp.OverlayOptions[] = pngBuffers.map((buf, i) => ({
    input: buf,
    left: (i % columns) * frameWidth,
    top: Math.floor(i / columns) * frameHeight,
  }));

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return {
    buffer,
    columns,
    rows,
    width,
    height,
    frameWidth,
    frameHeight,
    frameCount: count,
  };
}
