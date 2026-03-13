/**
 * @module ParticleMesh
 *
 * Renders a single particle effect as a small, fading box.
 */
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import * as THREE from 'three';
import { Particle, Position } from '../../../engine/GameEngine';

/**
 * Renders a particle entity as a box whose scale and opacity are driven by
 * the particle's remaining `life`. The color is updated each frame from the
 * `Particle.color` trait, allowing particles to shift hue as they decay.
 *
 * @param props.entity - The Koota entity carrying `Particle` and `Position` traits.
 */
export function ParticleMesh({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const particle = entity.get(Particle);
    const position = entity.get(Position);
    if (!meshRef.current || !particle || !position) return;

    meshRef.current.position.set(position.x, position.y, position.z);
    meshRef.current.scale.setScalar(particle.size * Math.max(0.2, particle.life * 1.2));

    const material = meshRef.current.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.opacity = Math.max(0, particle.life);
      material.color.set(particle.color);
    }
  });

  const particle = entity.get(Particle);
  const position = entity.get(Position);
  if (!particle || !position) return null;

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={particle.color} transparent opacity={particle.life} />
    </mesh>
  );
}
