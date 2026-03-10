import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Imperative queue (no props, no React state, zero re-renders on emit) ──
interface EmitEvent {
  position: [number, number, number];
  r: number; g: number; b: number;
  count: number;
}
const _queue: EmitEvent[] = [];

/** Call from CombatController or anywhere – triggers on next render frame. */
export function emitParticles(
  position: [number, number, number],
  color: string,
  count: number,
) {
  const c = new THREE.Color(color);
  _queue.push({ position, r: c.r, g: c.g, b: c.b, count });
}

// ─── Pool ──────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; g: number; b: number;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 350;

export function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pool = useRef<Particle[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const col = useRef(new THREE.Color());

  useEffect(() => {
    pool.current = Array.from({ length: POOL_SIZE }, () => ({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      r: 1, g: 0.5, b: 0,
      life: 0, maxLife: 1,
    }));
  }, []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;

    // Drain emit queue
    while (_queue.length > 0) {
      const evt = _queue.shift()!;
      let spawned = 0;
      for (const p of pool.current) {
        if (p.life > 0 || spawned >= evt.count) continue;
        p.x = evt.position[0]; p.y = evt.position[1]; p.z = evt.position[2];
        p.vx = (Math.random() - 0.5) * 4.5;
        p.vy = Math.random() * 5.5 + 1.5;
        p.vz = (Math.random() - 0.5) * 4.5;
        p.r = evt.r; p.g = evt.g; p.b = evt.b;
        p.maxLife = 0.55 + Math.random() * 0.5;
        p.life = p.maxLife;
        spawned++;
      }
    }

    // Simulate & upload to GPU
    let active = 0;
    for (const p of pool.current) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 11 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const scale = (p.life / p.maxLife) * 0.17;
      dummy.current.position.set(p.x, p.y, p.z);
      dummy.current.scale.setScalar(Math.max(0, scale));
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(active, dummy.current.matrix);
      col.current.setRGB(p.r, p.g, p.b);
      meshRef.current.setColorAt(active, col.current);
      active++;
    }

    // Hide unused slots
    for (let i = active; i < POOL_SIZE; i++) {
      dummy.current.scale.setScalar(0);
      dummy.current.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.current.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, POOL_SIZE]} renderOrder={8}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}
