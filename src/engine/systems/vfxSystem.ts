/**
 * @module vfxSystem
 *
 * Pure functions for particle physics, floating text updates, world effect
 * updates, and particle burst generation. No ECS access.
 */

import type { Rng } from './rng';

/** Gravity applied to particles per second squared. */
const GRAVITY = 18;
/** Horizontal drag factor applied each frame. */
const DRAG = 0.96;

/** Result of updating a single particle for one frame. */
export interface ParticleUpdateResult {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  dead: boolean;
}

/**
 * Advances a particle's physics by one time step. Pure function.
 *
 * @param state - Current particle state.
 * @param dt - Delta time in seconds.
 * @returns Updated state including dead flag.
 */
export function updateParticlePure(
  state: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number },
  dt: number,
): ParticleUpdateResult {
  const life = state.life - dt;
  const x = state.x + state.vx * dt;
  const y = state.y + state.vy * dt;
  const z = state.z + state.vz * dt;
  const vy = state.vy - GRAVITY * dt;
  const vx = state.vx * DRAG;
  const vz = state.vz * DRAG;

  return { x, y, z, vx, vy, vz, life, dead: life <= 0 };
}

/** Result of updating floating text for one frame. */
export interface FloatingTextUpdateResult {
  y: number;
  life: number;
  dead: boolean;
}

/**
 * Advances a floating text entity by one time step. Pure function.
 * When reducedFx is true, skips processing and returns the input unchanged.
 *
 * @param state - Current floating text state.
 * @param dt - Delta time in seconds.
 * @param reducedFx - When true, skips all processing.
 * @returns Updated state including dead flag.
 */
export function updateFloatingTextPure(
  state: { y: number; life: number; riseSpeed: number },
  dt: number,
  reducedFx?: boolean,
): FloatingTextUpdateResult {
  if (reducedFx) {
    return { y: state.y, life: state.life, dead: false };
  }
  const life = state.life - dt;
  const y = state.y + state.riseSpeed * dt;
  return { y, life, dead: life <= 0 };
}

/** Result of updating a world effect for one frame. */
export interface WorldEffectUpdateResult {
  life: number;
  dead: boolean;
}

/**
 * Advances a world effect by one time step. Pure function.
 *
 * @param state - Current effect state.
 * @param dt - Delta time in seconds.
 * @returns Updated state including dead flag.
 */
export function updateWorldEffectPure(
  state: { life: number },
  dt: number,
): WorldEffectUpdateResult {
  const life = state.life - dt;
  return { life, dead: life <= 0 };
}

/** Data for a generated particle. */
export interface ParticleBurstEntry {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  size: number;
  color: string;
}

/**
 * Generates a burst of particles at a position with randomized velocities.
 * Uses a seeded PRNG for determinism.
 * When reducedFx is true, returns an empty array (no particles spawned).
 *
 * @param position - World-space origin of the burst.
 * @param color - Particle color.
 * @param count - Number of particles to generate.
 * @param intensity - Velocity scale factor.
 * @param rng - Seeded PRNG instance.
 * @param reducedFx - When true, returns empty array.
 * @returns Array of particle initial states.
 */
export function generateParticleBurst(
  position: { x: number; y: number; z: number },
  color: string,
  count: number,
  intensity: number,
  rng: Rng,
  reducedFx?: boolean,
): ParticleBurstEntry[] {
  if (reducedFx) {
    return [];
  }

  const particles: ParticleBurstEntry[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: position.x,
      y: position.y + 1.5,
      z: position.z,
      vx: (rng.next() - 0.5) * 8 * intensity,
      vy: (4 + rng.next() * 7) * intensity,
      vz: (rng.next() - 0.5) * 8 * intensity,
      life: 0.45 + rng.next() * 0.4,
      size: 0.15 + rng.next() * 0.28,
      color,
    });
  }

  return particles;
}
