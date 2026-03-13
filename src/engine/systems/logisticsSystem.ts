/**
 * @module logisticsSystem
 *
 * Pure functions for BFS track pathfinding, cart movement, and resource
 * delivery calculations. No ECS or world access.
 */

import economyConfig from '../../data/economyConfig.json';

const { deliveries } = economyConfig;

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function moveTowards(
  position: { x: number; z: number },
  target: { x: number; z: number },
  step: number,
) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const length = Math.hypot(dx, dz);
  if (length <= 0.001) return { x: position.x, z: position.z };
  const ratio = Math.min(1, step / length);
  return { x: position.x + dx * ratio, z: position.z + dz * ratio };
}

/** Maximum distance between adjacent track nodes for BFS traversal. */
const ADJACENCY_DISTANCE = 6;

/**
 * BFS pathfinding from a source building through track nodes to a sink
 * (sanctuary or mint). Pure function: takes all state as parameters.
 *
 * @param startPos - The source building's position.
 * @param resourceType - Resource type ('wood', 'ore', 'gem').
 * @param trackNodes - All track building positions.
 * @param mintPositions - All mint building positions (for ore routing).
 * @param sanctuaryPos - The sanctuary position (default sink).
 * @returns An array of waypoints forming the path, or null if no path.
 */
export function findLogisticsPathPure(
  startPos: { x: number; z: number },
  resourceType: string,
  trackNodes: { x: number; z: number }[],
  mintPositions: { x: number; z: number }[],
  sanctuaryPos: { x: number; z: number },
): { x: number; z: number }[] | null {
  const sinks: { x: number; z: number }[] = [
    {
      x: Math.round(sanctuaryPos.x / 5) * 5,
      z: Math.round(sanctuaryPos.z / 5) * 5,
    },
  ];

  if (resourceType === 'ore') {
    sinks.push(...mintPositions);
  }

  const queue: { pos: { x: number; z: number }; path: { x: number; z: number }[] }[] = [];
  const visited = new Set<string>();

  // Find tracks adjacent to startPos
  for (const track of trackNodes) {
    if (distance2D(startPos, track) < ADJACENCY_DISTANCE) {
      queue.push({ pos: track, path: [track] });
      visited.add(`${track.x},${track.z}`);
    }
  }

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { pos, path } = item;

    // Check if adjacent to sink
    for (const sink of sinks) {
      if (distance2D(pos, sink) < ADJACENCY_DISTANCE) {
        return [...path, sink];
      }
    }

    // Traverse adjacent tracks
    for (const track of trackNodes) {
      const key = `${track.x},${track.z}`;
      if (!visited.has(key) && distance2D(pos, track) < ADJACENCY_DISTANCE) {
        visited.add(key);
        queue.push({ pos: track, path: [...path, track] });
      }
    }
  }

  return null;
}

/**
 * Moves a cart one step along its path. Returns the new position,
 * path index, and whether the cart has arrived at its destination.
 *
 * @param pos - Current cart position.
 * @param path - The cart's waypoint path.
 * @param pathIndex - Current index into the path.
 * @param speed - Cart movement speed.
 * @param dt - Delta time in seconds.
 * @returns Updated position, pathIndex, and arrival flag.
 */
export function moveCartStep(
  pos: { x: number; z: number },
  path: { x: number; z: number }[],
  pathIndex: number,
  speed: number,
  dt: number,
): { x: number; z: number; pathIndex: number; arrived: boolean } {
  if (pathIndex >= path.length) {
    return { x: pos.x, z: pos.z, pathIndex, arrived: true };
  }

  const target = path[pathIndex];
  const dist = distance2D(pos, target);

  if (dist < 0.5) {
    const nextIndex = pathIndex + 1;
    if (nextIndex >= path.length) {
      return { x: pos.x, z: pos.z, pathIndex: nextIndex, arrived: true };
    }
    return { x: pos.x, z: pos.z, pathIndex: nextIndex, arrived: false };
  }

  const moved = moveTowards(pos, target, speed * dt);
  return { x: moved.x, z: moved.z, pathIndex, arrived: false };
}

/**
 * Calculates the resource delivery result when a cart arrives at a sink.
 *
 * @param resource - The resource type the cart carries.
 * @param isMint - Whether the destination is a mint (converts ore to gold).
 * @param hasBlessedPickaxe - Whether the player has the blessed_pickaxe relic.
 * @returns The delivery result with resource type, amount, and gold.
 */
export function calculateDelivery(
  resource: 'wood' | 'ore' | 'gem',
  isMint: boolean,
  hasBlessedPickaxe: boolean,
): { resource: string; amount: number; gold: number } {
  if (isMint && resource === 'ore') {
    return { resource: 'ore', amount: 0, gold: 15 };
  }

  let amount = deliveries[resource];
  if (resource === 'gem' && hasBlessedPickaxe) {
    amount = 2;
  }

  return { resource, amount, gold: 0 };
}
