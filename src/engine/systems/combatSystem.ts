/**
 * @module combatSystem
 *
 * Pure functions for target finding, damage calculation, status effect
 * processing, and boss AoE logic. No ECS imports or side effects.
 */

import combatConfig from '../../data/combatConfig.json';
import type { UnitType, EnemyAffix, Faction } from '../constants';

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
export function calculateDamage(
  baseDamage: number,
  isArmored: boolean,
  isMagic: boolean,
): number {
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
