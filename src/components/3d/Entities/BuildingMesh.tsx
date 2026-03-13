/**
 * @module BuildingMesh
 *
 * Renders a single building entity as a 3D mesh inside the Arena scene.
 */
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type * as THREE from 'three';
import { BUILDINGS } from '../../../engine/constants';
import { Building, Position } from '../../../engine/GameEngine';
import { BUILDING_MODEL_PATHS } from '../modelPaths';

/**
 * Renders a building entity using its associated GLB model. Displays a
 * camera-facing spawn/rate progress bar above the building and a golden
 * selection ring when selected. The model is scaled per building type and
 * updated each frame to track entity position.
 *
 * @param props.entity - The Koota entity that carries `Building` and `Position` traits.
 * @param props.selected - Whether to show the golden selection ring around the building.
 */
export function BuildingMesh({ entity, selected = false }: { entity: Entity; selected?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const progressGroupRef = useRef<THREE.Group>(null);
  const progressBarRef = useRef<THREE.Mesh>(null);
  const selectionRef = useRef<THREE.Mesh>(null);
  const building = entity.get(Building);
  const position = entity.get(Position);

  const modelPath = building ? BUILDING_MODEL_PATHS[building.type] : '';
  const { scene } = useGLTF(modelPath as string);

  useFrame((state) => {
    const currentBuilding = entity.get(Building);
    const currentPosition = entity.get(Position);
    if (!groupRef.current || !currentBuilding || !currentPosition) return;

    groupRef.current.position.set(currentPosition.x, currentPosition.y, currentPosition.z);

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
      <Clone object={scene} scale={scale} castShadow receiveShadow />
      <mesh
        ref={selectionRef}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={selected}
      >
        <ringGeometry args={[2.7, 3.5, 36]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.85} />
      </mesh>
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
