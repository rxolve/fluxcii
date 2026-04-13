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

declare module 'upng-js' {
  function encode(
    frames: ArrayLike<ArrayBuffer | Buffer>[],
    width: number,
    height: number,
    cnum: number,
    delays: number[],
  ): ArrayBuffer;

  export { encode };
}
