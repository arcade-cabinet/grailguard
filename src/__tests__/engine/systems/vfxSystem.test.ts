/**
 * @module vfxSystem.test
 *
 * TDD tests for pure VFX functions: particle physics, floating text,
 * world effect updates, and particle burst spawning.
 */

import {
  updateParticlePure,
  updateFloatingTextPure,
  updateWorldEffectPure,
  generateParticleBurst,
} from '../../../engine/systems/vfxSystem';
import { createRng } from '../../../engine/systems/rng';

describe('vfxSystem', () => {
  describe('updateParticlePure', () => {
    it('decrements life by dt', () => {
      const result = updateParticlePure(
        { x: 0, y: 5, z: 0, vx: 1, vy: 10, vz: 0, life: 1 },
        0.1,
      );
      expect(result.life).toBeCloseTo(0.9, 2);
    });

    it('applies velocity to position', () => {
      const result = updateParticlePure(
        { x: 0, y: 5, z: 0, vx: 10, vy: 0, vz: 5, life: 1 },
        0.1,
      );
      expect(result.x).toBeCloseTo(1, 1);
      expect(result.z).toBeCloseTo(0.5, 1);
    });

    it('applies gravity to vy', () => {
      const result = updateParticlePure(
        { x: 0, y: 5, z: 0, vx: 0, vy: 10, vz: 0, life: 1 },
        0.1,
      );
      // gravity = 18, vy = 10 - 18*0.1 = 8.2
      expect(result.vy).toBeCloseTo(8.2, 1);
    });

    it('applies drag to vx and vz', () => {
      const result = updateParticlePure(
        { x: 0, y: 5, z: 0, vx: 10, vy: 0, vz: 10, life: 1 },
        0.1,
      );
      // drag = 0.96
      expect(result.vx).toBeCloseTo(10 * 0.96, 1);
      expect(result.vz).toBeCloseTo(10 * 0.96, 1);
    });

    it('marks dead when life reaches 0', () => {
      const result = updateParticlePure(
        { x: 0, y: 5, z: 0, vx: 0, vy: 0, vz: 0, life: 0.05 },
        0.1,
      );
      expect(result.dead).toBe(true);
    });
  });

  describe('updateFloatingTextPure', () => {
    it('decrements life and rises', () => {
      const result = updateFloatingTextPure({ y: 5, life: 1, riseSpeed: 8 }, 0.1);
      expect(result.life).toBeCloseTo(0.9, 2);
      expect(result.y).toBeCloseTo(5.8, 1);
    });

    it('marks dead when life depleted', () => {
      const result = updateFloatingTextPure({ y: 5, life: 0.05, riseSpeed: 8 }, 0.1);
      expect(result.dead).toBe(true);
    });
  });

  describe('updateWorldEffectPure', () => {
    it('decrements life', () => {
      const result = updateWorldEffectPure({ life: 1 }, 0.2);
      expect(result.life).toBeCloseTo(0.8, 2);
    });

    it('marks dead when life depleted', () => {
      const result = updateWorldEffectPure({ life: 0.05 }, 0.1);
      expect(result.dead).toBe(true);
    });
  });

  describe('generateParticleBurst', () => {
    it('generates the requested number of particles', () => {
      const rng = createRng('test-vfx');
      const particles = generateParticleBurst(
        { x: 0, y: 2, z: 0 },
        '#ff0000',
        10,
        1.0,
        rng,
      );
      expect(particles).toHaveLength(10);
    });

    it('particles have correct color and initial position', () => {
      const rng = createRng('test-vfx-2');
      const particles = generateParticleBurst(
        { x: 5, y: 3, z: 7 },
        '#00ff00',
        5,
        1.0,
        rng,
      );
      for (const p of particles) {
        expect(p.color).toBe('#00ff00');
        expect(p.x).toBe(5);
        expect(p.y).toBe(4.5); // y + 1.5
        expect(p.z).toBe(7);
      }
    });

    it('produces deterministic output for same seed', () => {
      const rng1 = createRng('deterministic-vfx');
      const rng2 = createRng('deterministic-vfx');
      const p1 = generateParticleBurst({ x: 0, y: 0, z: 0 }, '#fff', 5, 1, rng1);
      const p2 = generateParticleBurst({ x: 0, y: 0, z: 0 }, '#fff', 5, 1, rng2);
      expect(p1).toEqual(p2);
    });

    it('scales velocity with intensity', () => {
      const rng1 = createRng('intensity-test');
      const rng2 = createRng('intensity-test');
      const low = generateParticleBurst({ x: 0, y: 0, z: 0 }, '#fff', 5, 0.5, rng1);
      const high = generateParticleBurst({ x: 0, y: 0, z: 0 }, '#fff', 5, 2.0, rng2);
      // Higher intensity should mean higher velocity magnitudes on average
      const avgVyLow = low.reduce((s, p) => s + p.vy, 0) / low.length;
      const avgVyHigh = high.reduce((s, p) => s + p.vy, 0) / high.length;
      expect(avgVyHigh).toBeGreaterThan(avgVyLow);
    });

    it('returns empty array when reducedFx is true', () => {
      const rng = createRng('reduced-fx');
      const particles = generateParticleBurst(
        { x: 0, y: 0, z: 0 },
        '#ff0000',
        10,
        1.0,
        rng,
        true,
      );
      expect(particles).toHaveLength(0);
    });

    it('returns normal particles when reducedFx is false', () => {
      const rng = createRng('not-reduced');
      const particles = generateParticleBurst(
        { x: 0, y: 0, z: 0 },
        '#ff0000',
        10,
        1.0,
        rng,
        false,
      );
      expect(particles).toHaveLength(10);
    });

    it('returns normal particles when reducedFx is omitted', () => {
      const rng = createRng('default-fx');
      const particles = generateParticleBurst(
        { x: 0, y: 0, z: 0 },
        '#ff0000',
        10,
        1.0,
        rng,
      );
      expect(particles).toHaveLength(10);
    });
  });

  describe('updateFloatingTextPure (reducedFx)', () => {
    it('skips processing when reducedFx is true', () => {
      const result = updateFloatingTextPure({ y: 5, life: 1, riseSpeed: 8 }, 0.1, true);
      // When reduced, y and life should be unchanged
      expect(result.y).toBe(5);
      expect(result.life).toBe(1);
      expect(result.dead).toBe(false);
    });

    it('processes normally when reducedFx is false', () => {
      const result = updateFloatingTextPure({ y: 5, life: 1, riseSpeed: 8 }, 0.1, false);
      expect(result.life).toBeCloseTo(0.9, 2);
      expect(result.y).toBeCloseTo(5.8, 1);
    });

    it('processes normally when reducedFx is omitted', () => {
      const result = updateFloatingTextPure({ y: 5, life: 1, riseSpeed: 8 }, 0.1);
      expect(result.life).toBeCloseTo(0.9, 2);
      expect(result.y).toBeCloseTo(5.8, 1);
    });
  });
});
