/**
 * @module ProjectileMesh
 *
 * Renders a single in-flight projectile as a small colored sphere.
 */
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Position, Projectile } from '../../../engine/GameEngine';

/**
 * Renders a projectile entity as a sphere whose size depends on whether it
 * is a healing orb or a standard attack projectile. Color is driven by the
 * `Projectile.color` trait value. Position is synced every frame.
 *
 * @param props.entity - The Koota entity carrying `Projectile` and `Position` traits.
 */
export function ProjectileMesh({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const position = entity.get(Position);
    if (position) {
      meshRef.current.position.set(position.x, position.y, position.z);
    }
  });

  const proj = entity.get(Projectile);
  if (!proj) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[proj.isHeal ? 0.3 : 0.2, 8, 8]} />
      <meshBasicMaterial color={proj.color} />
    </mesh>
  );
}
