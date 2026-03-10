import { gridToWorld, worldToGrid } from '../../utils/math';
import { EnemyVehicle } from '../ai/EnemyBrain';
import { yukaEntities, yukaEntityManager } from '../ai/EntityManager';
import { applySeparation, distance2D } from '../combatLogic';
import { CELL_SIZE, type Entity, GRID_SIZE, TILE } from '../constants';

export interface CombatEvents {
  onEnemyKilled: (enemy: Entity) => void;
  onUnitDamaged: (target: Entity, amount: number) => void;
  onUnitHealed: (target: Entity, amount: number) => void;
  onWallDamaged: (wall: Entity) => void;
  onBossAoE: (boss: Entity) => void;
  onBreach: (enemy: Entity) => void;
  onRemoveBuilding: (buildingId: string) => void;
  onDropPotion: (pos: { x: number; z: number }) => void;
  onDropStar: (pos: { x: number; z: number }) => void;
}

export interface CombatStateSnapshot {
  units: Record<string, Entity>;
  buildings: Record<string, any>;
  pathCoords: { x: number; z: number }[];
  grid: number[][];
}

export interface CombatSimulationResult {
  newUnits: Record<string, Entity>;
  goldDelta: number;
  healthDelta: number;
  hasEnemies: boolean;
}

/**
 * Core combat simulation engine.
 * Pure logic decoupled from React/Three.js.
 */
