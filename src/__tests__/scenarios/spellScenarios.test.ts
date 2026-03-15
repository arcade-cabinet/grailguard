/**
 * @module spellScenarios.test
 *
 * Comprehensive scenario tests for all 7 spells: damage, AoE, healing,
 * faith costs, cooldowns, and status effects. Also tests cooldown management
 * and eligibility checks.
 */

import type { SpellTarget } from '../../engine/systems/spellSystem';
import {
  canCastSpell,
  computeSpellEffect,
  updateCooldowns,
} from '../../engine/systems/spellSystem';

/* ------------------------------------------------------------------ */
/*  Test helpers                                                      */
/* ------------------------------------------------------------------ */

const sanctuaryPos = { x: 0, z: 0 };

function makeEnemy(id: number, x: number, z: number, hp = 100): SpellTarget {
  return { id, team: 'enemy', x, z, hp, maxHp: hp, type: 'goblin' };
}

function makeAlly(id: number, x: number, z: number, hp = 100, maxHp = 100): SpellTarget {
  return { id, team: 'ally', x, z, hp, maxHp, type: 'militia' };
}

function makeWall(id: number, x: number, z: number, hp = 600): SpellTarget {
  return { id, team: 'ally', x, z, hp, maxHp: hp, type: 'wall' };
}

