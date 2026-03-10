import { GRID_SIZE, TILE } from './constants';

export type Grid = number[][];
export interface PathResult {
  grid: Grid;
  pathCoords: { x: number; z: number }[];
  spawnX: number;
  spawnZ: number;
}

/**
 * Creates a deterministic pseudorandom number generator seeded with the given value.
 *
 * @param seed - Integer seed used to initialize the generator
 * @returns A function that, when called, returns a pseudorandom number in the range [0, 1)
 */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Checks whether placing a PATH tile at the given coordinates would form a 2x2 block of PATH tiles.
 *
 * @param grid - The map grid to inspect
 * @param x - X coordinate of the candidate PATH tile
 * @param z - Z coordinate of the candidate PATH tile
 * @returns `true` if placing a PATH at (x, z) would create a 2x2 PATH block, `false` otherwise.
 */
function wouldCreate2x2(grid: Grid, x: number, z: number): boolean {
  const checks = [
    [x - 1, z - 1],
    [x - 1, z],
    [x, z - 1],
  ];
  for (const [cx, cz] of checks) {
    if (
      cx >= 0 &&
      cz >= 0 &&
      cx + 1 < GRID_SIZE &&
      cz + 1 < GRID_SIZE &&
      grid[cx][cz] === TILE.PATH &&
      grid[cx + 1][cz] === TILE.PATH &&
      grid[cx][cz + 1] === TILE.PATH &&
      grid[cx + 1][cz + 1] === TILE.PATH
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a deterministic square game map with a spawn, a 3x3 sanctuary, a path to that sanctuary, and scattered scenery.
 *
 * The map is created using a seeded RNG so the same `seed` produces the same layout. A spawn is placed at x=0 and a
 * random z between 3 and 16; a path is grown from the spawn toward the sanctuary center while avoiding 2x2 path blocks.
 * Remaining grass tiles are converted to scenery with a 15% probability.
 *
 * @param seed - Seed for the deterministic random number generator (default: 42)
 * @returns An object containing:
 *   - `grid`: the final tile grid
 *   - `pathCoords`: ordered coordinates of tiles that form the generated path (starting with the spawn)
 *   - `spawnX`, `spawnZ`: coordinates of the spawn tile
 */
export function generateMap(seed = 42): PathResult {
  const rng = seededRng(seed);
  const grid: Grid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(TILE.GRASS));

  // Sanctuary 3x3 around center (10,10) to (12,12)
  const cx = 10;
  const cz = 10;
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) {
      grid[cx + dx][cz + dz] = TILE.SANCTUARY;
    }
  }

  const sanctuaryCenter = { x: 11, z: 11 };

  // Start at X=0, Z=random(3,16)
  const startZ = Math.floor(rng() * 14) + 3;
  grid[0][startZ] = TILE.SPAWN;

  const pathCoords: { x: number; z: number }[] = [{ x: 0, z: startZ }];

  let curX = 0;
  let curZ = startZ;

  const maxSteps = GRID_SIZE * GRID_SIZE;
  let steps = 0;

  while (!(curX >= cx && curX <= cx + 2 && curZ >= cz && curZ <= cz + 2) && steps < maxSteps) {
    steps++;
    const dx = sanctuaryCenter.x - curX;
    const dz = sanctuaryCenter.z - curZ;

    // Build candidate moves weighted toward center
    const candidates: [number, number][] = [];
    const roll = rng();

    if (Math.abs(dx) > Math.abs(dz)) {
      // Prefer moving in X
      if (roll < 0.6 && dx !== 0) {
        candidates.push([curX + Math.sign(dx), curZ]);
      } else if (dz !== 0) {
        candidates.push([curX, curZ + Math.sign(dz)]);
      } else {
        candidates.push([curX + Math.sign(dx), curZ]);
      }
    } else {
      // Prefer moving in Z
      if (roll < 0.3 && dx !== 0) {
        candidates.push([curX + Math.sign(dx), curZ]);
      } else if (dz !== 0) {
        candidates.push([curX, curZ + Math.sign(dz)]);
      } else if (dx !== 0) {
        candidates.push([curX + Math.sign(dx), curZ]);
      }
    }

    // Also try perpendicular if blocked
    const fallbacks: [number, number][] = [
      [curX + 1, curZ],
      [curX, curZ + 1],
      [curX, curZ - 1],
    ];

    let moved = false;
    for (const [nx, nz] of [...candidates, ...fallbacks]) {
      if (
        nx >= 0 &&
        nx < GRID_SIZE &&
        nz >= 0 &&
        nz < GRID_SIZE &&
        grid[nx][nz] !== TILE.PATH &&
        grid[nx][nz] !== TILE.SPAWN
      ) {
        // Check if this tile is sanctuary territory - stop here
        if (grid[nx][nz] === TILE.SANCTUARY) {
          pathCoords.push({ x: nx, z: nz });
          curX = nx;
          curZ = nz;
          moved = true;
          break;
        }
        // Check 2x2 constraint
        grid[nx][nz] = TILE.PATH;
        if (!wouldCreate2x2(grid, nx, nz)) {
          pathCoords.push({ x: nx, z: nz });
          curX = nx;
          curZ = nz;
          moved = true;
          break;
        }
        grid[nx][nz] = TILE.GRASS;
      }
    }

    if (!moved) break;
  }

  // Scatter scenery on remaining grass tiles (15% chance)
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      if (grid[x][z] === TILE.GRASS && rng() < 0.15) {
        grid[x][z] = TILE.SCENERY;
      }
    }
  }

  return { grid, pathCoords, spawnX: 0, spawnZ: startZ };
}
