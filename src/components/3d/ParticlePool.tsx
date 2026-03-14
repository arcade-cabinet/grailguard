/**
 * @module ParticlePool
 *
 * Pre-allocated InstancedMesh particle pool for high-performance particle
 * rendering. Replaces individual ParticleMesh entities with a single draw
 * call for up to 500 simultaneous particles.
 *
 * Exposes the {@link useParticlePool} hook so any system or component can
 * spawn particle bursts without creating/destroying ECS entities.
 */
import { useFrame } from '@react-three/fiber';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import * as THREE from 'three';
import renderConfig from '../../data/renderConfig.json';

const { poolSize, gravity, drag, bounceRestitution, size } = renderConfig.particles;

/** Internal state for a single particle slot. */
interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

/** Parameters for spawning a single particle within a burst. */
export interface ParticleSpawnParams {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: string;
}

/** The public interface returned by {@link useParticlePool}. */
export interface ParticlePoolAPI {
  /** Spawn a burst of particles. Returns the number actually spawned. */
  spawnBurst: (particles: ParticleSpawnParams[]) => number;
  /** Number of currently active particles. */
  activeCount: () => number;
}

const ParticlePoolContext = createContext<ParticlePoolAPI | null>(null);

/**
 * Hook to access the particle pool from any child of {@link ParticlePool}.
 * Returns an API for spawning bursts and querying active count.
 */
export function useParticlePool(): ParticlePoolAPI {
  const ctx = useContext(ParticlePoolContext);
  if (!ctx) {
    // Return a no-op API when used outside the pool provider
    return {
      spawnBurst: () => 0,
      activeCount: () => 0,
    };
  }
  return ctx;
}

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();
const _hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * InstancedMesh-based particle pool. Pre-allocates {@link poolSize} slots
 * and manages activate/deactivate cycling. Physics (gravity, drag, bounce)
 * run in {@link useFrame} for all active particles in a single pass.
 *
 * Wrap the Arena scene children with this component and use
 * {@link useParticlePool} to spawn bursts.
 */
export function ParticlePool({ children }: { children?: React.ReactNode }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Allocate slot array once
  const slots = useMemo<ParticleSlot[]>(() => {
    const arr: ParticleSlot[] = [];
    for (let i = 0; i < poolSize; i++) {
      arr.push({
        active: false,
        x: 0,
        y: -1000,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        r: 1,
        g: 1,
        b: 1,
      });
    }
    return arr;
  }, []);

  // Free list for O(1) allocation
  const freeList = useMemo<number[]>(() => {
    const list: number[] = [];
    for (let i = poolSize - 1; i >= 0; i--) {
      list.push(i);
    }
    return list;
  }, []);

  const activeCountRef = useRef(0);

  const activate = useCallback(
    (params: ParticleSpawnParams): number => {
      if (freeList.length === 0) return -1;
      const idx = freeList.pop()!;
      const slot = slots[idx];
      slot.active = true;
      slot.x = params.x;
      slot.y = params.y;
      slot.z = params.z;
      slot.vx = params.vx;
      slot.vy = params.vy;
      slot.vz = params.vz;
      slot.life = params.life;
      slot.maxLife = params.life;
      _tempColor.set(params.color);
      slot.r = _tempColor.r;
      slot.g = _tempColor.g;
      slot.b = _tempColor.b;
      activeCountRef.current++;
      return idx;
    },
    [slots, freeList],
  );

  const deactivate = useCallback(
    (idx: number) => {
      const slot = slots[idx];
      if (!slot.active) return;
      slot.active = false;
      slot.y = -1000;
      freeList.push(idx);
      activeCountRef.current--;
    },
    [slots, freeList],
  );

  const spawnBurst = useCallback(
    (particles: ParticleSpawnParams[]): number => {
      let spawned = 0;
      for (const p of particles) {
        if (activate(p) >= 0) spawned++;
      }
      return spawned;
    },
    [activate],
  );

  const activeCount = useCallback(() => activeCountRef.current, []);

  const api = useMemo<ParticlePoolAPI>(
    () => ({ spawnBurst, activeCount }),
    [spawnBurst, activeCount],
  );

  // Per-frame physics update
  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.05); // clamp to avoid spiral of death

    for (let i = 0; i < poolSize; i++) {
      const slot = slots[i];
      if (!slot.active) {
        // Keep hidden
        mesh.setMatrixAt(i, _hiddenMatrix);
        continue;
      }

      // Lifetime decay
      slot.life -= dt;
      if (slot.life <= 0) {
        deactivate(i);
        mesh.setMatrixAt(i, _hiddenMatrix);
        continue;
      }

      // Velocity integration
      slot.vy -= gravity * dt;
      slot.vx *= drag;
      slot.vz *= drag;

      slot.x += slot.vx * dt;
      slot.y += slot.vy * dt;
      slot.z += slot.vz * dt;

      // Bounce off ground
      if (slot.y <= 0) {
        slot.y = 0;
        slot.vy = -slot.vy * bounceRestitution;
      }

      // Scale by remaining life fraction
      const lifeRatio = Math.max(0.1, slot.life / slot.maxLife);
      const s = size * lifeRatio;

      _tempObj.position.set(slot.x, slot.y, slot.z);
      _tempObj.scale.set(s, s, s);
      _tempObj.updateMatrix();
      mesh.setMatrixAt(i, _tempObj.matrix);

      // Per-instance color
      _tempColor.setRGB(slot.r, slot.g, slot.b);
      mesh.setColorAt(i, _tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  // Initialize all instances as hidden
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  );

  return (
    <ParticlePoolContext.Provider value={api}>
      <instancedMesh ref={meshRef} args={[geometry, material, poolSize]} frustumCulled={false} />
      {children}
    </ParticlePoolContext.Provider>
  );
}
