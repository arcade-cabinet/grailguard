/**
 * @module projectileSystem
 *
 * Pure functions for projectile movement, hit detection, and impact
 * processing (damage, splash, heal, poison, slow). No ECS access.
 */

import combatConfig from '../../data/combatConfig.json';
import type { Faction } from '../constants';

const { poisonAmount, slowDuration } = combatConfig;

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

/** The data carried by a projectile, without position. */
export interface ProjectileData {
  damage: number;
  isHeal: boolean;
  isPoison: boolean;
  splashRadius: number;
  isSlow: boolean;
  color: string;
}

/** Result of moving a projectile one step. */
export interface MoveResult {
  x: number;
  y: number;
  z: number;
  hit: boolean;
}

/** Result of a projectile impacting its target. */
export interface ImpactResult {
  directDamage: number;
  isHeal: boolean;
  applyPoison: boolean;
  applySlow: boolean;
  poisonAmount: number;
  slowDuration: number;
  splashTargets: Array<{ id: number; damage: number }>;
  color: string;
}

/** Hit threshold for projectile arrival. */
const HIT_THRESHOLD = 1.0;

/**
 * Moves a projectile toward its target for one frame.
 *
 * @param pos - Current projectile position.
 * @param targetPos - Target position.
 * @param speed - Projectile speed.
 * @param dt - Delta time in seconds.
 * @returns New position and whether the projectile has hit.
 */
export function moveProjectile(
  pos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  speed: number,
  dt: number,
): MoveResult {
  const dist = distance2D(pos, targetPos);

  if (dist < HIT_THRESHOLD) {
    return { x: pos.x, y: pos.y, z: pos.z, hit: true };
  }

  const moved = moveTowards(pos, targetPos, speed * dt);
  const newY =
    pos.y + (targetPos.y + 0.5 - pos.y) * Math.min(1, (speed * dt) / Math.max(0.1, dist));

  return { x: moved.x, y: newY, z: moved.z, hit: false };
}

/**
 * Processes a projectile impact: computes direct damage, splash damage,
 * and status effects to apply.
 *
 * @param proj - Projectile data.
 * @param target - The primary target's id and team.
 * @param targetPos - Position of the primary target.
 * @param nearbyUnits - All nearby units for splash calculation.
 * @returns Impact results to be applied by the caller.
 */
export function processImpact(
  proj: ProjectileData,
  target: { id: number; team: Faction },
  targetPos: { x: number; z: number },
  nearbyUnits: Array<{ id: number; team: Faction; x: number; z: number }>,
): ImpactResult {
  const result: ImpactResult = {
    directDamage: 0,
    isHeal: proj.isHeal,
    applyPoison: false,
    applySlow: false,
    poisonAmount: 0,
    slowDuration: 0,
    splashTargets: [],
    color: proj.color,
  };

  if (proj.splashRadius > 0) {
    // Splash: damage all same-team units in radius
    for (const unit of nearbyUnits) {
      if (unit.team === target.team && distance2D(targetPos, unit) <= proj.splashRadius) {
        result.splashTargets.push({ id: unit.id, damage: proj.damage });
      }
    }
    // directDamage is 0 for splash (handled via splashTargets)
  } else {
    result.directDamage = proj.damage;
    if (proj.isPoison) {
      result.applyPoison = true;
      result.poisonAmount = poisonAmount;
    }
    if (proj.isSlow) {
      result.applySlow = true;
      result.slowDuration = slowDuration;
    }
  }

  return result;
}
