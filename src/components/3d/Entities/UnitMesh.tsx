import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../../engine/constants';

const TYPE_COLORS: Record<string, string> = {
  wall:    '#888888',
  militia: '#44aa44',
  archer:  '#44ff88',
  cleric:  '#ffffff',
  knight:  '#aaaaff',
  goblin:  '#aa5500',
  orc:     '#663300',
  troll:   '#553322',
  boss:    '#ff0000',
};

interface UnitMeshProps {
  entity: Entity;
}

export function UnitMesh({ entity }: UnitMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseY = useRef(entity.type === 'wall' ? 0.5 : 0.3);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.set(
      entity.position.x,
      baseY.current + Math.abs(Math.sin(state.clock.elapsedTime * entity.speed)) * 0.2,
      entity.position.z
    );
  });

  const color = TYPE_COLORS[entity.type] ?? '#4488ff';
  const hpRatio = entity.hp / entity.maxHp;

  return (
    <group>
      <mesh ref={meshRef} castShadow position={[entity.position.x, baseY.current, entity.position.z]}>
        {entity.type === 'wall' ? (
          <boxGeometry args={[1.8, 2.0, 0.5]} />
        ) : (
          <capsuleGeometry args={[0.25, 0.4, 4, 8]} />
        )}
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* HP bar */}
      <mesh position={[entity.position.x, baseY.current + 0.9, entity.position.z]}>
        <planeGeometry args={[hpRatio * 0.8, 0.1]} />
        <meshBasicMaterial color={hpRatio > 0.5 ? '#00ff00' : hpRatio > 0.25 ? '#ffaa00' : '#ff0000'} />
      </mesh>
    </group>
  );
}
