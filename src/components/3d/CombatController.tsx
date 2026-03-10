import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import { findTarget, applySeparation, distance2D } from '../../engine/combatLogic';
import { CELL_SIZE, TILE, GRID_SIZE, HALF_GRID } from '../../engine/constants';
import { worldToGrid, gridToWorld } from '../../utils/math';

export function CombatController() {
  const waveEndTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();
    if (store.phase !== 'defend') {
      return;
    }

    const delta = rawDelta * store.gameSpeed;
    const { units, pathCoords, grid } = store;
    const allUnits = Object.values(units);

    // Camera shake decay
    if (store.cameraShake > 0) {
      store.decrementCameraShake();
    }

    // Divine smite cooldown
    if (store.divineSmiteCooldown > 0) {
      store.setDivineSmiteCooldown(Math.max(0, store.divineSmiteCooldown - delta));
    }

    let hasEnemies = false;

    for (const unit of allUnits) {
      if (unit.hp <= 0) {
        // Award gold for enemy kills
        if (unit.team === 'enemy' && unit.reward) {
          store.addGold(unit.reward);
        }
        store.removeUnit(unit.id);
        continue;
      }

      if (unit.team === 'enemy') hasEnemies = true;

      const others = allUnits.filter((u) => u.id !== unit.id && u.hp > 0);

      // Targeting
      const target = findTarget(unit, others);
      store.updateUnitTarget(unit.id, target?.id ?? null);

      const newCooldown = Math.max(0, unit.cooldown - delta);
      store.updateUnitCooldown(unit.id, newCooldown);

      if (target && distance2D(unit.position, target.position) <= unit.attackRange) {
        // Attack
        if (newCooldown <= 0) {
          if (unit.isHealer) {
            store.healUnit(target.id, Math.abs(unit.damage));
          } else {
            if (unit.type === 'boss') {
              // AoE damage
              for (const other of others) {
                if (other.team === 'ally' && distance2D(unit.position, other.position) <= 2.5) {
                  store.damageUnit(other.id, unit.damage);
                }
              }
            } else {
              store.damageUnit(target.id, unit.damage);
            }
          }
          store.updateUnitCooldown(unit.id, 1.0 / unit.attackSpeed);
        }
      } else if (unit.type !== 'wall') {
        // Movement
        let moveX = 0;
        let moveZ = 0;

        if (unit.team === 'enemy' && unit.pathIndex >= 0) {
          // Follow path
          const nextIdx = Math.min(unit.pathIndex, pathCoords.length - 1);
          const dest = pathCoords[nextIdx];
          const { x: wx, z: wz } = gridToWorld(dest.x, dest.z, CELL_SIZE);
          const dx = wx - unit.position.x;
          const dz = wz - unit.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.5 && unit.pathIndex < pathCoords.length - 1) {
            store.updateUnitTarget(unit.id, null);
            useGameStore.setState((s) => {
              const u = s.units[unit.id];
              if (!u) return {};
              return { units: { ...s.units, [unit.id]: { ...u, pathIndex: u.pathIndex + 1 } } };
            });
          } else if (d > 0) {
            moveX = (dx / d) * unit.speed;
            moveZ = (dz / d) * unit.speed;
          }
        } else if (unit.team === 'ally' && target) {
          // Move toward target
          const dx = target.position.x - unit.position.x;
          const dz = target.position.z - unit.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d > 0) {
            moveX = (dx / d) * unit.speed;
            moveZ = (dz / d) * unit.speed;
          }
        }

        // Separation
        const sep = applySeparation(unit, others);
        moveX += sep.x;
        moveZ += sep.z;

        const newX = unit.position.x + moveX * delta;
        const newZ = unit.position.z + moveZ * delta;
        store.updateUnitPosition(unit.id, { x: newX, z: newZ });

        // Check if enemy reached sanctuary
        if (unit.team === 'enemy') {
          const { x: gx, z: gz } = worldToGrid(unit.position.x, unit.position.z, CELL_SIZE);
          if (
            gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE &&
            grid[gx]?.[gz] === TILE.SANCTUARY
          ) {
            store.takeDamage(1);
            store.removeUnit(unit.id);
          }
        }
      }
    }

    // Check wave end
    if (!hasEnemies && store.phase === 'defend') {
      waveEndTimer.current += delta;
      if (waveEndTimer.current > 2.0) {
        waveEndTimer.current = 0;
        store.setPhase('build');
      }
    } else {
      waveEndTimer.current = 0;
    }
  });

  return null;
}
