/**
 * @module buildingSystem.test
 *
 * TDD tests for pure building functions: placement validation, upgrade costs,
 * sell values, and spawn rate calculation.
 */

import {
  isPlacementValidPure,
  calculateUpgradeCost,
  calculateSellValue,
  calculateSpawnRate,
  snapToGrid,
  getRoadDistancePure,
  canAffordBuilding,
} from '../../../engine/systems/buildingSystem';

describe('buildingSystem', () => {
  describe('snapToGrid', () => {
    it('snaps to 5-unit grid', () => {
      expect(snapToGrid({ x: 3, y: 2, z: 7 })).toEqual({ x: 5, y: 1.5, z: 5 });
    });

    it('keeps values on grid unchanged', () => {
      expect(snapToGrid({ x: 10, y: 5, z: 15 })).toEqual({ x: 10, y: 1.5, z: 15 });
    });

    it('rounds negative values correctly', () => {
      expect(snapToGrid({ x: -3, y: 0, z: -12 })).toEqual({ x: -5, y: 1.5, z: -10 });
    });
  });

  describe('getRoadDistancePure', () => {
    it('returns 0 when position is on a road sample', () => {
      const samples = [{ x: 10, z: 20 }];
      expect(getRoadDistancePure({ x: 10, z: 20 }, samples)).toBe(0);
    });

    it('returns correct distance to nearest road point', () => {
      const samples = [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ];
      const dist = getRoadDistancePure({ x: 5, z: 3 }, samples);
      // nearest road point is (10,0), distance = hypot(5,3) ~= 5.83
      // or (0,0), distance = hypot(5,3) ~= 5.83 -- same
      expect(dist).toBeCloseTo(Math.hypot(5, 3), 1);
    });
  });

  describe('isPlacementValidPure', () => {
    const roadSamples = [
      { x: 0, z: 0 },
      { x: 5, z: 0 },
      { x: 10, z: 0 },
    ];
    const sanctuaryPos = { x: 10, z: 0 };

    it('rejects placement on sanctuary for non-track', () => {
      const result = isPlacementValidPure(
        'hut',
        { x: 10, z: 0 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(false);
    });

    it('allows track on sanctuary', () => {
      const result = isPlacementValidPure(
        'track',
        { x: 10, z: 0 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(true);
    });

    it('requires walls to be near road (distance <= 4)', () => {
      // Position at (0,3) => distance to road at (0,0) = 3
      const result = isPlacementValidPure(
        'wall',
        { x: 0, z: 3 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(true);
    });

    it('rejects walls far from road', () => {
      const result = isPlacementValidPure(
        'wall',
        { x: 0, z: 20 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(false);
    });

    it('requires buildings to be far from road (distance >= 7)', () => {
      // Position at (0,10) => distance to nearest road (0,0) = 10
      const result = isPlacementValidPure(
        'hut',
        { x: 0, z: 10 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(true);
    });

    it('rejects buildings too close to road', () => {
      const result = isPlacementValidPure(
        'hut',
        { x: 0, z: 3 },
        roadSamples,
        sanctuaryPos,
        [],
        [],
      );
      expect(result).toBe(false);
    });

    it('rejects overlapping existing building', () => {
      const existingBuildings = [{ type: 'hut' as const, x: 0, z: 10 }];
      const result = isPlacementValidPure(
        'range',
        { x: 0, z: 10 },
        roadSamples,
        sanctuaryPos,
        existingBuildings,
        [],
      );
      expect(result).toBe(false);
    });

    it('allows track to overlap resource buildings', () => {
      const existingBuildings = [{ type: 'lumber' as const, x: 0, z: 10 }];
      const result = isPlacementValidPure(
        'track',
        { x: 0, z: 10 },
        roadSamples,
        sanctuaryPos,
        existingBuildings,
        [],
      );
      expect(result).toBe(true);
    });

    it('rejects overlapping wall unit', () => {
      const wallUnits = [{ x: 0, z: 3 }];
      const result = isPlacementValidPure(
        'hut',
        { x: 0, z: 3 },
        roadSamples,
        sanctuaryPos,
        [],
        wallUnits,
      );
      expect(result).toBe(false);
    });
  });

  describe('calculateUpgradeCost', () => {
    it('returns spawn branch cost: 50 * level', () => {
      expect(calculateUpgradeCost('spawn', 1)).toBe(50);
      expect(calculateUpgradeCost('spawn', 3)).toBe(150);
    });

    it('returns stats branch cost: 75 * level', () => {
      expect(calculateUpgradeCost('stats', 1)).toBe(75);
      expect(calculateUpgradeCost('stats', 3)).toBe(225);
    });
  });

  describe('calculateSellValue', () => {
    it('returns 50% of total invested gold', () => {
      // cost=50, levelSpawn=1, levelStats=1 => sell = floor(50 * 0.5) = 25
      const result = calculateSellValue('hut', 1, 1);
      expect(result.gold).toBe(25);
    });

    it('includes upgrade costs in sell value', () => {
      // cost=50, levelSpawn=3 => (3-1)*50=100, levelStats=2 => (2-1)*75=75
      // total = 50 + 100 + 75 = 225, sell = floor(225 * 0.5) = 112
      const result = calculateSellValue('hut', 3, 2);
      expect(result.gold).toBe(112);
    });

    it('returns wood refund at 50%', () => {
      // wall woodCost=15 => floor(15 * 0.5) = 7
      const result = calculateSellValue('wall', 1, 1);
      expect(result.wood).toBe(7);
    });
  });

  describe('calculateSpawnRate', () => {
    it('returns base spawn time at level 1', () => {
      // hut spawnTime = 3.5, level 1 => 3.5 * 0.8^0 = 3.5
      const rate = calculateSpawnRate('hut', 1);
      expect(rate).toBeCloseTo(3.5, 2);
    });

    it('decreases spawn time with higher level', () => {
      const rateL1 = calculateSpawnRate('hut', 1);
      const rateL3 = calculateSpawnRate('hut', 3);
      expect(rateL3).toBeLessThan(rateL1);
    });
  });

  describe('canAffordBuilding', () => {
    it('returns true when player has enough resources', () => {
      expect(canAffordBuilding('hut', 100, 50, [])).toBe(true);
    });

    it('returns false when gold is insufficient', () => {
      expect(canAffordBuilding('hut', 10, 50, [])).toBe(false);
    });

    it('returns false when wood is insufficient', () => {
      expect(canAffordBuilding('hut', 100, 5, [])).toBe(false);
    });

    it('waives wood cost for track with iron_tracks relic', () => {
      expect(canAffordBuilding('track', 10, 0, ['iron_tracks'])).toBe(true);
    });
  });
});
