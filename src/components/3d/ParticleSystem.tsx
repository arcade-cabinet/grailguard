import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// ─── Imperative queue (no props, no React state, zero re-renders on emit) ──
type ParticleType = 'dot' | 'coin' | 'dust' | 'spark';

interface EmitEvent {
  type: ParticleType;
  position: [number, number, number];
  r: number;
  g: number;
  b: number;
  count: number;
}
const _queue: EmitEvent[] = [];

/**
 * Enqueue a burst of particles to be spawned on the next render frame.
 */
export function emitParticles(position: [number, number, number], color: string, count: number) {
  const c = new THREE.Color(color);
  _queue.push({ type: 'dot', position, r: c.r, g: c.g, b: c.b, count });
}

export function emitCoins(position: [number, number, number], count: number) {
  _queue.push({ type: 'coin', position, r: 1.0, g: 0.84, b: 0.0, count });
}

export function emitDust(position: [number, number, number], count: number) {
  _queue.push({ type: 'dust', position, r: 0.6, g: 0.6, b: 0.55, count });
}

export function emitSparks(position: [number, number, number], count: number) {
  _queue.push({ type: 'spark', position, r: 1.0, g: 0.5, b: 0.0, count });
}

// ─── Pool ──────────────────────────────────────────────────────────────────
interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 500;

