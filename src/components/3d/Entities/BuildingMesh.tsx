import { useGLTF, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { type Building, CELL_SIZE, HALF_GRID } from '../../../engine/constants';

interface BuildingMeshProps {
  building: Building;
}

const MODEL_URLS: Record<string, string> = {
  wall: '/assets/models/wall.glb',
  hut: '/assets/models/hut.glb',
  range: '/assets/models/range.glb',
  sanctuary: '/assets/models/sanctuary.glb',
  'tower-base': '/assets/models/tower-round-base.glb',
  turret: '/assets/models/weapon-turret.glb',
  ballista: '/assets/models/weapon-ballista.glb',
  cannon: '/assets/models/weapon-cannon.glb',
  catapult: '/assets/models/weapon-catapult.glb',
};

// Preload all building models
for (const url of Object.values(MODEL_URLS)) {
  useGLTF.preload(url);
}

// Preload textures
useTexture.preload([
  '/assets/materials/Bricks021/Color.jpg',
  '/assets/materials/Bricks021/NormalGL.jpg',
  '/assets/materials/Bricks021/Roughness.jpg',
  '/assets/materials/Planks012/Color.jpg',
  '/assets/materials/Planks012/NormalGL.jpg',
  '/assets/materials/Planks012/Roughness.jpg',
]);

/**
 * Render a 3D building mesh at the building's world position using loaded CC0 GLB models.
 * Applies a fallback material color to the loaded meshes.
 */
export function BuildingMesh({
  building,
  onClick,
}: BuildingMeshProps & { onClick?: (id: string) => void }) {
  const wx = building.gridX * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;
  const wz = building.gridZ * CELL_SIZE - HALF_GRID + CELL_SIZE / 2;

  // Map the building type to the corresponding GLB filename
  const modelName =
    building.type === 'temple' || building.type === 'keep' ? 'sanctuary' : building.type;

  const isTower = ['turret', 'ballista', 'cannon', 'catapult'].includes(building.type);

  // Unconditionally load the base scene (only used if isTower is true)
  const { scene: baseRawScene } = useGLTF(MODEL_URLS['tower-base']);
  // Load the main scene (weapon or standard building)
  const { scene } = useGLTF(MODEL_URLS[modelName] ?? MODEL_URLS.wall);

  const [brickColor, brickNormal, brickRoughness] = useTexture([
    '/assets/materials/Bricks021/Color.jpg',
    '/assets/materials/Bricks021/NormalGL.jpg',
    '/assets/materials/Bricks021/Roughness.jpg',
  ]);
  const [plankColor, plankNormal, plankRoughness] = useTexture([
    '/assets/materials/Planks012/Color.jpg',
    '/assets/materials/Planks012/NormalGL.jpg',
    '/assets/materials/Planks012/Roughness.jpg',
  ]);

  const brickMaterial = useMemo(() => {
    brickColor.colorSpace = THREE.SRGBColorSpace;
    brickColor.wrapS = THREE.RepeatWrapping;
    brickColor.wrapT = THREE.RepeatWrapping;
    brickNormal.wrapS = THREE.RepeatWrapping;
    brickNormal.wrapT = THREE.RepeatWrapping;
    brickRoughness.wrapS = THREE.RepeatWrapping;
    brickRoughness.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map: brickColor,
      normalMap: brickNormal,
      roughnessMap: brickRoughness,
    });
  }, [brickColor, brickNormal, brickRoughness]);

  const plankMaterial = useMemo(() => {
    plankColor.colorSpace = THREE.SRGBColorSpace;
    plankColor.wrapS = THREE.RepeatWrapping;
    plankColor.wrapT = THREE.RepeatWrapping;
    plankNormal.wrapS = THREE.RepeatWrapping;
    plankNormal.wrapT = THREE.RepeatWrapping;
    plankRoughness.wrapS = THREE.RepeatWrapping;
    plankRoughness.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map: plankColor,
      normalMap: plankNormal,
      roughnessMap: plankRoughness,
    });
  }, [plankColor, plankNormal, plankRoughness]);

  // Clone the scene so multiple buildings don't share identical mesh instances
  const clonedScene = useMemo(() => {
    const clone = scene.clone();

    // Apply building color and enable shadows on all inner meshes
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (modelName === 'wall' || modelName === 'sanctuary') {
          mesh.material = brickMaterial;
        } else if (modelName === 'hut' || modelName === 'range') {
          mesh.material = plankMaterial;
        }
      }
    });

    return clone;
  }, [scene, modelName, brickMaterial, plankMaterial]);

  const clonedBaseScene = useMemo(() => {
    if (!isTower) return null;
    const clone = baseRawScene.clone();
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = brickMaterial; // Towers get brick material for base
      }
    });
    return clone;
  }, [baseRawScene, isTower, brickMaterial]);

  // Apply scale adjustments since these CC0 assets might not be exactly 1x1 grid size
  const scaleRef = useMemo(() => {
    // Increase size slightly based on levelStats (15% per level)
    const levelScale = 1.0 + (building.levelStats - 1) * 0.15;
    switch (modelName) {
      case 'wall':
        return 0.5 * levelScale;
      case 'hut':
        return 0.4 * levelScale;
      case 'range':
        return 0.4 * levelScale;
      case 'sanctuary':
        return 0.6 * levelScale;
      case 'turret':
      case 'ballista':
      case 'cannon':
      case 'catapult':
        return 0.5 * levelScale; // Scale for weapon
      default:
        return 0.5 * levelScale;
    }
  }, [modelName, building.levelStats]);

  return (
    <group
      position={[wx, 0, wz]}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(building.id);
        }
      }}
    >
      {isTower && clonedBaseScene && (
        <primitive
          object={clonedBaseScene}
          scale={0.5 * (1.0 + (building.levelStats - 1) * 0.15)}
          position={[0, 0, 0]}
        />
      )}
      <primitive
        object={clonedScene}
        scale={scaleRef}
        position={isTower ? [0, 0.4, 0] : [0, 0, 0]}
      />
    </group>
  );
}
