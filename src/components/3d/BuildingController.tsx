import { useFrame } from '@react-three/fiber';
import { stepBuildingSimulation } from '../../engine/systems/BuildingSystem';
import { useGameStore } from '../../store/useGameStore';

/**
 * Controls per-frame spawning of ally units from buildings during the defend phase.
 * Extracted logic into `BuildingSystem` to allow for automated headless testing.
 *
 * @returns Null (component renders nothing)
 */
export function BuildingController() {
  useFrame((_, rawDelta) => {
    const store = useGameStore.getState();
    const delta = rawDelta * store.gameSpeed;

    stepBuildingSimulation(
      delta,
      { phase: store.phase, buildings: store.buildings },
      {
        onSpawnUnit: (unit) => store.spawnUnit(unit),
        onUpdateTimer: (id, timer) => store.updateBuildingTimer(id, timer),
      },
    );
  });

  return null;
}
