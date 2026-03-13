/**
 * @module waveSystem.test
 *
 * TDD tests for the pure wave-system functions extracted from GameEngine.
 */

import {
  calculateWaveBudget,
  calculateBuildTimer,
  buildWaveQueue,
  isWaveComplete,
  calculateWaveCompletionReward,
  allocateWaveBudget,
  getWaveLabel,
  applyDifficultyModifiers,
} from '../../../engine/systems/waveSystem';
import { createRng } from '../../../engine/systems/rng';
import type { UnitType, EnemyAffix } from '../../../engine/constants';

describe('waveSystem', () => {
  describe('calculateWaveBudget', () => {
    it('returns a positive integer budget for wave 1', () => {
      const budget = calculateWaveBudget(1);
      expect(budget).toBeGreaterThan(0);
      expect(Number.isInteger(budget)).toBe(true);
    });

    it('scales up with higher waves', () => {
      const budgetW1 = calculateWaveBudget(1);
      const budgetW5 = calculateWaveBudget(5);
      const budgetW10 = calculateWaveBudget(10);
      expect(budgetW5).toBeGreaterThan(budgetW1);
      expect(budgetW10).toBeGreaterThan(budgetW5);
    });

    it('matches the original formula: floor(50 * 1.15^wave + 2 * wave^2)', () => {
      for (let w = 1; w <= 20; w++) {
        const expected = Math.floor(50 * 1.15 ** w + 2 * w * w);
        expect(calculateWaveBudget(w)).toBe(expected);
      }
    });
  });

  describe('calculateBuildTimer', () => {
    it('returns a positive integer for wave 1', () => {
      const timer = calculateBuildTimer(1);
      expect(timer).toBeGreaterThan(0);
      expect(Number.isInteger(timer)).toBe(true);
    });

    it('increases with higher wave numbers', () => {
      const timerW1 = calculateBuildTimer(1);
      const timerW10 = calculateBuildTimer(10);
      expect(timerW10).toBeGreaterThan(timerW1);
    });

    it('matches the original formula: floor(30 + 10 * ln(wave))', () => {
      for (let w = 1; w <= 20; w++) {
        const expected = Math.floor(30 + 10 * Math.log(w));
        expect(calculateBuildTimer(w)).toBe(expected);
      }
    });
  });

  describe('buildWaveQueue', () => {
    it('returns a non-empty queue for wave 1', () => {
      const rng = createRng('test-seed');
      const queue = buildWaveQueue(1, rng);
      expect(queue.length).toBeGreaterThan(0);
    });

    it('includes a boss entry on boss waves (multiples of 5)', () => {
      const rng = createRng('test-seed-boss');
      const queue = buildWaveQueue(5, rng);
      const hasBoss = queue.some((e) => e.type === 'boss');
      expect(hasBoss).toBe(true);
    });

    it('does not include a boss on non-boss waves', () => {
      const rng = createRng('test-seed-no-boss');
      const queue = buildWaveQueue(3, rng);
      const hasBoss = queue.some((e) => e.type === 'boss');
      expect(hasBoss).toBe(false);
    });

    it('only contains valid enemy unit types', () => {
      const rng = createRng('test-seed-types');
      const queue = buildWaveQueue(7, rng);
      const validTypes: UnitType[] = ['goblin', 'orc', 'troll', 'boss'];
      for (const entry of queue) {
        expect(validTypes).toContain(entry.type);
      }
    });

    it('does not assign affixes before wave 6', () => {
      const rng = createRng('test-seed-no-affix');
      const queue = buildWaveQueue(4, rng);
      for (const entry of queue) {
        expect(entry.affix).toBeUndefined();
      }
    });

    it('can assign affixes at wave 6 and above', () => {
      // Run with many seeds to catch at least one affix
      let foundAffix = false;
      for (let i = 0; i < 50; i++) {
        const rng = createRng(`affix-test-${i}`);
        const queue = buildWaveQueue(10, rng);
        if (queue.some((e) => e.affix !== undefined)) {
          foundAffix = true;
          break;
        }
      }
      expect(foundAffix).toBe(true);
    });

    it('produces deterministic output for the same seed', () => {
      const rng1 = createRng('deterministic');
      const rng2 = createRng('deterministic');
      const q1 = buildWaveQueue(8, rng1);
      const q2 = buildWaveQueue(8, rng2);
      expect(q1).toEqual(q2);
    });
  });

  describe('isWaveComplete', () => {
    it('returns true when queue is empty and no enemies alive', () => {
      expect(isWaveComplete(0, false)).toBe(true);
    });

    it('returns false when queue still has entries', () => {
      expect(isWaveComplete(3, false)).toBe(false);
    });

    it('returns false when enemies are still alive', () => {
      expect(isWaveComplete(0, true)).toBe(false);
    });
  });

  describe('calculateWaveCompletionReward', () => {
    it('returns base reward plus wave-scaled bonus', () => {
      const reward = calculateWaveCompletionReward(3, 500, false);
      // waveCompletionBonusBase=50, waveCompletionBonusPerWave=10 => 50 + 30 = 80
      expect(reward.goldReward).toBe(80);
      expect(reward.interest).toBe(0);
    });

    it('includes interest when golden_age relic is active', () => {
      const reward = calculateWaveCompletionReward(3, 500, true);
      // interest = floor(500 * 0.05) = 25
      expect(reward.interest).toBe(25);
      expect(reward.goldReward).toBe(80);
    });
  });

  describe('allocateWaveBudget', () => {
    it('only includes goblins on wave 1 (no orc/troll unlocked)', () => {
      const rng = createRng('wave1-progression');
      const queue = allocateWaveBudget(1, 200, rng);
      for (const entry of queue) {
        if (entry.type !== 'boss') {
          expect(entry.type).toBe('goblin');
        }
      }
    });

    it('includes goblins on wave 2 but not orcs or trolls', () => {
      const rng = createRng('wave2-progression');
      const queue = allocateWaveBudget(2, 200, rng);
      for (const entry of queue) {
        expect(entry.type).not.toBe('orc');
        expect(entry.type).not.toBe('troll');
      }
    });

    it('includes orcs starting at wave 3', () => {
      // Use enough budget and seeds to get orcs
      let foundOrc = false;
      for (let i = 0; i < 50; i++) {
        const rng = createRng(`wave3-orc-${i}`);
        const queue = allocateWaveBudget(3, 500, rng);
        if (queue.some((e) => e.type === 'orc')) {
          foundOrc = true;
          break;
        }
      }
      expect(foundOrc).toBe(true);
    });

    it('does not include trolls before wave 6', () => {
      for (let i = 0; i < 20; i++) {
        const rng = createRng(`wave5-no-troll-${i}`);
        const queue = allocateWaveBudget(5, 500, rng);
        expect(queue.some((e) => e.type === 'troll')).toBe(false);
      }
    });

    it('includes trolls starting at wave 6', () => {
      let foundTroll = false;
      for (let i = 0; i < 50; i++) {
        const rng = createRng(`wave6-troll-${i}`);
        const queue = allocateWaveBudget(6, 500, rng);
        if (queue.some((e) => e.type === 'troll')) {
          foundTroll = true;
          break;
        }
      }
      expect(foundTroll).toBe(true);
    });

    it('spends entire budget (no leftover exceeding cheapest unit)', () => {
      const rng = createRng('budget-spend');
      const queue = allocateWaveBudget(10, 200, rng);
      const totalCost = queue.reduce((sum, e) => {
        const costs: Record<string, number> = {
          goblin: 5, orc: 12, troll: 25, boss: 150,
          flying: 8, shieldBearer: 18, summoner: 20,
        };
        return sum + (costs[e.type] ?? 0);
      }, 0);
      expect(totalCost).toBeLessThanOrEqual(200);
      // leftover should be less than cheapest available unit (goblin=5)
      expect(200 - totalCost).toBeLessThan(5);
    });
  });

  describe('getWaveLabel', () => {
    it('returns "Scout Party" for budget <= 100', () => {
      expect(getWaveLabel(50)).toBe('Scout Party');
      expect(getWaveLabel(100)).toBe('Scout Party');
    });

    it('returns "Raiding Force" for budget 101-300', () => {
      expect(getWaveLabel(101)).toBe('Raiding Force');
      expect(getWaveLabel(200)).toBe('Raiding Force');
      expect(getWaveLabel(300)).toBe('Raiding Force');
    });

    it('returns "War Host" for budget > 300', () => {
      expect(getWaveLabel(301)).toBe('War Host');
      expect(getWaveLabel(1000)).toBe('War Host');
    });

    it('returns "War Host" for very large budgets', () => {
      expect(getWaveLabel(99999)).toBe('War Host');
    });
  });

  describe('applyDifficultyModifiers', () => {
    const baseStats = { hp: 100, damage: 50, speed: 5 };

    it('pilgrim reduces enemy stats by 20%', () => {
      const result = applyDifficultyModifiers(baseStats, 'pilgrim');
      expect(result.hp).toBe(80);
      expect(result.damage).toBe(40);
      expect(result.speed).toBe(4);
    });

    it('crusader leaves enemy stats unchanged', () => {
      const result = applyDifficultyModifiers(baseStats, 'crusader');
      expect(result.hp).toBe(100);
      expect(result.damage).toBe(50);
      expect(result.speed).toBe(5);
    });

    it('inquisitor increases enemy stats by 30%', () => {
      const result = applyDifficultyModifiers(baseStats, 'inquisitor');
      expect(result.hp).toBe(130);
      expect(result.damage).toBe(65);
      expect(result.speed).toBe(6);
    });

    it('floors fractional results', () => {
      const oddStats = { hp: 33, damage: 17, speed: 3 };
      const result = applyDifficultyModifiers(oddStats, 'inquisitor');
      // 33 * 1.3 = 42.9 => 42, 17 * 1.3 = 22.1 => 22, 3 * 1.3 = 3.9 => 3
      expect(result.hp).toBe(42);
      expect(result.damage).toBe(22);
      expect(result.speed).toBe(3);
    });

    it('does not mutate the input stats object', () => {
      const stats = { hp: 100, damage: 50, speed: 5 };
      applyDifficultyModifiers(stats, 'pilgrim');
      expect(stats.hp).toBe(100);
      expect(stats.damage).toBe(50);
      expect(stats.speed).toBe(5);
    });
  });
});
