/**
 * @module BuildingMesh
 *
 * Renders a single building entity as a 3D mesh inside the Arena scene.
 * Scale increases with upgrade level (avgLevel * 0.1 bonus) so higher-level
 * buildings are visually larger. A level indicator ring shows upgrade progress.
 */
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type * as THREE from 'three';
import { BUILDINGS } from '../../../engine/constants';
import { Building, Position } from '../../../engine/GameEngine';
import { BUILDING_MODEL_PATHS, TOWER_DETAIL_PATHS } from '../modelPaths';

/**
 * Renders a building entity using its associated GLB model. Displays a
 * camera-facing spawn/rate progress bar above the building and a golden
 * selection ring when selected. The model is scaled per building type,
 * with a bonus multiplier based on average upgrade level (1.0 at level 1,
 * up to 1.4 at level 5).
 *
 * @param props.entity - The Koota entity that carries `Building` and `Position` traits.
 * @param props.selected - Whether to show the golden selection ring around the building.
 */
export function BuildingMesh({ entity, selected = false }: { entity: Entity; selected?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const progressGroupRef = useRef<THREE.Group>(null);
  const progressBarRef = useRef<THREE.Mesh>(null);
  const selectionRef = useRef<THREE.Mesh>(null);
  const levelIndicatorRef = useRef<THREE.Mesh>(null);
  const building = entity.get(Building);
  const position = entity.get(Position);

  // Use unique tower detail model when available, otherwise fall back to generic
  const modelPath = building
    ? (TOWER_DETAIL_PATHS[building.type] ?? BUILDING_MODEL_PATHS[building.type])
    : '';
  const { scene } = useGLTF(modelPath as string);

  useFrame((state) => {
    const currentBuilding = entity.get(Building);
    const currentPosition = entity.get(Position);
    if (!groupRef.current || !currentBuilding || !currentPosition) return;

    groupRef.current.position.set(currentPosition.x, currentPosition.y, currentPosition.z);

    // Scale grows with upgrade level: 1.0 at level 1, up to 1.4 at level 5
    const avgLevel = (currentBuilding.levelSpawn + currentBuilding.levelStats) / 2;
    const upgradeScale = 1 + (avgLevel - 1) * 0.1;
    if (modelRef.current) {
      modelRef.current.scale.setScalar(upgradeScale);
    }

    // Level indicator ring: visible when any upgrade > 1, grows brighter
    if (levelIndicatorRef.current) {
      const showLevel = avgLevel > 1;
      levelIndicatorRef.current.visible = showLevel;
      if (showLevel) {
        levelIndicatorRef.current.rotation.z += 0.5 / 60;
      }
    }

    if (selectionRef.current) {
      selectionRef.current.visible = selected;
      selectionRef.current.rotation.z += 1.25 / 60;
    }

    if (progressBarRef.current && progressGroupRef.current) {
      const spawnRate =
        BUILDINGS[currentBuilding.type].spawnTime * 0.8 ** (currentBuilding.levelSpawn - 1);
      const progress = spawnRate <= 0 ? 1 : 1 - Math.max(0, currentBuilding.timer / spawnRate);
      progressBarRef.current.scale.x = Math.max(0.04, Math.min(1, progress));
      progressGroupRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  if (!building || !position) return null;

  let scale: number | [number, number, number] = 0.8;
  if (building.type === 'wall') scale = 0.5;
  if (building.type === 'track') scale = [0.8, 0.8, 0.8]; // Conveyor kit
  if (building.type === 'mine_ore') scale = 1.2; // Hexagon mine
  if (building.type === 'mine_gem') scale = 1.5; // detail-crystal-large
  if (building.type === 'sentry') scale = 0.5;
  if (building.type === 'obelisk') scale = 0.6;
  if (building.type === 'mint') scale = [0.6, 0.4, 0.6];
  if (building.type === 'lumber') scale = [0.7, 0.6, 0.7];
  if (building.type === 'catapult') scale = 0.6;
  if (building.type === 'sorcerer') scale = [0.5, 0.7, 0.5];
  if (building.type === 'vault') scale = [0.8, 0.6, 0.8];

  return (
    <group ref={groupRef}>
      {/* Model wrapper that scales with upgrade level */}
      <group ref={modelRef}>
        <Clone object={scene} scale={scale} castShadow receiveShadow />
      </group>
      {/* Selection ring */}
      <mesh
        ref={selectionRef}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={selected}
      >
        <ringGeometry args={[2.7, 3.5, 36]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.85} />
      </mesh>
      {/* Level indicator ring: subtle teal glow visible when upgraded */}
      <mesh
        ref={levelIndicatorRef}
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[2.2, 2.5, 24]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.45} />
      </mesh>
      {/* Spawn progress bar */}
      <group ref={progressGroupRef} position={[0, 4.8, 0]}>
        <mesh>
          <planeGeometry args={[2.9, 0.3]} />
          <meshBasicMaterial color="#111111" transparent opacity={0.8} depthTest={false} />
        </mesh>
        <mesh ref={progressBarRef} position={[0, 0, 0.02]}>
          <planeGeometry args={[2.6, 0.2]} />
          <meshBasicMaterial color="#d4af37" transparent opacity={0.95} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