export function stepCombatSimulation(
  delta: number,
  state: CombatStateSnapshot,
  events: CombatEvents,
): CombatSimulationResult {
  // Advance Yuka AI
  yukaEntityManager.update(delta);

  const allUnits = Object.values(state.units);
  const newUnits: Record<string, Entity> = {};
  for (const u of allUnits) newUnits[u.id] = { ...u, position: { ...u.position } };

  const toRemove = new Set<string>();
  let goldDelta = 0;
  let healthDelta = 0;
  let hasEnemies = false;

  for (const unit of allUnits) {
    if (toRemove.has(unit.id)) continue;
    const mu = newUnits[unit.id];

    // Kill check
    if (mu.hp <= 0) {
      if (mu.team === 'enemy' && mu.reward) {
        goldDelta += mu.reward;
        events.onEnemyKilled(mu);

        // Rare drops
        const roll = Math.random();
        if (roll < 0.05) {
          // 5% chance
          events.onDropPotion(mu.position);
        } else if (roll < 0.08) {
          // 3% chance
          events.onDropStar(mu.position);
        }
      }
      if (['wall', 'turret', 'ballista', 'cannon', 'catapult'].includes(mu.type)) {
        events.onRemoveBuilding(mu.id);
      }
      toRemove.add(mu.id);
      continue;
    }

    if (mu.team === 'enemy') hasEnemies = true;

    const peers = allUnits.filter((u) => u.id !== mu.id && u.hp > 0 && !toRemove.has(u.id));

    // Targeting
    let attackTarget: Entity | null = null;

    if (mu.isHealer) {
      let worstRatio = 1.0;
      for (const p of peers) {
        if (p.team !== mu.team) continue;
        if (distance2D(mu.position, p.position) > mu.attackRange) continue;
        const ratio = p.hp / p.maxHp;
        if (ratio < worstRatio) {
          worstRatio = ratio;
          attackTarget = p;
        }
      }
    } else if (mu.team === 'enemy') {
      if (mu.type === 'boss') {
        for (const b of Object.values(state.buildings)) {
          if (b.type === 'hut') {
            const { x: wx, z: wz } = gridToWorld(b.gridX, b.gridZ, CELL_SIZE);
            const dx = mu.position.x - wx;
            const dz = mu.position.z - wz;
            if (Math.sqrt(dx * dx + dz * dz) <= mu.attackRange) {
              if (mu.cooldown <= 0) {
                mu.cooldown = 1.0 / mu.attackSpeed;
                events.onRemoveBuilding(b.id);
              }
              break;
            }
          }
        }
      }

      if (!attackTarget) {
        for (const p of peers) {
          if (
            p.team === 'ally' &&
            p.type === 'wall' &&
            distance2D(mu.position, p.position) <= 1.5
          ) {
            if (mu.type === 'troll') continue;
            attackTarget = p;
            break;
          }
        }
      }

      if (!attackTarget) {
        let bestDist = Infinity;
        for (const p of peers) {
          if (p.team === mu.team) continue;
          const d = distance2D(mu.position, p.position);
          if (d <= mu.attackRange && d < bestDist) {
            bestDist = d;
            attackTarget = p;
          }
        }
      }
    } else {
      let bestDist = Infinity;
      for (const p of peers) {
        if (p.team === mu.team) continue;
        const d = distance2D(mu.position, p.position);
        if (d <= mu.attackRange && d < bestDist) {
          bestDist = d;
          attackTarget = p;
        }
      }
    }

    mu.targetId = attackTarget?.id ?? null;
    mu.cooldown = Math.max(0, mu.cooldown - delta);

    // Attack
    if (attackTarget && distance2D(mu.position, attackTarget.position) <= mu.attackRange) {
      if (mu.cooldown <= 0) {
        mu.cooldown = 1.0 / mu.attackSpeed;
        const tgt = newUnits[attackTarget.id];
        if (tgt) {
          if (mu.isHealer) {
            const healAmt = Math.abs(mu.damage);
            tgt.hp = Math.min(tgt.maxHp, tgt.hp + healAmt);
            events.onUnitHealed(tgt, healAmt);
          } else if (mu.type === 'boss') {
            events.onBossAoE(mu);
            for (const p of peers) {
              if (p.team !== 'ally') continue;
              if (distance2D(mu.position, p.position) > 2.5) continue;
              const nt = newUnits[p.id];
              if (nt) {
                nt.hp = Math.max(0, nt.hp - mu.damage);
                events.onUnitDamaged(nt, mu.damage);
              }
            }
          } else {
            tgt.hp = Math.max(0, tgt.hp - mu.damage);
            events.onUnitDamaged(tgt, mu.damage);
            if (tgt.type === 'wall') {
              events.onWallDamaged(tgt);
            }
            if (tgt.hp <= 0) {
              // Defer kill handling to next tick or handle immediately
            }
          }
        }
      }
    } else if (mu.type !== 'wall') {
      // Movement
      let moveX = 0;
      let moveZ = 0;

      if (mu.team === 'enemy') {
        let vehicle = yukaEntities.get(mu.id);
        if (!vehicle) {
          vehicle = new EnemyVehicle(mu.id);
          vehicle.maxSpeed = mu.speed;
          vehicle.position.set(mu.position.x, 0, mu.position.z);
          vehicle.setPath(state.pathCoords);
          yukaEntityManager.add(vehicle);
          yukaEntities.set(mu.id, vehicle);
        } else {
          mu.position.x = vehicle.position.x;
          mu.position.z = vehicle.position.z;
        }
      } else {
        let nearestEnemy: Entity | null = null;
        let nearestDist = Infinity;
        for (const p of peers) {
          if (p.team === mu.team) continue;
          const d = distance2D(mu.position, p.position);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = p;
          }
        }
        if (nearestEnemy && nearestDist > mu.attackRange) {
          const dx = nearestEnemy.position.x - mu.position.x;
          const dz = nearestEnemy.position.z - mu.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d > 0) {
            moveX = (dx / d) * mu.speed;
            moveZ = (dz / d) * mu.speed;
          }
        }
      }

      if (mu.team === 'ally') {
        const sep = applySeparation(mu, peers);
        moveX += sep.x;
        moveZ += sep.z;

        mu.position.x += moveX * delta;
        mu.position.z += moveZ * delta;
      }

      // Sanctuary breach
      if (mu.team === 'enemy') {
        const { x: gx, z: gz } = worldToGrid(mu.position.x, mu.position.z, CELL_SIZE);
        if (
          gx >= 0 &&
          gx < GRID_SIZE &&
          gz >= 0 &&
          gz < GRID_SIZE &&
          state.grid[gx]?.[gz] === TILE.SANCTUARY
        ) {
          healthDelta -= 1;
          events.onBreach(mu);
          toRemove.add(mu.id);
        }
      }
    }
  }

  for (const id of toRemove) {
    delete newUnits[id];
    const vehicle = yukaEntities.get(id);
    if (vehicle) {
      yukaEntityManager.remove(vehicle);
      yukaEntities.delete(id);
    }
  }

  return {
    newUnits,
    goldDelta,
    healthDelta,
    hasEnemies,
  };
}
