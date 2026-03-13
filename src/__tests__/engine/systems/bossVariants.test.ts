/**
 * @module bossVariants.test
 *
 * TDD tests for boss ability variants (US-081).
 * Tests getBossVariant() and bossConfig.json data.
 */

import bossConfig from '../../../data/bossConfig.json';
import { getBossVariant } from '../../../engine/systems/waveSystem';

describe('boss ability variants (US-081)', () => {
  describe('bossConfig.json', () => {
    it('contains warlord at wave 5 with aoe_slam ability', () => {
      expect(bossConfig.warlord.wave).toBe(5);
      expect(bossConfig.warlord.ability).toBe('aoe_slam');
      expect(bossConfig.warlord.radius).toBe(5);
      expect(bossConfig.warlord.damage).toBe(40);
    });

    it('contains necromancer at wave 10 with summon_on_death ability', () => {
      expect(bossConfig.necromancer.wave).toBe(10);
      expect(bossConfig.necromancer.ability).toBe('summon_on_death');
      expect(bossConfig.necromancer.minionCount).toBe(3);
    });

    it('contains dragon at wave 15 with fire_breath ability', () => {
      expect(bossConfig.dragon.wave).toBe(15);
      expect(bossConfig.dragon.ability).toBe('fire_breath');
      expect(bossConfig.dragon.range).toBe(12);
      expect(bossConfig.dragon.damage).toBe(30);
    });

    it('contains siegeEngine at wave 20 with building_target ability', () => {
      expect(bossConfig.siegeEngine.wave).toBe(20);
      expect(bossConfig.siegeEngine.ability).toBe('building_target');
    });
  });

  describe('getBossVariant', () => {
    it('returns warlord for wave 5', () => {
      const variant = getBossVariant(5);
      expect(variant).toBeDefined();
      expect(variant!.id).toBe('warlord');
      expect(variant!.ability).toBe('aoe_slam');
    });

    it('returns necromancer for wave 10', () => {
      const variant = getBossVariant(10);
      expect(variant).toBeDefined();
      expect(variant!.id).toBe('necromancer');
      expect(variant!.ability).toBe('summon_on_death');
    });

    it('returns dragon for wave 15', () => {
      const variant = getBossVariant(15);
      expect(variant).toBeDefined();
      expect(variant!.id).toBe('dragon');
      expect(variant!.ability).toBe('fire_breath');
    });

    it('returns siegeEngine for wave 20', () => {
      const variant = getBossVariant(20);
      expect(variant).toBeDefined();
      expect(variant!.id).toBe('siegeEngine');
      expect(variant!.ability).toBe('building_target');
    });

    it('returns undefined for non-boss waves', () => {
      expect(getBossVariant(3)).toBeUndefined();
      expect(getBossVariant(7)).toBeUndefined();
      expect(getBossVariant(13)).toBeUndefined();
    });

    it('returns the highest matching variant when wave exceeds all thresholds', () => {
      // Wave 25 is past all boss thresholds; should return the highest matching
      const variant = getBossVariant(25);
      expect(variant).toBeDefined();
      expect(variant!.id).toBe('siegeEngine');
    });
  });
});
