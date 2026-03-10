import { Entity, Vector3Data, UNIT_STATS } from './constants';

export function distance2D(a: Vector3Data, b: Vector3Data): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function findTarget(
  unit: Entity,
  all: Entity[]
): Entity | null {
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
      (e) => e.team === 'ally' && e.type === 'wall' && distance2D(unit.position, e.position) <= 1.5
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

export function applySeparation(
  unit: Entity,
  all: Entity[],
  separationRadius = 1.2,
  strength = 0.5
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

export function scaleEnemyHp(baseHp: number, wave: number): number {
  return Math.round(baseHp * (1.0 + wave * 0.15));
}

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
