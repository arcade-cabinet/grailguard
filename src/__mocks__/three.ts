/**
 * Minimal THREE.js mock for unit tests that import textureUtils or other
 * modules depending on `three`.
 */
export class DataTexture {
  data: Uint8Array;
  width: number;
  height: number;
  format: number;
  wrapS = 0;
  wrapT = 0;
  needsUpdate = false;
  constructor(data: Uint8Array, width: number, height: number, _format?: number) {
    this.data = data;
    this.width = width;
    this.height = height;
    this.format = _format ?? 0;
  }
}

export class Color {
  r: number;
  g: number;
  b: number;
  constructor(r = 0, g = 0, b = 0) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

export const RGBAFormat = 1023;
export const RepeatWrapping = 1000;
