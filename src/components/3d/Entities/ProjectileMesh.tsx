/**
 * @module ProjectileMesh
 *
 * Renders a single in-flight projectile as a visible, glowing sphere with
 * a trailing streak effect for combat readability.
 */
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import * as THREE from 'three';
import { Position, Projectile } from '../../../engine/GameEngine';

/** Number of trail segments rendered behind the projectile. */
const TRAIL_LENGTH = 5;

/**
 * Renders a projectile entity as a bright emissive sphere (0.5+ units) with
 * a fading trail streak for visual impact. Heal orbs are slightly larger and
 * softer. Color and emissive glow are driven by the `Projectile.color` trait.
 *
 * @param props.entity - The Koota entity carrying `Projectile` and `Position` traits.
 */
export function ProjectileMesh({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3()),
  );
  const trailCountRef = useRef(0);
  const trailMeshesRef = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    if (!groupRef.current) return;
    const position = entity.get(Position);
    if (!position) return;

    groupRef.current.position.set(position.x, position.y, position.z);

    // Update trail history using pre-allocated ring buffer (shift existing entries forward)
    const trail = trailRef.current;
    const count = Math.min(trailCountRef.current, TRAIL_LENGTH - 1);
    for (let i = count; i > 0; i--) {
      trail[i].copy(trail[i - 1]);
    }
    trail[0].set(position.x, position.y, position.z);
    if (trailCountRef.current < TRAIL_LENGTH) trailCountRef.current++;

    // Update trail mesh positions and opacity
    const activeCount = trailCountRef.current;
    for (let i = 0; i < trailMeshesRef.current.length; i++) {
      const mesh = trailMeshesRef.current[i];
      if (i + 1 < activeCount) {
        mesh.position.set(
          trail[i + 1].x - position.x,
          trail[i + 1].y - position.y,
          trail[i + 1].z - position.z,
        );
        mesh.visible = true;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * (1 - (i + 1) / TRAIL_LENGTH);
      } else {
        mesh.visible = false;
      }
    }
  });

  const proj = entity.get(Projectile);
  if (!proj) return null;

  const radius = proj.isHeal ? 0.6 : 0.5;
  const trailRadius = radius * 0.6;

  return (
    <group ref={groupRef}>
      {/* Main projectile sphere with emissive glow */}
      <mesh>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshStandardMaterial
          color={proj.color}
          emissive={proj.color}
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </mesh>
      {/* Outer glow halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.8, 8, 8]} />
        <meshBasicMaterial color={proj.color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {/* Trail segments */}
      {Array.from({ length: TRAIL_LENGTH - 1 }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            if (el) trailMeshesRef.current[i] = el;
          }}
        >
          <sphereGeometry args={[trailRadius * (1 - (i + 1) / TRAIL_LENGTH), 6, 6]} />
          <meshBasicMaterial color={proj.color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
