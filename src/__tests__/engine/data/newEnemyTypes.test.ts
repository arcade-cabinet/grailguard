/**
 * @module newEnemyTypes.test
 *
 * Tests for the additional enemy types (flying, shieldBearer, summoner)
 * added in US-080, verifying their presence in unitConfig and
 * enemyProgression data.
 */

import unitConfig from '../../../data/unitConfig.json';
import enemyProgression from '../../../data/enemyProgression.json';
import { UNITS, type UnitType } from '../../../engine/constants';

describe('additional enemy types (US-080)', () => {
  describe('unitConfig.json', () => {
    it('contains flying unit entry', () => {
      expect(unitConfig.units).toHaveProperty('flying');
    });

    it('flying has speed 8 and hp 20', () => {
      const flying = unitConfig.units.flying;
      expect(flying.speed).toBe(8);
      expect(flying.hp).toBe(20);
    });

    it('flying has ignoresWalls flag', () => {
      const flying = (unitConfig.units as Record<string, Record<string, unknown>>).flying;
      expect(flying.ignoresWalls).toBe(true);
    });

    it('contains shieldBearer unit entry', () => {
      expect(unitConfig.units).toHaveProperty('shieldBearer');
    });

    it('shieldBearer has hp 100 and frontalReduction 0.75', () => {
      const sb = (unitConfig.units as Record<string, Record<string, unknown>>).shieldBearer;
      expect(sb.hp).toBe(100);
      expect(sb.frontalReduction).toBe(0.75);
    });

    it('contains summoner unit entry', () => {
      expect(unitConfig.units).toHaveProperty('summoner');
    });

    it('summoner has hp 60 and spawnsGoblinsEvery 5', () => {
      const summoner = (unitConfig.units as Record<string, Record<string, unknown>>).summoner;
      expect(summoner.hp).toBe(60);
      expect(summoner.spawnsGoblinsEvery).toBe(5);
    });
  });

  describe('enemyProgression.json', () => {
    it('flying unlocks at wave 8', () => {
      const prog = enemyProgression as Record<string, { unlockWave: number }>;
      expect(prog.flying.unlockWave).toBe(8);
    });

    it('shieldBearer unlocks at wave 10', () => {
      const prog = enemyProgression as Record<string, { unlockWave: number }>;
      expect(prog.shieldBearer.unlockWave).toBe(10);
    });

    it('summoner unlocks at wave 12', () => {
      const prog = enemyProgression as Record<string, { unlockWave: number }>;
      expect(prog.summoner.unlockWave).toBe(12);
    });
  });

  describe('constants.ts UNITS lookup', () => {
    it('includes flying in UNITS record', () => {
      expect(UNITS).toHaveProperty('flying');
    });

    it('includes shieldBearer in UNITS record', () => {
      expect(UNITS).toHaveProperty('shieldBearer');
    });

    it('includes summoner in UNITS record', () => {
      expect(UNITS).toHaveProperty('summoner');
    });

    it('flying stats have numeric color (parsed from hex)', () => {
      expect(typeof UNITS.flying.color).toBe('number');
    });

    it('all new enemy types have cost and reward fields', () => {
      for (const unitType of ['flying', 'shieldBearer', 'summoner'] as UnitType[]) {
        const unit = UNITS[unitType];
        expect(unit.cost).toBeDefined();
        expect(unit.cost).toBeGreaterThan(0);
        expect(unit.reward).toBeDefined();
        expect(unit.reward).toBeGreaterThan(0);
      }
    });
  });
});
