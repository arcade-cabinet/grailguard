import { useFrame } from '@react-three/fiber/native';
import type { Entity } from 'koota';
import { useRef } from 'react';
import * as THREE from 'three';
import { Position, Projectile } from '../../../engine/GameEngine';

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
