import { GRID_SIZE, type Vector3Data } from '../engine/constants';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance3D(a: Vector3Data, b: Vector3Data): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function normalize2D(x: number, z: number): { x: number; z: number } {
  const len = Math.sqrt(x * x + z * z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: x / len, z: z / len };
}

export function gridToWorld(
  gridX: number,
  gridZ: number,
  cellSize: number,
): { x: number; z: number } {
  return {
    x: gridX * cellSize - (GRID_SIZE * cellSize) / 2 + cellSize / 2,
    z: gridZ * cellSize - (GRID_SIZE * cellSize) / 2 + cellSize / 2,
  };
}

export function worldToGrid(
  worldX: number,
  worldZ: number,
  cellSize: number,
): { x: number; z: number } {
  const halfGrid = (GRID_SIZE * cellSize) / 2;
  return {
    x: Math.floor((worldX + halfGrid) / cellSize),
    z: Math.floor((worldZ + halfGrid) / cellSize),
  };
}

export function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
