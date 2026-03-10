import type * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';
import { BuildingController } from '../BuildingController';
import { CombatController } from '../CombatController';
import { BuildingMesh } from '../Entities/BuildingMesh';
import { UnitMesh } from '../Entities/UnitMesh';
import { Environment } from '../Environment';
import { FloatingTextSystem } from '../FloatingTextSystem';
import { GovernorController } from '../GovernorController';
import { MapGrid, SceneryInstances } from '../MapGrid';
import { ParticleSystem } from '../ParticleSystem';
import { Sanctuary } from '../Sanctuary';
import { CameraRig, GhostMesh, SceneRaycaster } from './Interactions';

export function GameScene({
  ghostPos,
  ghostValid,
  ndcRef,
  onRayHit,
  autoGovernor,
  setUpgradeBuildingId,
}: {
  ghostPos: [number, number, number] | null;
  ghostValid: boolean;
  ndcRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onRayHit: (pos: THREE.Vector3) => void;
  autoGovernor: boolean;
  setUpgradeBuildingId: (id: string | null) => void;
}) {
  const unitIds = useGameStore((s) => s.unitIds);
  const buildings = useGameStore((s) => s.buildings);

  return (
    <>
      <Environment />
      <CameraRig />
      <MapGrid />
      <SceneryInstances />
      <Sanctuary />
      <CombatController />
      <GovernorController active={autoGovernor} />
      <BuildingController />
      <SceneRaycaster ndcRef={ndcRef} onHit={onRayHit} />
      <GhostMesh position={ghostPos} valid={ghostValid} />
      <ParticleSystem />
      <FloatingTextSystem />
      {Object.values(buildings).map((b) => (
        <BuildingMesh key={b.id} building={b} onClick={setUpgradeBuildingId} />
      ))}
      {unitIds.map((id) => (
        <UnitMesh key={id} entityId={id} />
      ))}
    </>
  );
}
