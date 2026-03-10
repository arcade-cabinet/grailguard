import { useFrame } from '@react-three/fiber';
import {
  BUILDING_SPAWN_INTERVAL,
  BUILDING_SPAWNS,
  CELL_SIZE,
  type Entity,
  UNIT_STATS,
} from '../../engine/constants';
import { useGameStore } from '../../store/useGameStore';
import { gridToWorld } from '../../utils/math';

let _spawnId = 0;
/**
 * Create a unique unit identifier string.
 *
 * @returns A string in the form `unit_<timestamp>_<counter>`, where `<timestamp>` is milliseconds since epoch and `<counter>` is a monotonically increasing number to ensure uniqueness across calls.
 */
function genId() {
  return `unit_${Date.now()}_${_spawnId++}`;
}

/**
 * Controls per-frame spawning of ally units from buildings during the defend phase.
 *
 * Each frame, decrements building spawn timers scaled by game speed; when a timer elapses,
 * creates and spawns a new ally unit with stats derived from the building's configured spawn type,
 * places it with a small random offset near the building, and resets the building's timer.
 *
 * @returns Null (component renders nothing)
 */
export function BuildingController() {
  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();
    // Buildings only spawn ally units during the defend phase
    if (store.phase !== 'defend') return;

    const delta = rawDelta * store.gameSpeed;

    for (const [id, building] of Object.entries(store.buildings)) {
      const unitType = BUILDING_SPAWNS[building.type];
      const interval = BUILDING_SPAWN_INTERVAL[building.type];
      if (!unitType || interval <= 0) continue;

      const newTimer = building.timer - delta;
      if (newTimer <= 0) {
        const stats = UNIT_STATS[unitType];
        const { x: wx, z: wz } = gridToWorld(building.gridX, building.gridZ, CELL_SIZE);

        const unit: Entity = {
          id: genId(),
          type: unitType,
          team: 'ally',
          maxHp: stats.maxHp,
          hp: stats.maxHp,
          damage: stats.damage,
          speed: stats.speed,
          attackRange: stats.attackRange,
          attackSpeed: stats.attackSpeed,
          cooldown: 0,
          // Spawn slightly randomised offset so units don't stack
          position: {
            x: wx + (Math.random() - 0.5) * 0.8,
            y: 0,
            z: wz + (Math.random() - 0.5) * 0.8,
          },
          targetId: null,
          pathIndex: -1,
          isHealer: stats.isHealer,
        };
        store.spawnUnit(unit);
        store.updateBuildingTimer(id, interval);
      } else {
        store.updateBuildingTimer(id, newTimer);
      }
    }
  });

  return null;
}
