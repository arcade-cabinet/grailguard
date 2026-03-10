import { type Entity, HP_SCALE_PER_WAVE, type UNIT_STATS, type Vector3Data } from './constants';

/**
 * Compute the Euclidean distance between two points using their X and Z coordinates.
 *
 * @returns The distance between `a` and `b` calculated from their `x` and `z` components
 */
export function distance2D(a: Vector3Data, b: Vector3Data): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Selects the most appropriate target Entity for the given unit based on role, team, and proximity.
 *
 * Healers target an allied unit within their attackRange that has the lowest HP-to-maxHP ratio below 1.0.
 * Enemy units will prioritize an allied wall within 1.5 units if present; otherwise units target the closest alive enemy within their attackRange.
 *
 * @param unit - The unit seeking a target
 * @param all - Array of all entities to consider
 * @returns The chosen `Entity` target, or `null` if no valid target is found
 */
export function findTarget(unit: Entity, all: Entity[]): Entity | null {
  const alive = all.filter((e) => e.hp > 0 && e.id !== unit.id);

  if (unit.isHealer) {
    // Cleric: find closest ally with lowest hp ratio
    const allies = alive.filter((e) => e.team === unit.team);
    let best: Entity | null = null;
    let bestScore = Infinity;
    for (const a of allies) {
      const d = distance2D(unit.position, a.position);
      if (d <= unit.attackRange) {
        const ratio = a.hp / a.maxHp;
        if (ratio < 1.0 && ratio < bestScore) {
          bestScore = ratio;
          best = a;
        }
      }
    }
    return best;
  }

  if (unit.team === 'enemy') {
    // Check for ally walls within 1.5 units first
    const walls = alive.filter(
      (e) => e.team === 'ally' && e.type === 'wall' && distance2D(unit.position, e.position) <= 1.5,
    );
    if (walls.length > 0) return walls[0];
  }

  // Standard: closest alive enemy within attackRange
  const enemies = alive.filter((e) => e.team !== unit.team);
  let best: Entity | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = distance2D(unit.position, e.position);
    if (d <= unit.attackRange && d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

/**
 * Computes a separation force vector that pushes `unit` away from nearby entities.
 *
 * The returned vector is the sum of repulsive contributions from each other entity
 * whose XZ-plane distance to `unit` is less than `separationRadius`. Each contribution
 * scales with proximity (stronger when closer) and the `strength` multiplier.
 *
 * @param unit - The entity to compute the separation force for
 * @param all - All entities to consider when calculating repulsion
 * @param separationRadius - Distance within which other entities contribute to the force
 * @param strength - Multiplier applied to each repulsive contribution
 * @returns A Vector3Data `{ x, y: 0, z }` representing the separation force on the XZ plane
 */
export function applySeparation(
  unit: Entity,
  all: Entity[],
  separationRadius = 1.2,
  strength = 0.5,
): Vector3Data {
  let fx = 0;
  let fz = 0;
  for (const other of all) {
    if (other.id === unit.id) continue;
    const dx = unit.position.x - other.position.x;
    const dz = unit.position.z - other.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > 0 && d < separationRadius) {
      const factor = (separationRadius - d) / separationRadius;
      fx += (dx / d) * factor * strength;
      fz += (dz / d) * factor * strength;
    }
  }
  return { x: fx, y: 0, z: fz };
}

/**
 * Scale an enemy's base hit points based on the current wave number.
 *
 * @param baseHp - The unit's base hit points
 * @param wave - The current wave number (0-based)
 * @returns The scaled hit points rounded to the nearest integer
 */
export function scaleEnemyHp(baseHp: number, wave: number): number {
  return Math.round(baseHp * (1.0 + wave * HP_SCALE_PER_WAVE));
}

/**
 * Builds a pool of enemy unit type keys appropriate for the specified wave.
 *
 * The returned array represents the spawn pool for that wave:
 * - Every 5th wave greater than 0 is a boss wave and includes ['boss', 'orc', 'orc', 'goblin', 'goblin'].
 * - Waves 0–2 fill the pool with 3 + wave 'goblin' entries.
 * - Waves 3–5 include two 'orc' and 2 + wave 'goblin' entries.
 * - Waves 6 and above include one 'troll', two 'orc', and `wave` many 'goblin' entries.
 *
 * @param wave - The current wave number (integer, typically >= 0).
 * @returns An array of keys from UNIT_STATS representing enemy types for the wave.
 */
export function getWaveEnemyTypes(wave: number): Array<keyof typeof UNIT_STATS> {
  const pool: Array<keyof typeof UNIT_STATS> = [];
  const isBossWave = wave % 5 === 0 && wave > 0;

  if (isBossWave) {
    pool.push('boss');
    pool.push('orc', 'orc', 'goblin', 'goblin');
  } else if (wave < 3) {
    for (let i = 0; i < 3 + wave; i++) pool.push('goblin');
  } else if (wave < 6) {
    for (let i = 0; i < 2; i++) pool.push('orc');
    for (let i = 0; i < 2 + wave; i++) pool.push('goblin');
  } else {
    pool.push('troll');
    for (let i = 0; i < 2; i++) pool.push('orc');
    for (let i = 0; i < wave; i++) pool.push('goblin');
  }

  return pool;
}
