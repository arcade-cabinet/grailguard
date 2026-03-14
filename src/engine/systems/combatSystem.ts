/**
 * @module combatSystem
 *
 * Pure functions for target finding, damage calculation, status effect
 * processing, and boss AoE logic. No ECS imports or side effects.
 */

import combatConfig from '../../data/combatConfig.json';
import dropConfig from '../../data/dropConfig.json';
import siegeTargeting from '../../data/siegeTargeting.json';
import type { BuildingType, EnemyAffix, Faction, UnitType } from '../constants';
import type { Rng } from './rng';

const {
  meleeSearchRange,
  rangedSearchRange,
  wallPriorityRange,
  poisonDamageRate,
  poisonDecayRate,
  bossAoeRadius,
  vampiricHealPercent,
  armoredDamageReduction,
  regeneratingHpPerSec,
} = combatConfig;

/** Minimal unit data needed for pure combat computations. */
export interface CombatUnit {
  id: number;
  type: UnitType;
  team: Faction;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  range: number;
  atkSpd: number;
  isRanged: boolean;
  isHealer: boolean;
  affix?: EnemyAffix;
  poison: number;
  frozen: number;
  invulnerable: number;
  slowed: number;
  cooldown: number;
  pathIndex: number;
  timeAlive: number;
}

/** A positioned combat entity for pure target-finding. */
export interface CombatEntity {
  id: number;
  x: number;
  z: number;
  unit: CombatUnit;
}

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Finds the best combat target for a unit from a list of candidates.
 * Pure function with no ECS queries or side effects.
 *
 * @param attacker - The attacking entity with position and unit data.
 * @param candidates - All potential targets (both teams, including attacker).
 * @returns The best target entity, or undefined if none found.
 */
export function findCombatTargetPure(
  attacker: CombatEntity,
  candidates: CombatEntity[],
): CombatEntity | undefined {
  const unit = attacker.unit;
  const searchRange = unit.isRanged ? rangedSearchRange : meleeSearchRange;

  let bestTarget: CombatEntity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.id === attacker.id) continue;
    const cu = candidate.unit;
    if (cu.hp <= 0) continue;

    if (unit.isHealer) {
      if (cu.team !== 'ally' || cu.hp >= cu.maxHp) continue;
      const dist = distance2D(attacker, candidate);
      if (dist <= unit.range && dist < bestDistance) {
        bestTarget = candidate;
        bestDistance = dist;
      }
      continue;
    }

    if (cu.team === unit.team) continue;
    const dist = distance2D(attacker, candidate);

    // Enemies prioritize walls when close
    if (unit.team === 'enemy' && cu.type === 'wall' && dist < wallPriorityRange) {
      bestTarget = candidate;
      bestDistance = dist;
      break;
    }

    if (dist <= searchRange && dist < bestDistance) {
      bestTarget = candidate;
      bestDistance = dist;
    }
  }

  return bestTarget;
}

/**
 * Calculates the actual damage dealt after armor reduction.
 *
 * @param baseDamage - The raw damage amount.
 * @param isArmored - Whether the target has the 'armored' affix.
 * @param isMagic - Whether the attack bypasses armor (magic/heal).
 * @returns The final damage amount.
 */
export function calculateDamage(baseDamage: number, isArmored: boolean, isMagic: boolean): number {
  if (isArmored && !isMagic) {
    return Math.max(1, Math.floor(baseDamage * armoredDamageReduction));
  }
  return baseDamage;
}

/**
 * Calculates the vampiric heal amount from damage dealt.
 *
 * @param damageDealt - The damage that was applied to the target.
 * @returns The HP to restore to the attacker.
 */
export function calculateVampiricHeal(damageDealt: number): number {
  return Math.floor(damageDealt * vampiricHealPercent);
}

/**
 * Processes status effects (poison, regeneration, freeze) for a single unit
 * over a time step. Returns the updated values without mutating the input.
 *
 * @param state - Current unit status effect state.
 * @param dt - Delta time in seconds.
 * @returns Updated status values.
 */
