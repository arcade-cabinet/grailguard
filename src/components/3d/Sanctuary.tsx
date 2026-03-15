/**
 * @module Sanctuary
 *
 * 3D model of the Holy Grail sanctuary at the road's end. Uses the keep.glb
 * asset for a high-quality visual. Features health-based material degradation
 * (tinting toward red as HP drops) and a golden grail glow on top.
 */
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { BUILDING_MODEL_PATHS } from './modelPaths';

/** Props for the Sanctuary component. */
export interface SanctuaryProps {
  /** World position [x, y, z] of the sanctuary center. */
  position: [number, number, number];
  /** Current sanctuary health (0 to maxHealth). */
  health: number;
  /** Maximum sanctuary health. */
  maxHealth: number;
}

const _healthColor = new THREE.Color();
const _baseColor = new THREE.Color('#ffffff');
const _damagedColor = new THREE.Color('#aa2222');

/**
 * Sanctuary rendered using the keep.glb model with health-based material
 * tinting. As health decreases, materials lerp toward a deep red.
 * A golden point light on top simulates the Holy Grail glow.
 */
export function Sanctuary({ position, health, maxHealth }: SanctuaryProps) {
  const { scene } = useGLTF(BUILDING_MODEL_PATHS.keep);
  const groupRef = useRef<THREE.Group>(null);
  const materialsInitialized = useRef(false);
  const originalColors = useRef<Map<string, THREE.Color>>(new Map());

  useFrame(() => {
    if (!groupRef.current) return;

    const ratio = Math.max(0, Math.min(1, health / maxHealth));

    // Capture original colors once, then tint based on health
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (!mat.color) return;

        const id = child.uuid;
        if (!materialsInitialized.current) {
          originalColors.current.set(id, mat.color.clone());
        }

        const orig = originalColors.current.get(id);
        if (orig) {
          _healthColor.copy(orig).lerp(_damagedColor, 1 - ratio);
          mat.color.copy(_healthColor);
        }
      }
    });

    if (!materialsInitialized.current) {
      materialsInitialized.current = true;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <Clone object={scene} scale={[3, 3, 3]} castShadow receiveShadow />
      {/* Golden glow for the grail on top */}
      <pointLight position={[0, 5, 0]} color="#d4af37" intensity={2} distance={15} />
    </group>
  );
}
