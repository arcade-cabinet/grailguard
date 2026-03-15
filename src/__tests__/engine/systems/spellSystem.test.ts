/**
 * @module spellSystem.test
 *
 * TDD tests for pure spell functions: canCastSpell, castSpell dispatcher,
 * and cooldown updates.
 */

import {
  canCastSpell,
  computeSpellEffect,
  type SpellTarget,
  updateCooldowns,
} from '../../../engine/systems/spellSystem';

describe('spellSystem', () => {
  describe('canCastSpell', () => {
    it('returns true when spell is available and affordable', () => {
      expect(canCastSpell('smite', 100, { smite: 0 }, false)).toBe(true);
    });

    it('returns false when on cooldown', () => {
      expect(canCastSpell('smite', 100, { smite: 5 }, false)).toBe(false);
    });

    it('returns false when game is over', () => {
      expect(canCastSpell('smite', 100, { smite: 0 }, true)).toBe(false);
    });

    it('returns false when faith is insufficient', () => {
      expect(canCastSpell('smite', 10, { smite: 0 }, false)).toBe(false);
    });

    it('handles missing cooldown entry as 0', () => {
      expect(canCastSpell('smite', 100, {}, false)).toBe(true);
    });
  });

  describe('computeSpellEffect', () => {
    const makeEnemy = (id: number, x: number, z: number, hp: number): SpellTarget => ({
      id,
      team: 'enemy',
      x,
      z,
      hp,
      maxHp: hp,
    });

    const makeAlly = (id: number, x: number, z: number, hp: number, maxHp = hp): SpellTarget => ({
      id,
      team: 'ally',
      x,
      z,
      hp,
      maxHp,
      type: 'militia',
    });

    const sanctuaryPos = { x: 50, z: 50 };

    describe('smite', () => {
      it('damages up to 3 nearest enemies to sanctuary', () => {
        const enemies = [
          makeEnemy(1, 45, 50, 500), // closest to sanctuary
          makeEnemy(2, 40, 50, 500),
          makeEnemy(3, 35, 50, 500),
          makeEnemy(4, 10, 50, 500), // farthest
        ];
        const result = computeSpellEffect('smite', enemies, [], sanctuaryPos);
        expect(result.type).toBe('smite');
        expect(result.damageTargets).toHaveLength(3);
        expect(result.damageTargets.map((t) => t.id)).toEqual([1, 2, 3]);
        expect(result.damageTargets[0].damage).toBe(300);
      });

      it('returns empty targets when no enemies', () => {
        const result = computeSpellEffect('smite', [], [], sanctuaryPos);
        expect(result.damageTargets).toHaveLength(0);
      });
    });

    describe('holy_nova', () => {
      it('heals all non-wall allies', () => {
        const allies = [makeAlly(1, 0, 0, 50, 100), makeAlly(2, 10, 0, 30, 100)];
        const result = computeSpellEffect('holy_nova', [], allies, sanctuaryPos);
        expect(result.type).toBe('holy_nova');
        expect(result.healTargets).toHaveLength(2);
        expect(result.healTargets[0].heal).toBe(50);
      });

      it('excludes wall units from healing', () => {
        const allies = [{ ...makeAlly(1, 0, 0, 50, 100), type: 'wall' as const }];
        const result = computeSpellEffect('holy_nova', [], allies, sanctuaryPos);
        expect(result.healTargets).toHaveLength(0);
      });
    });

    describe('zealous_haste', () => {
      it('resets cooldown for all allies', () => {
        const allies = [makeAlly(1, 0, 0, 100), makeAlly(2, 10, 0, 100)];
        const result = computeSpellEffect('zealous_haste', [], allies, sanctuaryPos);
        expect(result.type).toBe('zealous_haste');
        expect(result.resetCooldownTargets).toHaveLength(2);
      });
    });

    describe('earthquake', () => {
      it('damages and stuns all enemies', () => {
        const enemies = [makeEnemy(1, 0, 0, 100), makeEnemy(2, 10, 0, 100)];
        const result = computeSpellEffect('earthquake', enemies, [], sanctuaryPos);
        expect(result.type).toBe('earthquake');
        expect(result.damageTargets).toHaveLength(2);
        expect(result.damageTargets[0].damage).toBe(20);
        expect(result.stunTargets).toHaveLength(2);
        expect(result.stunTargets[0].stunDuration).toBe(3);
      });
    });

    describe('chrono_shift', () => {
      it('freezes all enemies', () => {
        const enemies = [makeEnemy(1, 0, 0, 100)];
        const result = computeSpellEffect('chrono_shift', enemies, [], sanctuaryPos);
        expect(result.type).toBe('chrono_shift');
        expect(result.freezeTargets).toHaveLength(1);
        expect(result.freezeTargets[0].freezeDuration).toBe(4);
      });
    });

    describe('meteor_strike', () => {
      it('damages enemies near the closest to sanctuary', () => {
        const enemies = [
          makeEnemy(1, 48, 50, 500),
          makeEnemy(2, 49, 50, 500), // closest
          makeEnemy(3, 0, 0, 500), // far from target
        ];
        const result = computeSpellEffect('meteor_strike', enemies, [], sanctuaryPos);
        expect(result.type).toBe('meteor_strike');
        // Enemies within 10 of the closest to sanctuary
        expect(result.damageTargets.length).toBeGreaterThanOrEqual(2);
        expect(result.damageTargets[0].damage).toBe(400);
      });
    });

    describe('divine_shield', () => {
      it('grants invulnerability to all allies', () => {
        const allies = [makeAlly(1, 0, 0, 100), makeAlly(2, 10, 0, 100)];
        const result = computeSpellEffect('divine_shield', [], allies, sanctuaryPos);
        expect(result.type).toBe('divine_shield');
        expect(result.shieldTargets).toHaveLength(2);
        expect(result.shieldTargets[0].duration).toBe(5);
      });
    });
  });

  describe('updateCooldowns', () => {
    it('decrements all positive cooldowns by dt', () => {
      const result = updateCooldowns({ smite: 5, holy_nova: 10 }, 1.0);
      expect(result.smite).toBe(4);
      expect(result.holy_nova).toBe(9);
    });

    it('clamps cooldowns at 0', () => {
      const result = updateCooldowns({ smite: 0.5 }, 1.0);
      expect(result.smite).toBe(0);
    });

    it('returns unchanged cooldowns when all at 0', () => {
      const result = updateCooldowns({ smite: 0 }, 1.0);
      expect(result.smite).toBe(0);
    });
  });
});
