import { gridToWorld } from '../../utils/math';
import {
  BUILDING_SPAWN_INTERVAL,
  BUILDING_SPAWNS,
  type Building,
  CELL_SIZE,
  type Entity,
  UNIT_STATS,
} from '../constants';

export interface BuildingSystemState {
  phase: 'build' | 'defend';
  buildings: Record<string, Building>;
}

export interface BuildingSystemEvents {
  onSpawnUnit: (unit: Entity) => void;
  onUpdateTimer: (id: string, newTimer: number) => void;
}

let _spawnId = 0;
export function genUnitId() {
  return `unit_${Date.now()}_${_spawnId++}`;
}

/**
 * Core logic for building unit generation.
 * Extracted from React to allow for unit testing.
 */
export function stepBuildingSimulation(
  delta: number,
  state: BuildingSystemState,
  events: BuildingSystemEvents,
) {
  if (state.phase !== 'defend') return;

  for (const [id, building] of Object.entries(state.buildings)) {
    const unitType = BUILDING_SPAWNS[building.type];
    const interval = BUILDING_SPAWN_INTERVAL[building.type];

    if (!unitType || interval === undefined || interval <= 0) continue;

    const newTimer = building.timer - delta;

    if (newTimer <= 0) {
      const stats = UNIT_STATS[unitType];
      const { x: wx, z: wz } = gridToWorld(building.gridX, building.gridZ, CELL_SIZE);
      const scale = 1.0 + ((building.levelStats || 1) - 1) * 0.2; // 20% boost per level

      const unit: Entity = {
        id: genUnitId(),
        type: unitType,
        team: 'ally',
        maxHp: Math.round(stats.maxHp * scale),
        hp: Math.round(stats.maxHp * scale),
        damage: Math.round(stats.damage * scale),
        speed: stats.speed,
        attackRange: stats.attackRange,
        attackSpeed: stats.attackSpeed * (1.0 + ((building.levelStats || 1) - 1) * 0.1),
        cooldown: 0,
        position: {
          x: wx + (Math.random() - 0.5) * 0.8,
          y: 0,
          z: wz + (Math.random() - 0.5) * 0.8,
        },
        targetId: null,
        pathIndex: -1,
        isHealer: stats.isHealer,
      };

      events.onSpawnUnit(unit);
      events.onUpdateTimer(id, interval);
    } else {
      events.onUpdateTimer(id, newTimer);
    }
  }
}
