/**
 * @module logisticsSystem.test
 *
 * TDD tests for pure logistics functions: BFS pathfinding, cart movement,
 * and resource delivery calculation.
 */

import {
  calculateDelivery,
  findLogisticsPathPure,
  moveCartStep,
} from '../../../engine/systems/logisticsSystem';

describe('logisticsSystem', () => {
  describe('findLogisticsPathPure', () => {
    it('returns null when no tracks exist', () => {
      const result = findLogisticsPathPure({ x: 0, z: 0 }, 'wood', [], [{ x: 50, z: 50 }], {
        x: 50,
        z: 50,
      });
      expect(result).toBeNull();
    });

    it('finds a direct path from source to sanctuary via adjacent tracks', () => {
      const tracks = [
        { x: 5, z: 0 },
        { x: 10, z: 0 },
        { x: 15, z: 0 },
      ];
      const sanctuaryPos = { x: 20, z: 0 };
      const result = findLogisticsPathPure({ x: 0, z: 0 }, 'wood', tracks, [], sanctuaryPos);
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(2);
      // Path should end at or near sanctuary
      const last = result![result!.length - 1];
      expect(Math.hypot(last.x - sanctuaryPos.x, last.z - sanctuaryPos.z)).toBeLessThan(6);
    });

    it('returns null when no path connects source to sink', () => {
      const tracks = [
        { x: 5, z: 0 },
        // gap -- no track near sanctuary
      ];
      const sanctuaryPos = { x: 100, z: 100 };
      const result = findLogisticsPathPure({ x: 0, z: 0 }, 'wood', tracks, [], sanctuaryPos);
      expect(result).toBeNull();
    });

    it('routes ore to mint when available', () => {
      const tracks = [
        { x: 5, z: 0 },
        { x: 10, z: 0 },
      ];
      const mintPos = { x: 15, z: 0 };
      const sanctuaryPos = { x: 100, z: 100 }; // far away
      const result = findLogisticsPathPure({ x: 0, z: 0 }, 'ore', tracks, [mintPos], sanctuaryPos);
      expect(result).not.toBeNull();
    });
  });

  describe('moveCartStep', () => {
    it('moves cart toward next waypoint', () => {
      const path = [
        { x: 10, z: 0 },
        { x: 20, z: 0 },
      ];
      const result = moveCartStep({ x: 0, z: 0 }, path, 0, 5, 1.0);
      expect(result.x).toBeGreaterThan(0);
      expect(result.pathIndex).toBe(0); // not yet arrived
    });

    it('advances pathIndex when reaching waypoint', () => {
      const path = [
        { x: 1, z: 0 },
        { x: 20, z: 0 },
      ];
      const result = moveCartStep({ x: 0.8, z: 0 }, path, 0, 5, 1.0);
      // distance < 0.5 triggers advance
      expect(result.pathIndex).toBe(1);
    });

    it('signals arrival when reaching end of path', () => {
      const path = [{ x: 1, z: 0 }];
      const result = moveCartStep({ x: 0.8, z: 0 }, path, 0, 5, 1.0);
      expect(result.arrived).toBe(true);
    });
  });

  describe('calculateDelivery', () => {
    it('delivers wood to sanctuary', () => {
      const result = calculateDelivery('wood', false, false);
      expect(result).toEqual({ resource: 'wood', amount: 10, gold: 0 });
    });

    it('delivers ore to sanctuary', () => {
      const result = calculateDelivery('ore', false, false);
      expect(result).toEqual({ resource: 'ore', amount: 1, gold: 0 });
    });

    it('delivers gem to sanctuary', () => {
      const result = calculateDelivery('gem', false, false);
      expect(result).toEqual({ resource: 'gem', amount: 1, gold: 0 });
    });

    it('doubles gem with blessed_pickaxe relic', () => {
      const result = calculateDelivery('gem', false, true);
      expect(result).toEqual({ resource: 'gem', amount: 2, gold: 0 });
    });

    it('converts ore to gold at mint', () => {
      const result = calculateDelivery('ore', true, false);
      expect(result).toEqual({ resource: 'ore', amount: 0, gold: 15 });
    });
  });
});
