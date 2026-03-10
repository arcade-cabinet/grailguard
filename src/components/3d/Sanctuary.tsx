import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELL_SIZE } from '../../engine/constants';
import { generateNoiseTexture } from '../../engine/textureUtils';

export function Sanctuary() {
  const grailRef = useRef<THREE.Mesh>(null);
  const stoneTex = generateNoiseTexture('stone_col');
  const woodTex  = generateNoiseTexture('wood_col');

  useFrame((_, delta) => {
    if (grailRef.current) {
      grailRef.current.rotation.y += delta * 0.5;
    }
  });

  // Center of grid: ~(11,11) => world (0,0) approx
  return (
    <group position={[0, 0, 0]}>
      {/* Base platform */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[CELL_SIZE * 1.5, CELL_SIZE * 1.8, 0.6, 8]} />
        <meshStandardMaterial map={stoneTex} roughness={0.8} />
      </mesh>
      {/* Pillar */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.8, 6]} />
        <meshStandardMaterial map={woodTex} roughness={0.6} />
      </mesh>
      {/* Grail cup (spinning) */}
      <mesh ref={grailRef} position={[0, 2.4, 0]} castShadow>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Glow point light */}
      <pointLight position={[0, 2.5, 0]} color="#ffdd88" intensity={2} distance={8} />
    </group>
  );
}
