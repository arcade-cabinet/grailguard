import { GRID_SIZE } from '../../engine/constants';
import {
  clamp,
  distance3D,
  gridToWorld,
  lerp,
  lerpColor,
  normalize2D,
  worldToGrid,
} from '../../utils/math';

describe('math utilities', () => {
  describe('lerp', () => {
    it('returns a when t=0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
    });

    it('returns b when t=1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
    });

    it('returns midpoint when t=0.5', () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
    });

    it('extrapolates beyond [0,1]', () => {
      expect(lerp(0, 10, 2)).toBe(20);
      expect(lerp(0, 10, -1)).toBe(-10);
    });
  });

  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps to max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles min === max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });

  describe('distance3D', () => {
    it('returns 0 for same point', () => {
      const p = { x: 1, y: 2, z: 3 };
      expect(distance3D(p, p)).toBe(0);
    });

    it('computes correct distance', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 1, y: 2, z: 2 };
      expect(distance3D(a, b)).toBe(3); // √(1+4+4) = 3
    });

    it('is symmetric', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: 5, z: 6 };
      expect(distance3D(a, b)).toBeCloseTo(distance3D(b, a));
    });
  });

  describe('normalize2D', () => {
    it('normalizes a simple vector', () => {
      const n = normalize2D(3, 4);
      expect(n.x).toBeCloseTo(0.6);
      expect(n.z).toBeCloseTo(0.8);
    });

    it('returns zero vector for zero input', () => {
      const n = normalize2D(0, 0);
      expect(n.x).toBe(0);
      expect(n.z).toBe(0);
    });

    it('produces unit length', () => {
      const n = normalize2D(7, 11);
      const len = Math.sqrt(n.x * n.x + n.z * n.z);
      expect(len).toBeCloseTo(1.0);
    });
  });

  describe('gridToWorld / worldToGrid roundtrip', () => {
    const cellSize = 2.5;

    it('converts grid (0,0) correctly', () => {
      const w = gridToWorld(0, 0, cellSize);
      // x = 0*2.5 - (22*2.5)/2 + 2.5/2 = -27.5 + 1.25 = -26.25
      expect(w.x).toBeCloseTo(-26.25);
      expect(w.z).toBeCloseTo(-26.25);
    });

    it('roundtrips for all grid cells', () => {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        for (let gz = 0; gz < GRID_SIZE; gz++) {
          const world = gridToWorld(gx, gz, cellSize);
          const grid = worldToGrid(world.x, world.z, cellSize);
          expect(grid.x).toBe(gx);
          expect(grid.z).toBe(gz);
        }
      }
    });

    it('center cell maps to approximately (0,0) in world space', () => {
      const mid = Math.floor(GRID_SIZE / 2);
      const w = gridToWorld(mid, mid, cellSize);
      // Should be close to origin (within one cell)
      expect(Math.abs(w.x)).toBeLessThan(cellSize);
      expect(Math.abs(w.z)).toBeLessThan(cellSize);
    });
  });

  describe('lerpColor', () => {
    it('returns first color at t=0', () => {
      const result = lerpColor([255, 0, 0], [0, 255, 0], 0);
      expect(result).toEqual([255, 0, 0]);
    });

    it('returns second color at t=1', () => {
      const result = lerpColor([255, 0, 0], [0, 255, 0], 1);
      expect(result).toEqual([0, 255, 0]);
    });

    it('returns midpoint at t=0.5', () => {
      const result = lerpColor([0, 0, 0], [100, 200, 100], 0.5);
      expect(result[0]).toBeCloseTo(50);
      expect(result[1]).toBeCloseTo(100);
      expect(result[2]).toBeCloseTo(50);
    });
  });
});
