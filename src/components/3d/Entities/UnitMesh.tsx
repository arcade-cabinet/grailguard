import { Clone, useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Facing, Position, Unit } from '../../../engine/GameEngine';
import { UNIT_MODEL_PATHS } from '../modelPaths';

export function UnitMesh({ entity, selected = false }: { entity: Entity; selected?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const hpBarGroupRef = useRef<THREE.Group>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);
  const selectionRef = useRef<THREE.Mesh>(null);
  const unit = entity.get(Unit);
  const position = entity.get(Position);

  const modelPath = unit ? UNIT_MODEL_PATHS[unit.type] : '';
  const { scene, animations } = useGLTF(modelPath as string);
  const { actions } = useAnimations(animations, groupRef);

  const currentAnimationRef = useRef('');
  const previousPositionRef = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const currentUnit = entity.get(Unit);
    const currentPosition = entity.get(Position);
    const facing = entity.get(Facing);
    if (!groupRef.current || !currentUnit || !currentPosition || !facing) return;

    let nextAnimation = 'idle';
    if (currentUnit.type !== 'wall') {
      const dx = currentPosition.x - previousPositionRef.current.x;
      const dz = currentPosition.z - previousPositionRef.current.z;
      const velocity = Math.hypot(dx, dz) / Math.max(0.001, delta);
      
      if (currentUnit.cooldown > currentUnit.atkSpd * 0.8) {
        nextAnimation = 'attack';
      } else if (velocity > 0.1) {
        nextAnimation = 'walk';
      }
    }

    if (nextAnimation !== currentAnimationRef.current) {
      const prevAction = actions?.[currentAnimationRef.current];
      const nextAction = actions?.[nextAnimation];
      if (prevAction) prevAction.fadeOut(0.2);
      if (nextAction) nextAction.reset().fadeIn(0.2).play();
      currentAnimationRef.current = nextAnimation;
    }

    previousPositionRef.current.set(currentPosition.x, currentPosition.y, currentPosition.z);

    const bob =
      currentUnit.type === 'wall'
        ? 0
        : Math.abs(Math.sin(state.clock.elapsedTime * currentUnit.speed * 2.5)) * 0.12;

    groupRef.current.position.set(currentPosition.x, currentPosition.y + bob, currentPosition.z);
    groupRef.current.rotation.y = facing.y;

    if (hpBarRef.current) {
      const ratio = Math.max(0, currentUnit.hp / currentUnit.maxHp);
      hpBarRef.current.scale.x = Math.max(0.05, ratio);
      const material = hpBarRef.current.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(ratio > 0.6 ? '#22c55e' : ratio > 0.3 ? '#f59e0b' : '#ef4444');
      }
      hpBarGroupRef.current?.quaternion.copy(state.camera.quaternion);
    }

    if (selectionRef.current) {
      selectionRef.current.visible = selected;
      selectionRef.current.rotation.z += 1.5 / 60;
    }
  });

  if (!unit || !position) return null;

  const scale = (() => {
    switch (unit.type) {
      case 'wall':
        return 0.5;
      case 'boss':
        return 1.5;
      case 'troll':
        return 1.2;
      case 'orc':
        return 0.8;
      case 'goblin':
        return 0.6;
      case 'knight':
        return 0.9;
      case 'militia':
        return 0.8;
      default:
        return 0.7;
    }
  })();

  return (
    <group ref={groupRef}>
      <Clone object={scene} scale={scale} castShadow receiveShadow />
      <mesh
        ref={selectionRef}
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={selected}
      >
        <ringGeometry args={[2.2, 2.9, 32]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.85} />
      </mesh>
      <group ref={hpBarGroupRef} position={[0, unit.type === 'wall' ? 4 : 2.6, 0]}>
        <mesh>
          <planeGeometry args={[2.3, 0.26]} />
          <meshBasicMaterial color="#111111" transparent opacity={0.8} depthTest={false} />
        </mesh>
        <mesh ref={hpBarRef} position={[0, 0, 0.02]}>
          <planeGeometry args={[2.1, 0.18]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.95} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