export function ParticleSystem() {
  const dotMeshRef = useRef<THREE.InstancedMesh>(null);
  const coinMeshRef = useRef<THREE.InstancedMesh>(null);
  const dustMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);

  // Load the detailed GLTF coin and extract its geometry and material for instancing
  const { scene: coinScene } = useGLTF('/assets/models/coin.glb');
  const coinGeoMat = useMemo(() => {
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.Material | null = null;
    coinScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && !geometry) {
        geometry = mesh.geometry;
        material = mesh.material as THREE.Material;
      }
    });
    return { geometry, material };
  }, [coinScene]);

  const pool = useRef<Particle[]>([]);
  const dummy = useRef(new THREE.Object3D());
  const col = useRef(new THREE.Color());

  useEffect(() => {
    pool.current = Array.from({ length: POOL_SIZE }, () => ({
      type: 'dot',
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      r: 1,
      g: 0.5,
      b: 0,
      life: 0,
      maxLife: 1,
    }));
  }, []);

  useFrame((_, dt) => {
    if (
      !dotMeshRef.current ||
      !coinMeshRef.current ||
      !dustMeshRef.current ||
      !sparkMeshRef.current
    )
      return;

    // Drain emit queue
    while (_queue.length > 0) {
      const evt = _queue.shift();
      if (!evt) break;
      let spawned = 0;
      for (const p of pool.current) {
        if (p.life > 0 || spawned >= evt.count) continue;
        p.type = evt.type;
        p.x = evt.position[0];
        p.y = evt.position[1];
        p.z = evt.position[2];

        if (evt.type === 'dust') {
          p.vx = (Math.random() - 0.5) * 3.0;
          p.vy = Math.random() * 2.0 + 0.5;
          p.vz = (Math.random() - 0.5) * 3.0;
          p.maxLife = 0.8 + Math.random() * 0.4;
        } else if (evt.type === 'spark') {
          p.vx = (Math.random() - 0.5) * 6.0;
          p.vy = Math.random() * 4.0 + 2.0;
          p.vz = (Math.random() - 0.5) * 6.0;
          p.maxLife = 0.3 + Math.random() * 0.2;
        } else if (evt.type === 'coin') {
          p.vx = (Math.random() - 0.5) * 3.0;
          p.vy = Math.random() * 5.0 + 3.0;
          p.vz = (Math.random() - 0.5) * 3.0;
          p.maxLife = 1.0 + Math.random() * 0.5;
        } else {
          p.vx = (Math.random() - 0.5) * 4.5;
          p.vy = Math.random() * 5.5 + 1.5;
          p.vz = (Math.random() - 0.5) * 4.5;
          p.maxLife = 0.55 + Math.random() * 0.5;
        }

        p.r = evt.r;
        p.g = evt.g;
        p.b = evt.b;
        p.life = p.maxLife;
        spawned++;
      }
    }

    // Simulate & upload to GPU
    let iDot = 0,
      iCoin = 0,
      iDust = 0,
      iSpark = 0;

    for (const p of pool.current) {
      if (p.life <= 0) continue;
      p.life -= dt;

      // Physics
      if (p.type === 'dust') {
        p.vy -= 2 * dt; // light gravity
        p.vx *= 0.95; // drag
        p.vz *= 0.95;
      } else {
        p.vy -= 11 * dt; // normal gravity
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Bouncing for coins
      if (p.type === 'coin' && p.y < 0.1) {
        p.y = 0.1;
        p.vy = Math.abs(p.vy) * 0.5;
        p.vx *= 0.7;
        p.vz *= 0.7;
      } else if (p.y < 0) {
        // Floor collision
        p.y = 0;
        p.vy = 0;
        p.vx = 0;
        p.vz = 0;
      }

      let scale = p.life / p.maxLife;
      if (p.type === 'dot') scale *= 0.17;
      else if (p.type === 'coin') scale *= 0.25;
      else if (p.type === 'dust') scale *= 0.4;
      else if (p.type === 'spark') scale *= 0.15;

      dummy.current.position.set(p.x, p.y, p.z);
      dummy.current.scale.setScalar(Math.max(0, scale));

      if (p.type === 'coin') {
        dummy.current.rotation.x += dt * 5;
        dummy.current.rotation.y += dt * 3;
      } else if (p.type === 'spark') {
        // Point sparks roughly in velocity direction
        if (p.vx !== 0 || p.vy !== 0 || p.vz !== 0) {
          const target = new THREE.Vector3(p.x + p.vx, p.y + p.vy, p.z + p.vz);
          dummy.current.lookAt(target);
        }
        dummy.current.scale.set(scale * 0.2, scale * 0.2, scale * 1.5); // stretch
      } else {
        dummy.current.rotation.set(0, 0, 0);
      }

      dummy.current.updateMatrix();
      col.current.setRGB(p.r, p.g, p.b);

      if (p.type === 'dot') {
        dotMeshRef.current.setMatrixAt(iDot, dummy.current.matrix);
        dotMeshRef.current.setColorAt(iDot, col.current);
        iDot++;
      } else if (p.type === 'coin') {
        coinMeshRef.current.setMatrixAt(iCoin, dummy.current.matrix);
        coinMeshRef.current.setColorAt(iCoin, col.current);
        iCoin++;
      } else if (p.type === 'dust') {
        dustMeshRef.current.setMatrixAt(iDust, dummy.current.matrix);
        dustMeshRef.current.setColorAt(iDust, col.current);
        iDust++;
      } else if (p.type === 'spark') {
        sparkMeshRef.current.setMatrixAt(iSpark, dummy.current.matrix);
        sparkMeshRef.current.setColorAt(iSpark, col.current);
        iSpark++;
      }
    }

    // Hide unused slots
    dummy.current.scale.setScalar(0);
    dummy.current.updateMatrix();
    for (let i = iDot; i < POOL_SIZE; i++) dotMeshRef.current.setMatrixAt(i, dummy.current.matrix);
    for (let i = iCoin; i < POOL_SIZE; i++)
      coinMeshRef.current.setMatrixAt(i, dummy.current.matrix);
    for (let i = iDust; i < POOL_SIZE; i++)
      dustMeshRef.current.setMatrixAt(i, dummy.current.matrix);
    for (let i = iSpark; i < POOL_SIZE; i++)
      sparkMeshRef.current.setMatrixAt(i, dummy.current.matrix);

    dotMeshRef.current.instanceMatrix.needsUpdate = true;
    coinMeshRef.current.instanceMatrix.needsUpdate = true;
    dustMeshRef.current.instanceMatrix.needsUpdate = true;
    sparkMeshRef.current.instanceMatrix.needsUpdate = true;
    if (dotMeshRef.current.instanceColor) dotMeshRef.current.instanceColor.needsUpdate = true;
    if (coinMeshRef.current.instanceColor) coinMeshRef.current.instanceColor.needsUpdate = true;
    if (dustMeshRef.current.instanceColor) dustMeshRef.current.instanceColor.needsUpdate = true;
    if (sparkMeshRef.current.instanceColor) sparkMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={dotMeshRef} args={[undefined, undefined, POOL_SIZE]} renderOrder={8}>
        <sphereGeometry args={[1, 5, 5]} />
        <meshBasicMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={coinMeshRef} args={[undefined, undefined, POOL_SIZE]} renderOrder={8}>
        {coinGeoMat.geometry ? (
          <primitive object={coinGeoMat.geometry} attach="geometry" />
        ) : (
          <cylinderGeometry args={[1, 1, 0.2, 8]} />
        )}
        {coinGeoMat.material ? (
          <primitive object={coinGeoMat.material} attach="material" />
        ) : (
          <meshStandardMaterial vertexColors metalness={0.8} roughness={0.2} />
        )}
      </instancedMesh>
      <instancedMesh ref={dustMeshRef} args={[undefined, undefined, POOL_SIZE]} renderOrder={8}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial vertexColors transparent opacity={0.6} />
      </instancedMesh>
      <instancedMesh ref={sparkMeshRef} args={[undefined, undefined, POOL_SIZE]} renderOrder={8}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial vertexColors />
      </instancedMesh>
    </group>
  );
}
