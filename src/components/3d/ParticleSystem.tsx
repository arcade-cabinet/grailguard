import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 200;

interface ParticleSystemProps {
  emitEvents: Array<{
    position: [number, number, number];
    color: string;
    count: number;
  }>;
}

export function ParticleSystem({ emitEvents }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const color = useRef(new THREE.Color());

  useEffect(() => {
    // Initialize pool
    particles.current = Array.from({ length: POOL_SIZE }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 0,
    }));
  }, []);

  useEffect(() => {
    for (const evt of emitEvents) {
      let spawned = 0;
      for (const p of particles.current) {
        if (p.life <= 0 && spawned < evt.count) {
          p.position.set(...evt.position);
          p.velocity.set(
            (Math.random() - 0.5) * 3,
            Math.random() * 4 + 1,
            (Math.random() - 0.5) * 3
          );
          p.maxLife = 0.8 + Math.random() * 0.4;
          p.life = p.maxLife;
          spawned++;
        }
      }
    }
  }, [emitEvents]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    let active = 0;
    for (const p of particles.current) {
      if (p.life <= 0) continue;
      p.life -= delta;
      p.velocity.y -= 9.8 * delta;
      p.position.addScaledVector(p.velocity, delta);

      const scale = p.life / p.maxLife;
      dummy.current.position.copy(p.position);
      dummy.current.scale.setScalar(scale * 0.15);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(active, dummy.current.matrix);
      color.current.set(p.life / p.maxLife > 0.5 ? '#ffaa00' : '#ff4400');
      meshRef.current.setColorAt(active, color.current);
      active++;
    }
    // Hide inactive instances
    for (let i = active; i < POOL_SIZE; i++) {
      dummy.current.scale.setScalar(0);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POOL_SIZE]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
