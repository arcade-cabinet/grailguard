/**
 * @module Sanctuary
 *
 * Elaborate 3D model of the Holy Grail sanctuary at the road's end.
 * Features 4 corner towers with conical roofs, a central rotating grail
 * sphere, flickering torch lights, and health-based material degradation.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/** Props for the Sanctuary component. */
export interface SanctuaryProps {
  /** World position [x, y, z] of the sanctuary center. */
  position: [number, number, number];
  /** Current sanctuary health (0 to maxHealth). */
  health: number;
  /** Maximum sanctuary health. */
  maxHealth: number;
}

// Tower offsets from center
const TOWER_OFFSETS: [number, number][] = [
  [-3, -3],
  [3, -3],
  [-3, 3],
  [3, 3],
];

const _healthColor = new THREE.Color();
const _baseColor = new THREE.Color('#c0c0c0'); // silver stone
const _damagedColor = new THREE.Color('#aa2222'); // deep red

/**
 * Elaborate Sanctuary with 4 corner towers (CylinderGeometry + ConeGeometry
 * roofs), a central rotating golden grail (SphereGeometry), flickering
 * torch PointLights at each tower top, and health-based color degradation.
 */
export function Sanctuary({ position, health, maxHealth }: SanctuaryProps) {
  const grailRef = useRef<THREE.Mesh>(null);
  const torch0Ref = useRef<THREE.PointLight>(null);
  const torch1Ref = useRef<THREE.PointLight>(null);
  const torch2Ref = useRef<THREE.PointLight>(null);
  const torch3Ref = useRef<THREE.PointLight>(null);
  const wallMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const torchRefs = [torch0Ref, torch1Ref, torch2Ref, torch3Ref];

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Rotate grail continuously
    if (grailRef.current) {
      grailRef.current.rotation.y += 0.02;
    }

    // Flicker torches with sin wave + slight phase offset per torch
    for (let i = 0; i < torchRefs.length; i++) {
      const torch = torchRefs[i].current;
      if (torch) {
        const flicker = 0.8 + 0.2 * Math.sin(time * 5 + i * 1.5);
        torch.intensity = flicker;
      }
    }

    // Health-based degradation: lerp wall color toward red
    if (wallMatRef.current) {
      const ratio = Math.max(0, Math.min(1, health / maxHealth));
      _healthColor.copy(_baseColor).lerp(_damagedColor, 1 - ratio);
      wallMatRef.current.color.copy(_healthColor);
    }
  });

  return (
    <group position={position}>
      {/* Base platform */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[10, 0.5, 10]} />
        <meshStandardMaterial ref={wallMatRef} color="#c0c0c0" roughness={0.7} />
      </mesh>

      {/* 4 corner towers */}
      {TOWER_OFFSETS.map(([ox, oz], idx) => (
        <group key={`tower-${ox}-${oz}`} position={[ox, 0, oz]}>
          {/* Tower body */}
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[1, 1, 4, 8]} />
            <meshStandardMaterial color="#888888" roughness={0.8} />
          </mesh>
          {/* Conical roof */}
          <mesh position={[0, 5, 0]}>
            <coneGeometry args={[1.2, 2, 8]} />
            <meshStandardMaterial color="#8b4513" roughness={0.6} />
          </mesh>
          {/* Torch light at tower top */}
          <pointLight
            ref={torchRefs[idx]}
            position={[0, 4.5, 0]}
            color="#ff8833"
            intensity={0.8}
            distance={12}
            decay={2}
          />
        </group>
      ))}

      {/* Central grail sphere */}
      <mesh ref={grailRef} position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={0.9}
          roughness={0.1}
          emissive="#ffd700"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Grail pedestal */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 2.5, 8]} />
        <meshStandardMaterial color="#b8860b" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}
