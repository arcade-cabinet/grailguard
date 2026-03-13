import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Position, WorldEffect } from '../../../engine/GameEngine';

export function WorldEffectMesh({ entity }: { entity: Entity }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pillarRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const effect = entity.get(WorldEffect);
    const position = entity.get(Position);
    if (!effect || !position || !ringRef.current || !pillarRef.current) return;

    const progress = effect.maxLife <= 0 ? 1 : 1 - effect.life / effect.maxLife;
    const ringScale = 0.65 + progress * 1.45;
    ringRef.current.position.set(position.x, position.y, position.z);
    ringRef.current.scale.set(effect.radius * ringScale, effect.radius * ringScale, 1);

    const ringMaterial = ringRef.current.material;
    if (ringMaterial instanceof Object && 'opacity' in ringMaterial) {
      ringMaterial.opacity = Math.max(0, (1 - progress) * 0.9);
    }

    pillarRef.current.position.set(position.x, position.y + 0.35 + progress * 1.4, position.z);
    pillarRef.current.scale.set(
      effect.kind === 'boss_spawn' ? 1.8 + progress * 1.4 : 0.9 + progress * 0.8,
      1 + progress * 4.5,
      effect.kind === 'boss_spawn' ? 1.8 + progress * 1.4 : 0.9 + progress * 0.8,
    );
    const pillarMaterial = pillarRef.current.material;
    if (pillarMaterial instanceof Object && 'opacity' in pillarMaterial) {
      pillarMaterial.opacity = Math.max(
        0,
        (1 - progress) * (effect.kind === 'boss_spawn' ? 0.55 : 0.75),
      );
    }
  });

  const effect = entity.get(WorldEffect);
  if (!effect) return null;

  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 1, 48]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh ref={pillarRef}>
        <cylinderGeometry args={[0.5, 0.8, 1, 24, 1, true]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}
