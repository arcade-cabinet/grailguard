import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { CELL_SIZE } from '../../engine/constants';
import { generateNoiseTexture } from '../../engine/textureUtils';
import { useGameStore } from '../../store/useGameStore';

const stoneTex = generateNoiseTexture('stone_col');
const woodTex = generateNoiseTexture('wood_col');

export function Sanctuary() {
  const grailRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const raysRef = useRef<THREE.Mesh>(null);

  // Flash red when player takes damage
  const prevHealth = useRef(20);

  useFrame((_, delta) => {
    const t = performance.now() / 1000;
    const health = useGameStore.getState().health;

    if (grailRef.current) {
      grailRef.current.rotation.y += delta * 0.7;
      grailRef.current.position.y = 2.5 + Math.sin(t * 1.4) * 0.12;
    }

    // Pulsing light intensity
    if (glowRef.current) {
      glowRef.current.intensity = 2.2 + Math.sin(t * 2.1) * 0.8;
      if (health < prevHealth.current) {
        // Red flash on damage
        glowRef.current.color.set('#ff2200');
        glowRef.current.intensity = 6;
      } else {
        glowRef.current.color.lerp(new THREE.Color('#ffcc44'), delta * 2);
      }
    }

    if (raysRef.current) {
      raysRef.current.rotation.y += delta * 0.3;
    }

    prevHealth.current = health;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Stone base – octagonal look with a box geometry */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[CELL_SIZE * 1.6, CELL_SIZE * 1.9, 0.55, 8]} />
        <meshStandardMaterial map={stoneTex} roughness={0.85} color="#b0a090" />
      </mesh>

      {/* Steps */}
      <mesh position={[0, 0.0, 0]} receiveShadow>
        <cylinderGeometry args={[CELL_SIZE * 2.1, CELL_SIZE * 2.3, 0.22, 8]} />
        <meshStandardMaterial map={stoneTex} roughness={0.9} color="#989080" />
      </mesh>

      {/* Wooden pillar */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 2.2, 7]} />
        <meshStandardMaterial map={woodTex} roughness={0.65} color="#8b5e3c" />
      </mesh>

      {/* Grail cup (spinning, floating) */}
      <mesh ref={grailRef} position={[0, 2.5, 0]} castShadow>
        <sphereGeometry args={[0.45, 10, 10]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffaa00"
          emissiveIntensity={1.0}
          roughness={0.1}
          metalness={0.95}
        />
      </mesh>

      {/* Inner glow ring */}
      <mesh ref={raysRef} position={[0, 2.5, 0]}>
        <torusGeometry args={[0.65, 0.06, 6, 18]} />
        <meshBasicMaterial color="#ffee88" transparent opacity={0.6} />
      </mesh>

      {/* Gold point light */}
      <pointLight
        ref={glowRef}
        position={[0, 2.7, 0]}
        color="#ffcc44"
        intensity={2.2}
        distance={10}
      />

      {/* Four corner torches */}
      {(
        [
          [-1.5, -1.5],
          [1.5, -1.5],
          [-1.5, 1.5],
          [1.5, 1.5],
        ] as [number, number][]
      ).map(([ox, oz]) => (
        <group key={`torch-${ox}-${oz}`} position={[ox, 0, oz]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.1, 1.2, 5]} />
            <meshStandardMaterial map={woodTex} color="#6b3a1f" />
          </mesh>
          <pointLight position={[0, 1.4, 0]} color="#ff8800" intensity={1.2} distance={4} />
        </group>
      ))}
    </group>
  );
}
