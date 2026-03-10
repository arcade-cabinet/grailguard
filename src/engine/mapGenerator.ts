import { GRID_SIZE, TILE } from './constants';

export type Grid = number[][];
export interface PathResult {
  grid: Grid;
  pathCoords: { x: number; z: number }[];
  spawnX: number;
  spawnZ: number;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

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

export function generateMap(seed = 42): PathResult {
  const rng = seededRng(seed);
  const grid: Grid = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(TILE.GRASS));

  const cx = 10;
  const cz = 10;
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) {
      grid[cx + dx][cz + dz] = TILE.SANCTUARY;
    }
  }

  const startZ = Math.floor(rng() * 14) + 3;
  grid[0][startZ] = TILE.SPAWN;

  // Scatter scenery FIRST before pathfinding, so pathfinding can route around it
  for (let x = 2; x < GRID_SIZE - 2; x++) {
    for (let z = 2; z < GRID_SIZE - 2; z++) {
      if (grid[x][z] === TILE.GRASS && rng() < 0.15) {
        grid[x][z] = TILE.SCENERY;
      }
    }
  }

  // Clear path area for A*
  const pathCoords = findPathAStar(grid, { x: 0, z: startZ }, { x: 10, z: 11 }) || [];

  // Mark path tiles in grid for visual
  for (const pt of pathCoords) {
    if (grid[pt.x][pt.z] === TILE.GRASS) {
      grid[pt.x][pt.z] = TILE.PATH;
    }
  }

  return { grid, pathCoords, spawnX: 0, spawnZ: startZ };
}

interface Node {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export function findPathAStar(
  grid: Grid,
  start: { x: number; z: number },
  goal: { x: number; z: number },
): { x: number; z: number }[] | null {
  const openList: Node[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: Node = { ...start, g: 0, h: 0, f: 0, parent: null };
  openList.push(startNode);

  while (openList.length > 0) {
    // Sort by f value (lowest first)
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    const key = `${current.x},${current.z}`;

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    // Goal check (adjacent to sanctuary or on it)
    if (
      grid[current.x]?.[current.z] === TILE.SANCTUARY ||
      (current.x === goal.x && current.z === goal.z)
    ) {
      const path: { x: number; z: number }[] = [];
      let curr: Node | null = current;
      while (curr) {
        path.unshift({ x: curr.x, z: curr.z });
        curr = curr.parent;
      }
      return path;
    }

    const neighbors = [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ];

    for (const neighbor of neighbors) {
      const { x, z } = neighbor;

      if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) continue;

      const tile = grid[x][z];
      // Blocking tiles: Building, Scenery, Barricade
      // Trolls might ignore Barricades, but general A* won't
      if (tile === TILE.BUILDING || tile === TILE.SCENERY || tile === TILE.BARRICADE) {
        continue;
      }

      const nKey = `${x},${z}`;
      if (closedSet.has(nKey)) continue;

      const g = current.g + 1;
      const h = Math.abs(x - goal.x) + Math.abs(z - goal.z);
      const f = g + h;

      openList.push({ x, z, g, h, f, parent: current });
    }
  }

  return null; // No path found
}
