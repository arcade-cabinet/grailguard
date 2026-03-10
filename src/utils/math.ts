import { GRID_SIZE, type Vector3Data } from '../engine/constants';

/**
 * Linearly interpolates between two numbers.
 *
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor where 0 yields `a` and 1 yields `b`.
 * @returns The interpolated value; `a` when `t` is 0, `b` when `t` is 1.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamps a number to the inclusive range defined by `min` and `max`.
 *
 * @param value - The number to clamp
 * @param min - The lower bound of the range
 * @param max - The upper bound of the range
 * @returns The input value constrained to the inclusive range between `min` and `max`
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes the straight-line (Euclidean) distance between two 3D points.
 *
 * @param a - The first point with `x`, `y`, and `z` components
 * @param b - The second point with `x`, `y`, and `z` components
 * @returns The Euclidean distance between `a` and `b`
 */
export function distance3D(a: Vector3Data, b: Vector3Data): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Returns a unit vector in the XZ plane pointing in the same direction as the input.
 *
 * @param x - X component of the vector
 * @param z - Z component of the vector
 * @returns An object with `x` and `z` components representing the normalized vector; `{ x: 0, z: 0 }` if the input vector has length 0
 */
export function normalize2D(x: number, z: number): { x: number; z: number } {
  const len = Math.sqrt(x * x + z * z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: x / len, z: z / len };
}

/**
 * Convert integer grid coordinates to centered world-space coordinates.
 *
 * @param gridX - Column index on the grid (0-based)
 * @param gridZ - Row index on the grid (0-based)
 * @param cellSize - Size of a single grid cell in world units
 * @returns The world-space position `{ x, z }` corresponding to the center of the specified grid cell
 */
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

/**
 * Convert world-space XZ coordinates to grid cell indices using the configured grid size.
 *
 * @param worldX - X coordinate in world space
 * @param worldZ - Z coordinate in world space
 * @param cellSize - Size of a single grid cell in world units
 * @returns An object with `x` and `z` properties containing the grid indices for the given world coordinates
 */
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

/**
 * Interpolates between two RGB colors using linear interpolation per channel.
 *
 * @returns The resulting RGB color as `[r, g, b]`, where each channel is the linear interpolation of the corresponding channels in `a` and `b` using parameter `t`.
 */
export function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
