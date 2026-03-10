import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';
import {
  BUILDING_SPAWNS,
  BUILDING_SPAWN_INTERVAL,
  UNIT_STATS,
  CELL_SIZE,
  Entity,
} from '../../engine/constants';
import { gridToWorld } from '../../utils/math';

let _spawnId = 0;
function genId() { return `unit_${Date.now()}_${_spawnId++}`; }

export function BuildingController() {
  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();
    const delta = rawDelta * store.gameSpeed;

    for (const [id, building] of Object.entries(store.buildings)) {
      const unitType = BUILDING_SPAWNS[building.type];
      const interval = BUILDING_SPAWN_INTERVAL[building.type];
      if (!unitType || interval <= 0) continue;

      const newTimer = building.timer - delta;
      if (newTimer <= 0) {
        // Spawn unit
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
          position: { x: wx + (Math.random() - 0.5), y: 0, z: wz + (Math.random() - 0.5) },
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
