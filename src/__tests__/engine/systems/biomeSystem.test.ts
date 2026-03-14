/**
 * @module biomeSystem.test
 *
 * TDD tests for the biome system. Tests biome modifier application
 * to session parameters, validation of all biome configs, and edge cases.
 */

import {
  applyBiomeModifiers,
  getBiomeConfig,
  getAllBiomeIds,
  type BiomeSession,
} from '../../../engine/systems/biomeSystem';

describe('biomeSystem', () => {
  /** Helper: create a default session for testing. */
  function makeSession(overrides: Partial<BiomeSession> = {}): BiomeSession {
    return {
      faithRegenRate: 1.0,
      killGoldBase: 10,
      enemySpeed: 5,
      enemyHp: 100,
      buildTimer: 30,
      dropChance: 0.1,
      ...overrides,
    };
  }

  describe('getAllBiomeIds', () => {
    it('returns all 4 biome IDs', () => {
      const ids = getAllBiomeIds();
      expect(ids).toContain('kings-road');
      expect(ids).toContain('desert-wastes');
      expect(ids).toContain('frost-peaks');
      expect(ids).toContain('shadow-marsh');
      expect(ids).toHaveLength(4);
    });
  });

  describe('getBiomeConfig', () => {
    it('returns config for kings-road', () => {
      const config = getBiomeConfig('kings-road');
      expect(config).toBeDefined();
      expect(config.terrainColors).toHaveLength(4);
      expect(config.ambientAudioKey).toBe('forest');
    });

    it('returns config for desert-wastes', () => {
      const config = getBiomeConfig('desert-wastes');
      expect(config.faithRegenMultiplier).toBe(0.5);
      expect(config.killGoldMultiplier).toBe(1.5);
    });

    it('returns config for frost-peaks', () => {
      const config = getBiomeConfig('frost-peaks');
      expect(config.enemySpeedMultiplier).toBe(0.8);
      expect(config.buildTimerMultiplier).toBe(0.8);
    });

    it('returns config for shadow-marsh', () => {
      const config = getBiomeConfig('shadow-marsh');
      expect(config.enemyHpMultiplier).toBe(1.2);
      expect(config.dropChanceMultiplier).toBe(2.0);
    });

    it('falls back to kings-road for unknown biome', () => {
      const config = getBiomeConfig('nonexistent');
      expect(config.ambientAudioKey).toBe('forest');
    });

    it('every biome has sceneryTypes array', () => {
      for (const id of getAllBiomeIds()) {
        const config = getBiomeConfig(id);
        expect(Array.isArray(config.sceneryTypes)).toBe(true);
        expect(config.sceneryTypes.length).toBeGreaterThan(0);
      }
    });

    it('every biome has exactly 4 terrain colors', () => {
      for (const id of getAllBiomeIds()) {
        const config = getBiomeConfig(id);
        expect(config.terrainColors).toHaveLength(4);
      }
    });
  });

  describe('applyBiomeModifiers', () => {
    it('kings-road applies no modifications (all multipliers = 1)', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'kings-road');
      expect(modified.faithRegenRate).toBe(1.0);
      expect(modified.killGoldBase).toBe(10);
      expect(modified.enemySpeed).toBe(5);
      expect(modified.enemyHp).toBe(100);
      expect(modified.buildTimer).toBe(30);
      expect(modified.dropChance).toBe(0.1);
    });

    it('desert-wastes halves faith regen and increases gold by 50%', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'desert-wastes');
      expect(modified.faithRegenRate).toBeCloseTo(0.5, 2);
      expect(modified.killGoldBase).toBe(15);
    });

    it('frost-peaks reduces enemy speed and build timer by 20%', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'frost-peaks');
      expect(modified.enemySpeed).toBeCloseTo(4, 2);
      expect(modified.buildTimer).toBeCloseTo(24, 2);
    });

    it('shadow-marsh increases enemy HP by 20% and doubles drop chance', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'shadow-marsh');
      expect(modified.enemyHp).toBeCloseTo(120, 2);
      expect(modified.dropChance).toBeCloseTo(0.2, 2);
    });

    it('does not mutate the input session object', () => {
      const session = makeSession();
      applyBiomeModifiers(session, 'desert-wastes');
      expect(session.faithRegenRate).toBe(1.0);
      expect(session.killGoldBase).toBe(10);
    });

    it('returns a new object', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'desert-wastes');
      expect(modified).not.toBe(session);
    });

    it('handles unknown biome by returning unmodified copy', () => {
      const session = makeSession();
      const modified = applyBiomeModifiers(session, 'nonexistent');
      expect(modified.faithRegenRate).toBe(1.0);
      expect(modified.killGoldBase).toBe(10);
    });

    it('floors integer results (killGoldBase, enemyHp)', () => {
      const session = makeSession({ killGoldBase: 7 });
      const modified = applyBiomeModifiers(session, 'desert-wastes');
      // 7 * 1.5 = 10.5, floor = 10
      expect(modified.killGoldBase).toBe(10);
    });
  });
});
