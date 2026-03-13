/**
 * @module mapGenerator
 *
 * Procedural road generation for Grailguard maps. Given a string seed and a
 * map size, produces a winding path of {@link THREE.Vector3} waypoints that
 * starts near one edge of the map and terminates at the sanctuary at the
 * origin (0, 0, 0). The road is used both for enemy pathfinding and for
 * building placement validation.
 *
 * Deterministic: the same seed always produces the same road layout.
 */

import * as THREE from 'three';

/**
 * Creates a seeded pseudo-random number generator using the Mulberry32
 * algorithm. Returns a closure that produces a new float in [0, 1) on each
 * call, advancing internal state deterministically.
 *
 * @param seed - 32-bit integer seed value.
 * @returns A stateful function that returns the next pseudo-random number.
 */
function mulberry32(seed: number) {
  let currentSeed = seed;
  return () => {
    currentSeed += 0x6d2b79f5;
    let t = currentSeed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts an arbitrary string into a 32-bit integer hash using a
 * shift-and-add variant (DJB2-like). Used to derive a numeric PRNG seed
 * from a human-readable seed string.
 *
 * @param str - The string to hash.
 * @returns A 32-bit signed integer hash.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Generates the sequence of road waypoints for a game map. The road begins
 * near the edge of the map (the enemy spawn point) and winds through 4--6
 * randomly offset midpoints before ending at the sanctuary at the origin.
 *
 * The Y coordinate of every point is fixed at 0.5 (slightly above ground
 * level) so the road mesh sits cleanly on the terrain.
 *
 * @param seedStr - Seed string used to deterministically generate the road.
 * @param mapSize - Side length of the square map in world units.
 * @returns An ordered array of waypoints from spawn to sanctuary.
 *
 * @example
 * ```ts
 * const road = generateRoadPoints('my-seed', 100);
 * // road[0] is the spawn position, road[road.length - 1] is (0, 0.5, 0)
 * ```
 */
export function generateRoadPoints(seedStr: string, mapSize: number): THREE.Vector3[] {
  const seed = hashString(seedStr);
  const rand = mulberry32(seed);

  const points: THREE.Vector3[] = [];

  const halfSize = mapSize / 2;
  // Starting point (Edge of map)
  const startX = -halfSize * 0.9 + (rand() * (mapSize * 0.1) - mapSize * 0.05);
  const startZ = halfSize * 0.9 + (rand() * (mapSize * 0.1) - mapSize * 0.05);
  points.push(new THREE.Vector3(startX, 0.5, startZ));

  // Intermediate winding points
  const numMidPoints = 4 + Math.floor(rand() * 3); // 4 to 6 midpoints

  for (let i = 1; i <= numMidPoints; i++) {
    const t = i / (numMidPoints + 1); // 0.0 to 1.0 progress

    // Interpolate towards center
    const baseX = startX * (1 - t);
    const baseZ = startZ * (1 - t);

    // Add S-Curve winding offset perpendicular to the main vector
    const angle = t * Math.PI * 2 * (rand() > 0.5 ? 1 : -1);
    const offsetMag = mapSize * 0.15 + rand() * (mapSize * 0.15);

    const x = baseX + Math.cos(angle) * offsetMag;
    const z = baseZ + Math.sin(angle) * offsetMag;

    points.push(new THREE.Vector3(x, 0.5, z));
  }

  // Sanctuary at 0,0
  points.push(new THREE.Vector3(0, 0.5, 0));

  return points;
}
