/**
 * @module ResourceCartMesh
 *
 * Renders a resource cart entity as a bouncing colored cube.
 */
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Position, ResourceCart } from '../../../engine/GameEngine';

/**
 * Renders a resource cart entity as a small box that bounces while it
 * travels along the road. The box color indicates the resource type:
 * brown for wood, slate for ore, and cyan for gems.
 *
 * @param props.entity - The Koota entity carrying `ResourceCart` and `Position` traits.
 */
export function ResourceCartMesh({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const position = entity.get(Position);
    if (position) {
      const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 15)) * 0.2;
      meshRef.current.position.set(position.x, position.y + bounce + 0.75, position.z);
    }
  });

  const cart = entity.get(ResourceCart);
  if (!cart) return null;

  const color =
    cart.resource === 'wood' ? '#8b5a2b' : cart.resource === 'ore' ? '#475569' : '#06b6d4';

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
