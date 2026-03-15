/**
 * @module spellSystem
 *
 * Pure functions for spell eligibility checks, spell effect computation,
 * and cooldown management. Consolidates all 7 spell casts into a single
 * dispatcher. No ECS or world access.
 */

import spellConfig from '../../data/spellConfig.json';
import type { Faction, UnitType } from '../constants';

const { spells } = spellConfig;

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Minimal target data for spell computations. */
export interface SpellTarget {
  id: number;
  team: Faction;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  type?: UnitType;
}

/** Result of computing a spell's effects. */
export interface SpellEffectResult {
  type: string;
  faithCost: number;
  cooldown: number;
  damageTargets: Array<{ id: number; damage: number }>;
  healTargets: Array<{ id: number; heal: number }>;
  freezeTargets: Array<{ id: number; freezeDuration: number }>;
  stunTargets: Array<{ id: number; stunDuration: number }>;
  shieldTargets: Array<{ id: number; duration: number }>;
  resetCooldownTargets: Array<{ id: number }>;
  cameraShake: number;
  /** ID of primary target for VFX positioning. */
  primaryTargetId?: number;
}

function emptyResult(spellId: string): SpellEffectResult {
  const config = (spells as Record<string, { faithCost: number; cooldown: number }>)[spellId];
  return {
    type: spellId,
    faithCost: config?.faithCost ?? 0,
    cooldown: config?.cooldown ?? 0,
    damageTargets: [],
    healTargets: [],
    freezeTargets: [],
    stunTargets: [],
    shieldTargets: [],
    resetCooldownTargets: [],
    cameraShake: 0,
  };
}

/**
 * Checks whether a spell can be cast right now.
 *
 * @param spellId - The spell identifier.
 * @param faith - Current faith resource.
 * @param cooldowns - Current spell cooldown map.
 * @param gameOver - Whether the game is over.
 * @returns `true` if the spell can be cast.
 */
export function canCastSpell(
  spellId: string,
  faith: number,
  cooldowns: Record<string, number>,
  gameOver: boolean,
): boolean {
  if (gameOver) return false;
  const config = (spells as Record<string, { faithCost: number }>)[spellId];
  if (!config) return false;
  if ((cooldowns[spellId] ?? 0) > 0) return false;
  if (faith < config.faithCost) return false;
  return true;
}

/**
 * Computes the effects of casting a spell. Returns a pure data structure
 * describing all mutations to be applied by the caller.
 *
 * @param spellId - The spell to cast.
 * @param enemies - All enemy units with positions.
 * @param allies - All ally units with positions.
 * @param sanctuaryPos - Sanctuary position for targeting priority.
 * @returns The computed spell effect.
 */
export function computeSpellEffect(
  spellId: string,
  enemies: SpellTarget[],
  allies: SpellTarget[],
  sanctuaryPos: { x: number; z: number },
): SpellEffectResult {
  const result = emptyResult(spellId);

  switch (spellId) {
    case 'smite': {
      if (enemies.length === 0) return result;
      const sorted = [...enemies].sort(
        (a, b) => distance2D(a, sanctuaryPos) - distance2D(b, sanctuaryPos),
      );
      const targets = sorted.slice(0, (spells.smite as { targets: number }).targets);
      result.damageTargets = targets.map((t) => ({
        id: t.id,
        damage: (spells.smite as { damage: number }).damage,
      }));
      result.cameraShake = 4;
      if (targets[0]) result.primaryTargetId = targets[0].id;
      break;
    }

    case 'holy_nova': {
      for (const ally of allies) {
        if (ally.type !== 'wall') {
          result.healTargets.push({
            id: ally.id,
            heal: (spells.holy_nova as { healAmount: number }).healAmount,
          });
        }
      }
      break;
    }

    case 'zealous_haste': {
      for (const ally of allies) {
        result.resetCooldownTargets.push({ id: ally.id });
      }
      break;
    }

    case 'earthquake': {
      const cfg = spells.earthquake as { damage: number; stunDuration: number };
      for (const enemy of enemies) {
        result.damageTargets.push({ id: enemy.id, damage: cfg.damage });
        result.stunTargets.push({ id: enemy.id, stunDuration: cfg.stunDuration });
      }
      result.cameraShake = 8;
      break;
    }

    case 'chrono_shift': {
      const cfg = spells.chrono_shift as { freezeDuration: number };
      for (const enemy of enemies) {
        result.freezeTargets.push({ id: enemy.id, freezeDuration: cfg.freezeDuration });
      }
      break;
    }

    case 'meteor_strike': {
      if (enemies.length === 0) return result;
      const cfg = spells.meteor_strike as { damage: number; aoeRadius: number };
      const sorted = [...enemies].sort(
        (a, b) => distance2D(a, sanctuaryPos) - distance2D(b, sanctuaryPos),
      );
      const primary = sorted[0];
      result.primaryTargetId = primary.id;
      for (const enemy of enemies) {
        if (distance2D(primary, enemy) < cfg.aoeRadius) {
          result.damageTargets.push({ id: enemy.id, damage: cfg.damage });
        }
      }
      result.cameraShake = 8;
      break;
    }

    case 'divine_shield': {
      const cfg = spells.divine_shield as { duration: number };
      for (const ally of allies) {
        result.shieldTargets.push({ id: ally.id, duration: cfg.duration });
      }
      break;
    }
  }

  return result;
}

/**
 * Decrements all spell cooldowns by dt, clamping at 0.
 *
 * @param cooldowns - Current cooldown map.
 * @param dt - Delta time in seconds.
 * @returns Updated cooldown map.
 */
export function updateCooldowns(
  cooldowns: Record<string, number>,
  dt: number,
): Record<string, number> {
  const updated: Record<string, number> = {};
  for (const [spell, cd] of Object.entries(cooldowns)) {
    updated[spell] = Math.max(0, cd - dt);
  }
  return updated;
}
