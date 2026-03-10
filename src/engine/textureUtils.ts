import * as THREE from 'three';

// Simple pseudo-random value noise (seeded)
function valueNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

export type TextureType =
  | 'grass_col'
  | 'grass_rgh'
  | 'grass_nrm'
  | 'dirt_col'
  | 'dirt_rgh'
  | 'stone_col'
  | 'stone_rgh'
  | 'wood_col'
  | 'wood_rgh';

export function generateNoiseTexture(
  type: TextureType,
  width = 128,
  height = 128,
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const n = fbm(nx * 4, ny * 4);

      let r = 0,
        g = 0,
        b = 0,
        a = 255;

      switch (type) {
        case 'grass_col': {
          r = Math.round(30 + n * 60);
          g = Math.round(80 + n * 80);
          b = Math.round(20 + n * 30);
          break;
        }
        case 'grass_rgh': {
          const v = Math.round(150 + n * 80);
          r = g = b = v;
          break;
        }
        case 'grass_nrm': {
          r = Math.round(128 + (fbm(nx * 4 + 0.1, ny * 4) - 0.5) * 80);
          g = Math.round(128 + (fbm(nx * 4, ny * 4 + 0.1) - 0.5) * 80);
          b = 255;
          break;
        }
        case 'dirt_col': {
          r = Math.round(100 + n * 60);
          g = Math.round(70 + n * 40);
          b = Math.round(30 + n * 20);
          break;
        }
        case 'dirt_rgh': {
          const v = Math.round(180 + n * 60);
          r = g = b = v;
          break;
        }
        case 'stone_col': {
          const v = Math.round(80 + n * 80);
          r = g = b = v;
          break;
        }
        case 'stone_rgh': {
          const v = Math.round(120 + n * 100);
          r = g = b = v;
          break;
        }
        case 'wood_col': {
          r = Math.round(120 + n * 60);
          g = Math.round(70 + n * 30);
          b = Math.round(30 + n * 20);
          break;
        }
        case 'wood_rgh': {
          const v = Math.round(100 + n * 120);
          r = g = b = v;
          break;
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
