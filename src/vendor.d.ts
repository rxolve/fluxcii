declare module 'gifenc' {
  interface GIFEncoderInstance {
    writeFrame(
      indexed: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: number[][]; delay?: number; repeat?: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    buffer: ArrayBuffer;
    stream: unknown;
    writeHeader(): void;
    reset(): void;
  }

  interface Gifenc {
    GIFEncoder(): GIFEncoderInstance;
    quantize(rgba: Uint8Array, maxColors: number, options?: Record<string, unknown>): number[][];
    applyPalette(rgba: Uint8Array, palette: number[][]): Uint8Array;
  }

  const gifenc: Gifenc;
  export default gifenc;
}

declare module 'sharp-apng' {
  import type sharp from 'sharp';

  interface ApngOptions {
    delay?: number | number[];
    repeat?: number;
    dispose?: number;
    blend?: number;
  }

  function framesToApng(
    images: sharp.Sharp[],
    options?: ApngOptions,
  ): Promise<{ buffer: Buffer }>;

  function sharpToApng(
    images: sharp.Sharp[],
    options?: ApngOptions,
  ): Promise<{ buffer: Buffer }>;

  export { framesToApng, sharpToApng };
}
