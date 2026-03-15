/**
 * @module projectileSystem.test
 *
 * TDD tests for pure projectile functions: movement, impact processing.
 */

import {
  moveProjectile,
  type ProjectileData,
  processImpact,
} from '../../../engine/systems/projectileSystem';

describe('projectileSystem', () => {
  describe('moveProjectile', () => {
    it('moves toward target when far away', () => {
      const result = moveProjectile({ x: 0, y: 2, z: 0 }, { x: 10, y: 1, z: 0 }, 15, 0.1);
      expect(result.hit).toBe(false);
      expect(result.x).toBeGreaterThan(0);
    });

    it('reports hit when within threshold', () => {
      const result = moveProjectile({ x: 9.5, y: 1, z: 0 }, { x: 10, y: 1, z: 0 }, 15, 0.1);
      expect(result.hit).toBe(true);
    });

    it('interpolates Y toward target', () => {
      const result = moveProjectile({ x: 0, y: 5, z: 0 }, { x: 100, y: 1, z: 0 }, 15, 0.1);
      // Y should move toward targetY + 0.5
      expect(result.y).toBeLessThan(5);
    });
  });

  describe('processImpact', () => {
    it('applies direct damage to single target (no splash)', () => {
      const proj: ProjectileData = {
        damage: 50,
        isHeal: false,
        isPoison: false,
        splashRadius: 0,
        isSlow: false,
        color: '#ffffff',
      };
      const result = processImpact(proj, { id: 1, team: 'enemy' }, { x: 10, z: 10 }, []);
      expect(result.directDamage).toBe(50);
      expect(result.splashTargets).toHaveLength(0);
      expect(result.applyPoison).toBe(false);
      expect(result.applySlow).toBe(false);
    });

    it('applies splash damage to nearby same-team units', () => {
      const proj: ProjectileData = {
        damage: 80,
        isHeal: false,
        isPoison: false,
        splashRadius: 5,
        isSlow: false,
        color: '#ffffff',
      };
      const nearby = [
        { id: 1, team: 'enemy' as const, x: 10, z: 10 }, // the target itself
        { id: 2, team: 'enemy' as const, x: 11, z: 10 }, // close enough
        { id: 3, team: 'enemy' as const, x: 50, z: 50 }, // out of range
        { id: 4, team: 'ally' as const, x: 10.5, z: 10 }, // wrong team
      ];
      const result = processImpact(proj, { id: 1, team: 'enemy' }, { x: 10, z: 10 }, nearby);
      expect(result.splashTargets.length).toBe(2); // id 1 (target) and id 2 (nearby enemy)
      // The direct target is handled via splash, so directDamage should be 0
      // (splash handles all)
    });

    it('applies poison flag', () => {
      const proj: ProjectileData = {
        damage: 15,
        isHeal: false,
        isPoison: true,
        splashRadius: 0,
        isSlow: false,
        color: '#ffffff',
      };
      const result = processImpact(proj, { id: 1, team: 'enemy' }, { x: 0, z: 0 }, []);
      expect(result.applyPoison).toBe(true);
    });

    it('applies slow flag', () => {
      const proj: ProjectileData = {
        damage: 10,
        isHeal: false,
        isPoison: false,
        splashRadius: 0,
        isSlow: true,
        color: '#ffffff',
      };
      const result = processImpact(proj, { id: 1, team: 'enemy' }, { x: 0, z: 0 }, []);
      expect(result.applySlow).toBe(true);
    });

    it('handles heal projectile', () => {
      const proj: ProjectileData = {
        damage: -20,
        isHeal: true,
        isPoison: false,
        splashRadius: 0,
        isSlow: false,
        color: '#34d399',
      };
      const result = processImpact(proj, { id: 1, team: 'ally' }, { x: 0, z: 0 }, []);
      expect(result.directDamage).toBe(-20);
      expect(result.isHeal).toBe(true);
    });
  });
});