export function processStatusEffects(
  state: {
    hp: number;
    maxHp?: number;
    poison: number;
    frozen: number;
    slowed: number;
    affix?: EnemyAffix;
  },
  dt: number,
): { hp: number; poison: number; frozen: number; slowed: number } {
  let { hp, poison, frozen, slowed } = state;

  // Poison tick
  if (poison > 0) {
    const pDmg = poison * poisonDamageRate * dt;
    hp -= pDmg;
    poison = Math.max(0, poison - dt * poisonDecayRate);
  }

  // Regeneration
  if (state.affix === 'regenerating' && state.maxHp !== undefined && hp < state.maxHp && hp > 0) {
    hp = Math.min(state.maxHp, hp + regeneratingHpPerSec * dt);
  }

  // Freeze decay
  if (frozen > 0) {
    frozen -= dt;
  }

  return { hp, poison, frozen, slowed };
}

/**
 * Computes boss AoE damage results for all allies in radius.
 *
 * @param bossPos - The boss unit's position.
 * @param bossDamage - The boss's base damage.
 * @param allies - Array of ally positions with invulnerability state.
 * @returns Array of damage results for each hit ally.
 */
export function processBossAoe(
  bossPos: { x: number; z: number },
  bossDamage: number,
  allies: Array<{ id: number; x: number; z: number; invulnerable: number }>,
): Array<{ id: number; damage: number }> {
  const results: Array<{ id: number; damage: number }> = [];

  for (const ally of allies) {
    if (ally.invulnerable > 0) continue;
    if (distance2D(bossPos, ally) < bossAoeRadius) {
      results.push({ id: ally.id, damage: bossDamage });
    }
  }

  return results;
}

/** A positioned building for siege target selection. */
export interface SiegeBuilding {
  id: number;
  type: BuildingType;
  x: number;
  z: number;
}

/**
 * Selects the best siege target for an enemy type based on per-enemy-type
 * building priorities from siegeTargeting.json. Enemies switch to siege
 * when no enemy units are in range.
 *
 * Priority rules:
 * - orc: hut, range
 * - troll: range, temple, keep
 * - boss: keep
 * - goblin: nearest (any building)
 *
 * Falls back to nearest building if no priority buildings exist.
 *
 * @param enemyType - The enemy unit type.
 * @param buildings - Array of positioned buildings.
 * @param enemyPos - The enemy's current position.
 * @returns The target building, or undefined if no buildings available.
 */
export function selectSiegeTarget(
  enemyType: UnitType,
  buildings: SiegeBuilding[],
  enemyPos: { x: number; z: number },
): SiegeBuilding | undefined {
  if (buildings.length === 0) return undefined;

  const config = siegeTargeting[enemyType as keyof typeof siegeTargeting];
  const priorities: string[] = config?.priorities ?? ['nearest'];

  // "nearest" means pick the closest building regardless of type
  if (priorities[0] === 'nearest') {
    return findNearest(buildings, enemyPos);
  }

  // Try each priority type in order, pick nearest of that type
  for (const priority of priorities) {
    const candidates = buildings.filter((b) => b.type === priority);
    if (candidates.length > 0) {
      return findNearest(candidates, enemyPos);
    }
  }

  // Fallback: nearest building of any type
  return findNearest(buildings, enemyPos);
}

/** Returns the nearest building to a position. */
function findNearest(
  buildings: SiegeBuilding[],
  pos: { x: number; z: number },
): SiegeBuilding | undefined {
  let best: SiegeBuilding | undefined;
  let bestDist = Infinity;
  for (const b of buildings) {
    const d = distance2D(pos, b);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

/** Drop type identifiers from dropConfig.json. */
export type DropType = keyof typeof dropConfig;

/**
 * Rolls for a rare item drop when an enemy is killed. Uses a seeded PRNG
 * for determinism. The "golden_age" relic doubles all drop chances.
 *
 * @param rng - A seeded PRNG instance.
 * @param relics - Array of active relic IDs.
 * @returns The drop type string, or null if nothing dropped.
 */
export function rollDrop(rng: Rng, relics: string[]): DropType | null {
  const multiplier = relics.includes('golden_age') ? 2 : 1;
  const roll = rng.next();

  let cumulative = 0;
  for (const [dropType, config] of Object.entries(dropConfig)) {
    cumulative += (config as { chance: number }).chance * multiplier;
    if (roll < cumulative) {
      return dropType as DropType;
    }
  }

  return null;
}
