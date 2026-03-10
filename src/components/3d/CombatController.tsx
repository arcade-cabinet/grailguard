import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import { distance2D, applySeparation } from '../../engine/combatLogic';
import { CELL_SIZE, TILE, GRID_SIZE, Entity } from '../../engine/constants';
import { gridToWorld, worldToGrid } from '../../utils/math';
import { emitParticles } from './ParticleSystem';
import { emitFloatingText } from './FloatingTextSystem';

let _eid = 0;

/**
 * Runs the entire combat simulation each frame.
 *
 * PERFORMANCE DESIGN:
 *   – Reads all state once at frame start (getState(), never a React subscription).
 *   – Mutates a local copy of all unit objects.
 *   – Calls batchSetUnits() ONCE at the end → exactly 1 Zustand notification/frame
 *     regardless of unit count. Replaces the previous N×5 set() calls/frame.
 *
 * GAMEPLAY FIXES vs. scaffold:
 *   – Ally movement: allies advance toward nearest enemy at ANY distance
 *     (not just when an enemy is already within attackRange).
 *   – Healer healing: clerics move toward injured allies then heal.
 *   – Boss AoE: damages all allies within 2.5 u on each attack.
 *   – Divine Smite cooldown decays in both phases.
 *   – Camera shake decays continuously.
 */
