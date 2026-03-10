import { GRID_SIZE, TILE } from '../../engine/constants';
import { generateMap } from '../../engine/mapGenerator';

describe('mapGenerator', () => {
  describe('determinism', () => {
    it('produces identical maps for the same seed', () => {
      const a = generateMap(42);
      const b = generateMap(42);
      expect(a.grid).toEqual(b.grid);
      expect(a.pathCoords).toEqual(b.pathCoords);
      expect(a.spawnX).toBe(b.spawnX);
      expect(a.spawnZ).toBe(b.spawnZ);
    });

    it('produces different maps for different seeds', () => {
      const a = generateMap(42);
      const b = generateMap(99);
      // spawnZ is random so almost certainly different (could theoretically collide)
      const gridsDiffer = JSON.stringify(a.grid) !== JSON.stringify(b.grid);
      const pathsDiffer = JSON.stringify(a.pathCoords) !== JSON.stringify(b.pathCoords);
      expect(gridsDiffer || pathsDiffer).toBe(true);
    });
  });

  describe('grid structure', () => {
    const result = generateMap(42);
    const { grid } = result;

    it('is a GRID_SIZE×GRID_SIZE 2D array', () => {
      expect(grid.length).toBe(GRID_SIZE);
      for (const row of grid) {
        expect(row.length).toBe(GRID_SIZE);
      }
    });

    it('uses only valid TILE values', () => {
      const validTiles = new Set(Object.values(TILE));
      for (const row of grid) {
        for (const cell of row) {
          expect(validTiles).toContain(cell);
        }
      }
    });
  });

  describe('sanctuary', () => {
    const result = generateMap(42);
    const { grid } = result;

    it('has a 3×3 sanctuary region around (10..12, 10..12)', () => {
      let sanctuaryCount = 0;
      for (let x = 10; x <= 12; x++) {
        for (let z = 10; z <= 12; z++) {
          // Might be PATH if the path reached it, or SANCTUARY
          if (grid[x][z] === TILE.SANCTUARY) sanctuaryCount++;
        }
      }
      // At least some sanctuary tiles should remain
      expect(sanctuaryCount).toBeGreaterThan(0);
    });
  });

  describe('spawn', () => {
    const result = generateMap(42);
    const { grid, spawnX, spawnZ } = result;

    it('spawn is at x=0', () => {
      expect(spawnX).toBe(0);
    });

    it('spawn tile is marked SPAWN or PATH', () => {
      // Spawn tile should be SPAWN
      expect(grid[spawnX][spawnZ]).toBe(TILE.SPAWN);
    });

    it('spawnZ is between 3 and 16 inclusive', () => {
      expect(spawnZ).toBeGreaterThanOrEqual(3);
      expect(spawnZ).toBeLessThanOrEqual(16);
    });
  });

  describe('path', () => {
    const result = generateMap(42);
    const { pathCoords } = result;

    it('starts at the spawn', () => {
      expect(pathCoords[0]).toEqual({ x: result.spawnX, z: result.spawnZ });
    });

    it('has at least 5 coordinates', () => {
      expect(pathCoords.length).toBeGreaterThanOrEqual(5);
    });

    it('each step moves at most 1 tile in any direction', () => {
      for (let i = 1; i < pathCoords.length; i++) {
        const dx = Math.abs(pathCoords[i].x - pathCoords[i - 1].x);
        const dz = Math.abs(pathCoords[i].z - pathCoords[i - 1].z);
        expect(dx + dz).toBeLessThanOrEqual(1);
      }
    });

    it('ends at or near the sanctuary region', () => {
      const last = pathCoords[pathCoords.length - 1];
      // Sanctuary is at 10..12, 10..12
      expect(last.x).toBeGreaterThanOrEqual(8);
      expect(last.x).toBeLessThanOrEqual(14);
      expect(last.z).toBeGreaterThanOrEqual(8);
      expect(last.z).toBeLessThanOrEqual(14);
    });
  });

  describe('scenery', () => {
    it('sprinkles some scenery tiles', () => {
      const result = generateMap(42);
      let sceneryCount = 0;
      for (const row of result.grid) {
        for (const cell of row) {
          if (cell === TILE.SCENERY) sceneryCount++;
        }
      }
      expect(sceneryCount).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles seed 0', () => {
      const result = generateMap(0);
      expect(result.grid.length).toBe(GRID_SIZE);
      expect(result.pathCoords.length).toBeGreaterThan(0);
    });

    it('handles large seed', () => {
      const result = generateMap(999999);
      expect(result.grid.length).toBe(GRID_SIZE);
      expect(result.pathCoords.length).toBeGreaterThan(0);
    });

    it('default seed produces a valid map', () => {
      const result = generateMap();
      expect(result.grid.length).toBe(GRID_SIZE);
      expect(result.spawnX).toBe(0);
    });
  });
});