/* ------------------------------------------------------------------ */
/*  Smite                                                             */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Smite', () => {
  it('deals 300 damage to up to 3 targets', () => {
    const enemies = [
      makeEnemy(1, 5, 0),
      makeEnemy(2, 10, 0),
      makeEnemy(3, 15, 0),
      makeEnemy(4, 20, 0),
    ];
    const result = computeSpellEffect('smite', enemies, [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(3);
    for (const dt of result.damageTargets) {
      expect(dt.damage).toBe(300);
    }
  });

  it('targets enemies closest to sanctuary first', () => {
    const enemies = [
      makeEnemy(1, 20, 0), // farthest
      makeEnemy(2, 5, 0), // closest
      makeEnemy(3, 10, 0), // middle
    ];
    const result = computeSpellEffect('smite', enemies, [], sanctuaryPos);
    expect(result.damageTargets[0].id).toBe(2);
    expect(result.damageTargets[1].id).toBe(3);
    expect(result.damageTargets[2].id).toBe(1);
  });

  it('works with fewer than 3 enemies', () => {
    const enemies = [makeEnemy(1, 5, 0)];
    const result = computeSpellEffect('smite', enemies, [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(1);
    expect(result.damageTargets[0].damage).toBe(300);
  });

  it('does nothing with no enemies', () => {
    const result = computeSpellEffect('smite', [], [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(0);
  });

  it('costs 25 faith', () => {
    const result = computeSpellEffect('smite', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.faithCost).toBe(25);
  });

  it('has 15 second cooldown', () => {
    const result = computeSpellEffect('smite', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.cooldown).toBe(15);
  });

  it('triggers camera shake of 4', () => {
    const result = computeSpellEffect('smite', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.cameraShake).toBe(4);
  });

  it('sets primaryTargetId', () => {
    const result = computeSpellEffect('smite', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.primaryTargetId).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Holy Nova                                                         */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Holy Nova', () => {
  it('heals all non-wall allies for 50 HP', () => {
    const allies = [
      makeAlly(1, 5, 0, 50, 100),
      makeAlly(2, 10, 0, 30, 100),
      makeAlly(3, 15, 0, 80, 100),
    ];
    const result = computeSpellEffect('holy_nova', [], allies, sanctuaryPos);
    expect(result.healTargets).toHaveLength(3);
    for (const ht of result.healTargets) {
      expect(ht.heal).toBe(50);
    }
  });

  it('does not heal walls', () => {
    const allies = [makeWall(1, 5, 0, 300), makeAlly(2, 10, 0, 50, 100)];
    const result = computeSpellEffect('holy_nova', [], allies, sanctuaryPos);
    expect(result.healTargets).toHaveLength(1);
    expect(result.healTargets[0].id).toBe(2);
  });

  it('costs 25 faith', () => {
    const result = computeSpellEffect('holy_nova', [], [makeAlly(1, 5, 0)], sanctuaryPos);
    expect(result.faithCost).toBe(25);
  });

  it('has 20 second cooldown', () => {
    const result = computeSpellEffect('holy_nova', [], [makeAlly(1, 5, 0)], sanctuaryPos);
    expect(result.cooldown).toBe(20);
  });

  it('works with no allies', () => {
    const result = computeSpellEffect('holy_nova', [], [], sanctuaryPos);
    expect(result.healTargets).toHaveLength(0);
  });

  it('no camera shake', () => {
    const result = computeSpellEffect('holy_nova', [], [makeAlly(1, 5, 0)], sanctuaryPos);
    expect(result.cameraShake).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Zealous Haste                                                     */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Zealous Haste', () => {
  it('resets cooldowns for all allies', () => {
    const allies = [makeAlly(1, 5, 0), makeAlly(2, 10, 0), makeAlly(3, 15, 0)];
    const result = computeSpellEffect('zealous_haste', [], allies, sanctuaryPos);
    expect(result.resetCooldownTargets).toHaveLength(3);
    expect(result.resetCooldownTargets.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('costs 25 faith', () => {
    const result = computeSpellEffect('zealous_haste', [], [], sanctuaryPos);
    expect(result.faithCost).toBe(25);
  });

  it('has 30 second cooldown', () => {
    const result = computeSpellEffect('zealous_haste', [], [], sanctuaryPos);
    expect(result.cooldown).toBe(30);
  });

  it('works with no allies (empty reset targets)', () => {
    const result = computeSpellEffect('zealous_haste', [], [], sanctuaryPos);
    expect(result.resetCooldownTargets).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Earthquake                                                        */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Earthquake', () => {
  it('deals 20 damage to all enemies', () => {
    const enemies = [makeEnemy(1, 5, 0), makeEnemy(2, 10, 0)];
    const result = computeSpellEffect('earthquake', enemies, [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(2);
    for (const dt of result.damageTargets) {
      expect(dt.damage).toBe(20);
    }
  });

  it('stuns all enemies for 3 seconds', () => {
    const enemies = [makeEnemy(1, 5, 0), makeEnemy(2, 10, 0)];
    const result = computeSpellEffect('earthquake', enemies, [], sanctuaryPos);
    expect(result.stunTargets).toHaveLength(2);
    for (const st of result.stunTargets) {
      expect(st.stunDuration).toBe(3);
    }
  });

  it('costs 25 faith', () => {
    const result = computeSpellEffect('earthquake', [], [], sanctuaryPos);
    expect(result.faithCost).toBe(25);
  });

  it('has 25 second cooldown', () => {
    const result = computeSpellEffect('earthquake', [], [], sanctuaryPos);
    expect(result.cooldown).toBe(25);
  });

  it('triggers camera shake of 8', () => {
    const enemies = [makeEnemy(1, 5, 0)];
    const result = computeSpellEffect('earthquake', enemies, [], sanctuaryPos);
    expect(result.cameraShake).toBe(8);
  });

  it('works with no enemies', () => {
    const result = computeSpellEffect('earthquake', [], [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(0);
    expect(result.stunTargets).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Chrono Shift                                                      */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Chrono Shift', () => {
  it('freezes all enemies for 4 seconds', () => {
    const enemies = [makeEnemy(1, 5, 0), makeEnemy(2, 10, 0), makeEnemy(3, 15, 0)];
    const result = computeSpellEffect('chrono_shift', enemies, [], sanctuaryPos);
    expect(result.freezeTargets).toHaveLength(3);
    for (const ft of result.freezeTargets) {
      expect(ft.freezeDuration).toBe(4);
    }
  });

  it('costs 50 faith (most expensive)', () => {
    const result = computeSpellEffect('chrono_shift', [], [], sanctuaryPos);
    expect(result.faithCost).toBe(50);
  });

  it('has 30 second cooldown', () => {
    const result = computeSpellEffect('chrono_shift', [], [], sanctuaryPos);
    expect(result.cooldown).toBe(30);
  });

  it('does not deal damage', () => {
    const enemies = [makeEnemy(1, 5, 0)];
    const result = computeSpellEffect('chrono_shift', enemies, [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(0);
  });

  it('works with no enemies', () => {
    const result = computeSpellEffect('chrono_shift', [], [], sanctuaryPos);
    expect(result.freezeTargets).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Meteor Strike                                                     */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Meteor Strike', () => {
  it('deals 400 damage in AoE (radius 10)', () => {
    const primary = makeEnemy(1, 5, 0);
    const inRange = makeEnemy(2, 10, 0); // distance 5 from primary, < 10
    const outRange = makeEnemy(3, 20, 0); // distance 15 from primary, >= 10
    const result = computeSpellEffect(
      'meteor_strike',
      [primary, inRange, outRange],
      [],
      sanctuaryPos,
    );
    // Primary and inRange are within 10 of primary
    expect(result.damageTargets.length).toBeGreaterThanOrEqual(2);
    for (const dt of result.damageTargets) {
      expect(dt.damage).toBe(400);
    }
    // outRange should NOT be in damage targets (distance 15 from primary)
    expect(result.damageTargets.find((dt) => dt.id === 3)).toBeUndefined();
  });

  it('targets enemy closest to sanctuary as primary', () => {
    const enemies = [
      makeEnemy(1, 20, 0),
      makeEnemy(2, 3, 0), // closest to (0,0)
      makeEnemy(3, 10, 0),
    ];
    const result = computeSpellEffect('meteor_strike', enemies, [], sanctuaryPos);
    expect(result.primaryTargetId).toBe(2);
  });

  it('costs 35 faith', () => {
    const result = computeSpellEffect('meteor_strike', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.faithCost).toBe(35);
  });

  it('has 25 second cooldown', () => {
    const result = computeSpellEffect('meteor_strike', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.cooldown).toBe(25);
  });

  it('triggers camera shake of 8', () => {
    const result = computeSpellEffect('meteor_strike', [makeEnemy(1, 5, 0)], [], sanctuaryPos);
    expect(result.cameraShake).toBe(8);
  });

  it('does nothing with no enemies', () => {
    const result = computeSpellEffect('meteor_strike', [], [], sanctuaryPos);
    expect(result.damageTargets).toHaveLength(0);
    expect(result.primaryTargetId).toBeUndefined();
  });

  it('enemies at edge of AoE radius are excluded (distance >= 10)', () => {
    const primary = makeEnemy(1, 0, 0);
    const atEdge = makeEnemy(2, 10, 0); // distance exactly 10 from primary
    const result = computeSpellEffect('meteor_strike', [primary, atEdge], [], sanctuaryPos);
    // distance2D < aoeRadius (strict less), so 10 is excluded
    expect(result.damageTargets.find((dt) => dt.id === 2)).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Divine Shield                                                     */
/* ------------------------------------------------------------------ */

describe('spell scenarios: Divine Shield', () => {
  it('grants invulnerability to all allies for 5 seconds', () => {
    const allies = [makeAlly(1, 5, 0), makeAlly(2, 10, 0)];
    const result = computeSpellEffect('divine_shield', [], allies, sanctuaryPos);
    expect(result.shieldTargets).toHaveLength(2);
    for (const st of result.shieldTargets) {
      expect(st.duration).toBe(5);
    }
  });

  it('costs 40 faith', () => {
    const result = computeSpellEffect('divine_shield', [], [], sanctuaryPos);
    expect(result.faithCost).toBe(40);
  });

  it('has 30 second cooldown', () => {
    const result = computeSpellEffect('divine_shield', [], [], sanctuaryPos);
    expect(result.cooldown).toBe(30);
  });

  it('does not deal damage', () => {
    const result = computeSpellEffect(
      'divine_shield',
      [makeEnemy(1, 5, 0)],
      [makeAlly(2, 5, 0)],
      sanctuaryPos,
    );
    expect(result.damageTargets).toHaveLength(0);
  });

  it('works with no allies', () => {
    const result = computeSpellEffect('divine_shield', [], [], sanctuaryPos);
    expect(result.shieldTargets).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Faith cost deduction                                              */
/* ------------------------------------------------------------------ */

describe('spell scenarios: faith cost', () => {
  it('all spells have correct faith costs', () => {
    const costs: Record<string, number> = {
      smite: 25,
      holy_nova: 25,
      zealous_haste: 25,
      earthquake: 25,
      chrono_shift: 50,
      meteor_strike: 35,
      divine_shield: 40,
    };

    for (const [spell, expectedCost] of Object.entries(costs)) {
      const result = computeSpellEffect(
        spell,
        [makeEnemy(1, 5, 0)],
        [makeAlly(2, 5, 0)],
        sanctuaryPos,
      );
      expect(result.faithCost).toBe(expectedCost);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Cooldown enforcement                                              */
/* ------------------------------------------------------------------ */

describe('spell scenarios: cooldown enforcement', () => {
  it('cannot cast spell on cooldown', () => {
    expect(canCastSpell('smite', 100, { smite: 5 }, false)).toBe(false);
  });

  it('can cast spell when cooldown is 0', () => {
    expect(canCastSpell('smite', 100, { smite: 0 }, false)).toBe(true);
  });

  it('can cast spell when not in cooldown map', () => {
    expect(canCastSpell('smite', 100, {}, false)).toBe(true);
  });

  it('cannot cast with insufficient faith', () => {
    expect(canCastSpell('smite', 24, {}, false)).toBe(false); // needs 25
  });

  it('can cast with exact faith amount', () => {
    expect(canCastSpell('smite', 25, {}, false)).toBe(true);
  });

  it('cannot cast during game over', () => {
    expect(canCastSpell('smite', 100, {}, true)).toBe(false);
  });

  it('cannot cast unknown spell', () => {
    expect(canCastSpell('nonexistent', 100, {}, false)).toBe(false);
  });

  it('chrono_shift requires 50 faith', () => {
    expect(canCastSpell('chrono_shift', 49, {}, false)).toBe(false);
    expect(canCastSpell('chrono_shift', 50, {}, false)).toBe(true);
  });

  it('meteor_strike requires 35 faith', () => {
    expect(canCastSpell('meteor_strike', 34, {}, false)).toBe(false);
    expect(canCastSpell('meteor_strike', 35, {}, false)).toBe(true);
  });

  it('divine_shield requires 40 faith', () => {
    expect(canCastSpell('divine_shield', 39, {}, false)).toBe(false);
    expect(canCastSpell('divine_shield', 40, {}, false)).toBe(true);
  });

  it('independent cooldowns per spell', () => {
    const cooldowns = { smite: 5, holy_nova: 0 };
    expect(canCastSpell('smite', 100, cooldowns, false)).toBe(false);
    expect(canCastSpell('holy_nova', 100, cooldowns, false)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Cooldown decay                                                    */
/* ------------------------------------------------------------------ */

describe('spell scenarios: cooldown decay', () => {
  it('decrements cooldowns by dt', () => {
    const cooldowns = { smite: 10, holy_nova: 5 };
    const updated = updateCooldowns(cooldowns, 3);
    expect(updated.smite).toBe(7);
    expect(updated.holy_nova).toBe(2);
  });

  it('clamps at 0', () => {
    const cooldowns = { smite: 2 };
    const updated = updateCooldowns(cooldowns, 5);
    expect(updated.smite).toBe(0);
  });

  it('handles zero dt', () => {
    const cooldowns = { smite: 10 };
    const updated = updateCooldowns(cooldowns, 0);
    expect(updated.smite).toBe(10);
  });

  it('handles empty cooldown map', () => {
    const updated = updateCooldowns({}, 5);
    expect(Object.keys(updated)).toHaveLength(0);
  });

  it('returns a new object (no mutation)', () => {
    const cooldowns = { smite: 10 };
    const updated = updateCooldowns(cooldowns, 3);
    expect(cooldowns.smite).toBe(10); // original unchanged
    expect(updated.smite).toBe(7);
  });

  it('all spells decay independently', () => {
    const cooldowns = {
      smite: 15,
      holy_nova: 20,
      zealous_haste: 30,
      earthquake: 25,
      chrono_shift: 30,
      meteor_strike: 25,
      divine_shield: 30,
    };
    const updated = updateCooldowns(cooldowns, 10);
    expect(updated.smite).toBe(5);
    expect(updated.holy_nova).toBe(10);
    expect(updated.zealous_haste).toBe(20);
    expect(updated.earthquake).toBe(15);
    expect(updated.chrono_shift).toBe(20);
    expect(updated.meteor_strike).toBe(15);
    expect(updated.divine_shield).toBe(20);
  });
});

/* ------------------------------------------------------------------ */
/*  All spells have correct cooldowns                                 */
/* ------------------------------------------------------------------ */

describe('spell scenarios: all spell cooldowns', () => {
  it('all 7 spells report their configured cooldowns', () => {
    const expectedCooldowns: Record<string, number> = {
      smite: 15,
      holy_nova: 20,
      zealous_haste: 30,
      earthquake: 25,
      chrono_shift: 30,
      meteor_strike: 25,
      divine_shield: 30,
    };

    for (const [spell, expectedCd] of Object.entries(expectedCooldowns)) {
      const result = computeSpellEffect(
        spell,
        [makeEnemy(1, 5, 0)],
        [makeAlly(2, 5, 0)],
        sanctuaryPos,
      );
      expect(result.cooldown).toBe(expectedCd);
    }
  });
});
