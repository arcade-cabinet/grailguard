import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useQuery } from 'koota/react';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { Model, Position } from '../../../engine/ecs/traits';

const ASSET_URLS: Record<string, string> = {
  'weapon-ballista': '/assets/models/weapon-ballista.glb',
  'weapon-cannon': '/assets/models/weapon-cannon.glb',
  'weapon-catapult': '/assets/models/weapon-catapult.glb',
  'weapon-turret': '/assets/models/weapon-turret.glb',
  'detail-tree': '/assets/models/detail-tree.glb',
  'detail-rocks': '/assets/models/detail-rocks.glb',
  coin: '/assets/models/coin.glb',
  heart: '/assets/models/heart.glb',
  potion: '/assets/models/potion.glb',
  arrow: '/assets/models/arrow.glb',
  axe: '/assets/models/axe.glb',
  star: '/assets/models/star.glb',
};

// Preload these new assets
for (const url of Object.values(ASSET_URLS)) {
  useGLTF.preload(url);
}

export function ECSEntityMesh({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Group>(null);

  // Static read for model name and initial position
  const modelTrait = entity.get(Model)!;
  const posTrait = entity.get(Position)!;

  const { scene } = useGLTF(ASSET_URLS[modelTrait.name] ?? ASSET_URLS['detail-tree']);

  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useFrame(() => {
    if (!meshRef.current) return;
    if (entity.has(Position)) {
      const pos = entity.get(Position)!;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
    }
  });

  return (
    <group ref={meshRef} position={[posTrait.x, posTrait.y, posTrait.z]}>
      <primitive object={clonedScene} scale={modelTrait.scale} />
    </group>
  );
}

export function ECSRenderer() {
  // Query all entities that have both Position and Model
  const entities = useQuery(Position, Model);

  return (
    <>
      {entities.map((entity) => (
        <ECSEntityMesh key={entity.id()} entity={entity} />
      ))}
    </>
  );
}