export function CombatController() {
  const waveEndTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();

    // Always decay smite cooldown and camera shake
    if (store.divineSmiteCooldown > 0) {
      store.setDivineSmiteCooldown(Math.max(0, store.divineSmiteCooldown - rawDelta));
    }
    if (store.cameraShake > 0) {
      store.triggerCameraShake(Math.max(0, store.cameraShake - 0.025));
    }

    if (store.phase !== 'defend') return;

    // Cap delta to avoid physics tunneling at low frame-rates
    const delta = Math.min(rawDelta, 0.05) * store.gameSpeed;
    const { pathCoords, grid } = store;

    // ── Snapshot all units into a mutable local copy ──────────────────────
    const allUnits = Object.values(store.units);
    const newUnits: Record<string, Entity> = {};
    for (const u of allUnits) newUnits[u.id] = { ...u, position: { ...u.position } };

    const toRemove = new Set<string>();
    let goldDelta = 0;
    let healthDelta = 0;
    let hasEnemies = false;

    // ── Main simulation loop ──────────────────────────────────────────────
    for (const unit of allUnits) {
      if (toRemove.has(unit.id)) continue;
      const mu = newUnits[unit.id]; // mutable copy

      // ── Kill check ─────────────────────────────────────────────────────
      if (mu.hp <= 0) {
        if (mu.team === 'enemy' && mu.reward) {
          goldDelta += mu.reward;
          emitParticles([mu.position.x, 0.5, mu.position.z], '#ffaa00', 10);
          emitFloatingText([mu.position.x, 1.5, mu.position.z], mu.reward);
        }
        toRemove.add(mu.id);
        continue;
      }

      if (mu.team === 'enemy') hasEnemies = true;

      // Alive peers (skip already-dead)
      const peers = allUnits.filter((u) => u.id !== mu.id && u.hp > 0 && !toRemove.has(u.id));

      // ── Targeting ──────────────────────────────────────────────────────
      let attackTarget: Entity | null = null;

      if (mu.isHealer) {
        // Cleric: closest wounded ally within heal range
        let worstRatio = 1.0;
        for (const p of peers) {
          if (p.team !== mu.team) continue;
          if (distance2D(mu.position, p.position) > mu.attackRange) continue;
          const ratio = p.hp / p.maxHp;
          if (ratio < worstRatio) { worstRatio = ratio; attackTarget = p; }
        }
      } else if (mu.team === 'enemy') {
        // Enemies: wall-breaking priority, then normal
        for (const p of peers) {
          if (p.team === 'ally' && p.type === 'wall' && distance2D(mu.position, p.position) <= 1.5) {
            attackTarget = p;
            break;
          }
        }
        if (!attackTarget) {
          let bestDist = Infinity;
          for (const p of peers) {
            if (p.team === mu.team) continue;
            const d = distance2D(mu.position, p.position);
            if (d <= mu.attackRange && d < bestDist) { bestDist = d; attackTarget = p; }
          }
        }
      } else {
        // Allies: closest enemy in attack range
        let bestDist = Infinity;
        for (const p of peers) {
          if (p.team === mu.team) continue;
          const d = distance2D(mu.position, p.position);
          if (d <= mu.attackRange && d < bestDist) { bestDist = d; attackTarget = p; }
        }
      }

      mu.targetId = attackTarget?.id ?? null;
      mu.cooldown = Math.max(0, mu.cooldown - delta);

      // ── Attack ─────────────────────────────────────────────────────────
      if (attackTarget && distance2D(mu.position, attackTarget.position) <= mu.attackRange) {
        if (mu.cooldown <= 0) {
          mu.cooldown = 1.0 / mu.attackSpeed;
          const tgt = newUnits[attackTarget.id];
          if (tgt) {
            if (mu.isHealer) {
              const healAmt = Math.abs(mu.damage);
              tgt.hp = Math.min(tgt.maxHp, tgt.hp + healAmt);
              emitFloatingText([tgt.position.x, 1.5, tgt.position.z], -healAmt);
            } else if (mu.type === 'boss') {
              // Boss AoE — hits all allies within 2.5 u
              for (const p of peers) {
                if (p.team !== 'ally') continue;
                if (distance2D(mu.position, p.position) > 2.5) continue;
                const nt = newUnits[p.id];
                if (nt) {
                  nt.hp = Math.max(0, nt.hp - mu.damage);
                  emitFloatingText([nt.position.x, 1.5, nt.position.z], mu.damage);
                  emitParticles([nt.position.x, 0.5, nt.position.z], '#ff2200', 4);
                }
              }
            } else {
              tgt.hp = Math.max(0, tgt.hp - mu.damage);
              emitFloatingText([tgt.position.x, 1.5, tgt.position.z], mu.damage);
              if (tgt.hp <= 0) emitParticles([tgt.position.x, 0.5, tgt.position.z], '#ff4400', 6);
            }
          }
        }

      } else if (mu.type !== 'wall') {
        // ── Movement ───────────────────────────────────────────────────────
        let moveX = 0;
        let moveZ = 0;

        if (mu.team === 'enemy') {
          // Follow the generated path toward the sanctuary
          const idx = Math.min(mu.pathIndex, pathCoords.length - 1);
          const dest = pathCoords[idx];
          const { x: wx, z: wz } = gridToWorld(dest.x, dest.z, CELL_SIZE);
          const dx = wx - mu.position.x;
          const dz = wz - mu.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.55 && mu.pathIndex < pathCoords.length - 1) {
            mu.pathIndex += 1;
          } else if (d > 0) {
            moveX = (dx / d) * mu.speed;
            moveZ = (dz / d) * mu.speed;
          }
        } else {
          // ── ALLY MOVEMENT FIX ──────────────────────────────────────────
          // Find nearest enemy at ANY distance (not just within attackRange).
          // Previously allies stood frozen because findTarget only returned
          // enemies already within 0.8 u. Now they actively advance.
          let nearestEnemy: Entity | null = null;
          let nearestDist = Infinity;
          for (const p of peers) {
            if (p.team === mu.team) continue;
            const d = distance2D(mu.position, p.position);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = p; }
          }
          if (nearestEnemy && nearestDist > mu.attackRange) {
            const dx = nearestEnemy.position.x - mu.position.x;
            const dz = nearestEnemy.position.z - mu.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d > 0) { moveX = (dx / d) * mu.speed; moveZ = (dz / d) * mu.speed; }
          }
        }

        // Separation steering – prevents units from clumping
        const sep = applySeparation(mu, peers);
        moveX += sep.x;
        moveZ += sep.z;

        mu.position.x += moveX * delta;
        mu.position.z += moveZ * delta;

        // ── Sanctuary breach (enemies reaching the grail) ─────────────────
        if (mu.team === 'enemy') {
          const { x: gx, z: gz } = worldToGrid(mu.position.x, mu.position.z, CELL_SIZE);
          if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE && grid[gx]?.[gz] === TILE.SANCTUARY) {
            healthDelta -= 1;
            emitParticles([mu.position.x, 0.5, mu.position.z], '#ff0000', 12);
            store.triggerCameraShake(0.5);
            toRemove.add(mu.id);
          }
        }
      }
    }

    // Remove dead / breached units from local copy
    for (const id of toRemove) delete newUnits[id];

    // ── ONE atomic Zustand update for the entire frame ────────────────────
    store.batchSetUnits(newUnits, Object.keys(newUnits), goldDelta, healthDelta);

    // ── Wave-end detection ────────────────────────────────────────────────
    if (!hasEnemies) {
      waveEndTimer.current += delta;
      if (waveEndTimer.current > 2.0) {
        waveEndTimer.current = 0;
        store.setPhase('build');
        const msg = `⚔ Wave ${store.wave} Complete!  +20g`;
        store.setAnnouncement(msg);
        setTimeout(() => useGameStore.getState().setAnnouncement(''), 3000);
      }
    } else {
      waveEndTimer.current = 0;
    }
  });

  return null;
}
