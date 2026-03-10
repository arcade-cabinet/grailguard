import * as YUKA from 'yuka';
import type { EnemyVehicle } from './EnemyBrain';

export const yukaEntityManager = new YUKA.EntityManager();
export const yukaEntities = new Map<string, EnemyVehicle>();

export function resetYuka() {
  yukaEntities.forEach((vehicle) => {
    yukaEntityManager.remove(vehicle);
  });
  yukaEntities.clear();
}

/**
 * Syncs a Yuka GameEntity's position to a Three.js Vector3-like object (e.g. from our Zustand store)
 * Call this in the main update loop after EntityManager.update()
 */
export function syncYukaToStore(
  yukaEntity: YUKA.GameEntity,
  storePos: { x: number; y: number; z: number },
) {
  storePos.x = yukaEntity.position.x;
  storePos.y = yukaEntity.position.y;
  storePos.z = yukaEntity.position.z;
}

/**
 * Syncs a Store position to a Yuka GameEntity
 */
export function syncStoreToYuka(
  storePos: { x: number; y: number; z: number },
  yukaEntity: YUKA.GameEntity,
) {
  yukaEntity.position.set(storePos.x, storePos.y, storePos.z);
}
