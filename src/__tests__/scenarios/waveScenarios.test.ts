/**
 * @module waveScenarios.test
 *
 * Comprehensive scenario tests for wave pacing, enemy progression, boss variants,
 * budget scaling, build timers, wave labels, and difficulty modifiers.
 */

import { UNITS } from '../../engine/constants';
import { createRng } from '../../engine/systems/rng';
import {
  type DifficultyTier,
  allocateWaveBudget,
  applyDifficultyModifiers,
  buildWaveQueue,
  calculateBuildTimer,
  calculateWaveBudget,
  calculateWaveCompletionReward,
  getBossVariant,
  getWaveLabel,
  isWaveComplete,
} from '../../engine/systems/waveSystem';

/* ------------------------------------------------------------------ */
/*  Enemy progression unlock                                          */
/* ------------------------------------------------------------------ */

describe('wave scenarios: enemy progression unlock', () => {
  it('wave 1 only spawns goblins', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(`w1-goblin-only-${seed}`);
      const queue = allocateWaveBudget(1, 200, rng);
      for (const entry of queue) {
        expect(entry.type).toBe('goblin');
      }
    }
  });

  it('wave 2 only spawns goblins (orcs not yet unlocked)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(`w2-no-orc-${seed}`);
      const queue = allocateWaveBudget(2, 300, rng);
      for (const entry of queue) {
        expect(entry.type).toBe('goblin');
      }
    }
  });

  it('wave 3 unlocks orcs (first orc can appear)', () => {
    let foundOrc = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(`w3-orc-${seed}`);
      const queue = allocateWaveBudget(3, 500, rng);
      if (queue.some((e) => e.type === 'orc')) {
        foundOrc = true;
        break;
      }
    }
    expect(foundOrc).toBe(true);
  });

  it('wave 3 queue contains only goblins and orcs', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(`w3-types-${seed}`);
      const queue = allocateWaveBudget(3, 500, rng);
      for (const entry of queue) {
        expect(['goblin', 'orc']).toContain(entry.type);
      }
    }
  });

  it('wave 5 is a boss wave (boss in queue)', () => {
    const rng = createRng('w5-boss');
    const queue = buildWaveQueue(5, rng);
    expect(queue.some((e) => e.type === 'boss')).toBe(true);
  });

  it('wave 5 budget deducts boss cost from remaining', () => {
    const rng = createRng('w5-boss-budget');
    const queue = buildWaveQueue(5, rng);
    const bossCost = UNITS.boss.cost ?? 0;
    const totalBudget = calculateWaveBudget(5);
    const remainingCost = queue
      .filter((e) => e.type !== 'boss')
      .reduce((sum, e) => sum + (UNITS[e.type].cost ?? 0), 0);
    // Boss cost + remaining should not exceed total budget
    expect(bossCost + remainingCost).toBeLessThanOrEqual(totalBudget);
  });

  it('wave 5 queue has no trolls (unlockWave=6)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(`w5-no-troll-${seed}`);
      const queue = buildWaveQueue(5, rng);
      const nonBoss = queue.filter((e) => e.type !== 'boss');
      for (const entry of nonBoss) {
        expect(entry.type).not.toBe('troll');
      }
    }
  });

  it('wave 6 unlocks trolls', () => {
    let foundTroll = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(`w6-troll-${seed}`);
      const queue = allocateWaveBudget(6, 800, rng);
      if (queue.some((e) => e.type === 'troll')) {
        foundTroll = true;
        break;
      }
    }
    expect(foundTroll).toBe(true);
  });

  it('wave 6 can assign affixes (20% chance starts here)', () => {
    let foundAffix = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(`w6-affix-${seed}`);
      const queue = allocateWaveBudget(6, 800, rng);
      if (queue.some((e) => e.affix !== undefined)) {
        foundAffix = true;
        break;
      }
    }
    expect(foundAffix).toBe(true);
  });

  it('wave 5 has no affixes (affixStartWave=6)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(`w5-no-affix-${seed}`);
      const queue = allocateWaveBudget(5, 500, rng);
      for (const entry of queue) {
        expect(entry.affix).toBeUndefined();
      }
    }
  });

  it('wave 8 unlocks flying enemies', () => {
    let foundFlying = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(`w8-fly-${seed}`);
      const queue = allocateWaveBudget(8, 1000, rng);
      if (queue.some((e) => e.type === 'flying')) {
        foundFlying = true;
        break;
      }
    }
    expect(foundFlying).toBe(true);
  });

  it('wave 7 has no flying enemies', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(`w7-no-fly-${seed}`);
      const queue = allocateWaveBudget(7, 1000, rng);
      expect(queue.some((e) => e.type === 'flying')).toBe(false);
    }
  });

  it('wave 10 unlocks shieldBearers', () => {
    let foundSB = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(`w10-sb-${seed}`);
      const queue = allocateWaveBudget(10, 2000, rng);
      if (queue.some((e) => e.type === 'shieldBearer')) {
        foundSB = true;
        break;
      }
    }
    expect(foundSB).toBe(true);
  });

  it('wave 9 has no shieldBearers', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(`w9-no-sb-${seed}`);
      const queue = allocateWaveBudget(9, 2000, rng);
      expect(queue.some((e) => e.type === 'shieldBearer')).toBe(false);
    }
  });

  it('wave 12 unlocks summoners', () => {
    let foundSummoner = false;
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(`w12-sum-${seed}`);
      const queue = allocateWaveBudget(12, 3000, rng);
      if (queue.some((e) => e.type === 'summoner')) {
        foundSummoner = true;
        break;
      }
    }
    expect(foundSummoner).toBe(true);
  });

  it('wave 11 has no summoners', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(`w11-no-sum-${seed}`);
      const queue = allocateWaveBudget(11, 3000, rng);
      expect(queue.some((e) => e.type === 'summoner')).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Boss variants                                                     */
/* ------------------------------------------------------------------ */

describe('wave scenarios: boss variants', () => {
  it('wave 5 boss variant is warlord', () => {
    const variant = getBossVariant(5);
    expect(variant).toBeDefined();
    expect(variant!.id).toBe('warlord');
    expect(variant!.ability).toBe('aoe_slam');
  });

  it('wave 10 boss variant is necromancer', () => {
    const variant = getBossVariant(10);
    expect(variant).toBeDefined();
    expect(variant!.id).toBe('necromancer');
    expect(variant!.ability).toBe('summon_on_death');
  });

  it('wave 15 boss variant is dragon', () => {
    const variant = getBossVariant(15);
    expect(variant).toBeDefined();
    expect(variant!.id).toBe('dragon');
    expect(variant!.ability).toBe('fire_breath');
  });

  it('wave 20 boss variant is siegeEngine', () => {
    const variant = getBossVariant(20);
    expect(variant).toBeDefined();
    expect(variant!.id).toBe('siegeEngine');
    expect(variant!.ability).toBe('building_target');
  });

  it('non-boss waves return undefined', () => {
    expect(getBossVariant(1)).toBeUndefined();
    expect(getBossVariant(3)).toBeUndefined();
    expect(getBossVariant(7)).toBeUndefined();
    expect(getBossVariant(12)).toBeUndefined();
  });

  it('wave 10 uses highest-unlocked variant (necromancer, not warlord)', () => {
    const variant = getBossVariant(10);
    expect(variant!.id).toBe('necromancer');
    expect(variant!.wave).toBe(10);
  });
});

/* ------------------------------------------------------------------ */
/*  Budget scales polynomially                                        */
/* ------------------------------------------------------------------ */

describe('wave scenarios: budget scaling', () => {
  // Formula: floor(50 * 1.15^W + 2 * W^2)
  const expectedBudgets: Record<number, number> = {};
  for (const w of [1, 5, 10, 15, 20]) {
    expectedBudgets[w] = Math.floor(50 * 1.15 ** w + 2 * w * w);
  }

  it('wave 1 budget matches formula', () => {
    expect(calculateWaveBudget(1)).toBe(expectedBudgets[1]);
  });

  it('wave 5 budget matches formula', () => {
    expect(calculateWaveBudget(5)).toBe(expectedBudgets[5]);
  });

  it('wave 10 budget matches formula', () => {
    expect(calculateWaveBudget(10)).toBe(expectedBudgets[10]);
  });

  it('wave 15 budget matches formula', () => {
    expect(calculateWaveBudget(15)).toBe(expectedBudgets[15]);
  });

  it('wave 20 budget matches formula', () => {
    expect(calculateWaveBudget(20)).toBe(expectedBudgets[20]);
  });

  it('budget monotonically increases from wave 1 to 20', () => {
    let prevBudget = 0;
    for (let w = 1; w <= 20; w++) {
      const budget = calculateWaveBudget(w);
      expect(budget).toBeGreaterThan(prevBudget);
      prevBudget = budget;
    }
  });

  it('budget growth is polynomial (quadratic term dominates at high waves)', () => {
    const b10 = calculateWaveBudget(10);
    const b20 = calculateWaveBudget(20);
    // Quadratic: 2*20^2 = 800 vs 2*10^2 = 200; ratio > 3x
    expect(b20 / b10).toBeGreaterThan(2.5);
  });
});

/* ------------------------------------------------------------------ */
/*  Build timer scales logarithmically                                */
/* ------------------------------------------------------------------ */

describe('wave scenarios: build timer scaling', () => {
  // Formula: floor(30 + 10 * ln(W))
  it('wave 1 timer matches formula', () => {
    expect(calculateBuildTimer(1)).toBe(Math.floor(30 + 10 * Math.log(1)));
    // ln(1)=0 => 30
    expect(calculateBuildTimer(1)).toBe(30);
  });

  it('wave 5 timer matches formula', () => {
    expect(calculateBuildTimer(5)).toBe(Math.floor(30 + 10 * Math.log(5)));
  });

  it('wave 10 timer matches formula', () => {
    expect(calculateBuildTimer(10)).toBe(Math.floor(30 + 10 * Math.log(10)));
  });

  it('wave 20 timer matches formula', () => {
    expect(calculateBuildTimer(20)).toBe(Math.floor(30 + 10 * Math.log(20)));
  });

  it('timer grows slower than linear (logarithmic)', () => {
    const t5 = calculateBuildTimer(5);
    const t10 = calculateBuildTimer(10);
    const t20 = calculateBuildTimer(20);
    // Doubling wave number does not double the timer
    expect(t10 - t5).toBeLessThan(t5 - 30);
    expect(t20 - t10).toBeLessThan(t10 - 30);
  });

  it('timer is always at least 30 seconds', () => {
    for (let w = 1; w <= 20; w++) {
      expect(calculateBuildTimer(w)).toBeGreaterThanOrEqual(30);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Wave labels                                                       */
/* ------------------------------------------------------------------ */

describe('wave scenarios: wave labels', () => {
  it('budget <100 is "Scout Party"', () => {
    expect(getWaveLabel(1)).toBe('Scout Party');
    expect(getWaveLabel(50)).toBe('Scout Party');
    expect(getWaveLabel(99)).toBe('Scout Party');
  });

  it('budget =100 is "Scout Party"', () => {
    expect(getWaveLabel(100)).toBe('Scout Party');
  });

  it('budget 101-300 is "Raiding Force"', () => {
    expect(getWaveLabel(101)).toBe('Raiding Force');
    expect(getWaveLabel(200)).toBe('Raiding Force');
    expect(getWaveLabel(300)).toBe('Raiding Force');
  });

  it('budget >300 is "War Host"', () => {
    expect(getWaveLabel(301)).toBe('War Host');
    expect(getWaveLabel(500)).toBe('War Host');
    expect(getWaveLabel(10000)).toBe('War Host');
  });

  it('label transitions at exact boundaries', () => {
    expect(getWaveLabel(100)).toBe('Scout Party');
    expect(getWaveLabel(101)).toBe('Raiding Force');
    expect(getWaveLabel(300)).toBe('Raiding Force');
    expect(getWaveLabel(301)).toBe('War Host');
  });

  it('early waves have small labels, late waves have large labels', () => {
    const earlyBudget = calculateWaveBudget(1);
    const midBudget = calculateWaveBudget(8);
    const lateBudget = calculateWaveBudget(15);

    // Early wave should be Scout Party
    expect(getWaveLabel(earlyBudget)).toBe('Scout Party');
    // Late waves should be larger
    expect(lateBudget).toBeGreaterThan(300);
    expect(getWaveLabel(lateBudget)).toBe('War Host');
  });
});

/* ------------------------------------------------------------------ */
/*  Difficulty modifiers                                              */
/* ------------------------------------------------------------------ */

describe('wave scenarios: difficulty modifiers', () => {
  const baseStats = { hp: 100, damage: 50, speed: 5 };

  it('pilgrim: 0.8x enemy stats', () => {
    const result = applyDifficultyModifiers(baseStats, 'pilgrim');
    expect(result.hp).toBe(80);
    expect(result.damage).toBe(40);
    expect(result.speed).toBeCloseTo(4.0);
  });

  it('crusader: 1.0x enemy stats (unchanged)', () => {
    const result = applyDifficultyModifiers(baseStats, 'crusader');
    expect(result.hp).toBe(100);
    expect(result.damage).toBe(50);
    expect(result.speed).toBe(5);
  });

  it('inquisitor: 1.3x enemy stats', () => {
    const result = applyDifficultyModifiers(baseStats, 'inquisitor');
    expect(result.hp).toBe(130);
    expect(result.damage).toBe(65);
    expect(result.speed).toBeCloseTo(6.5);
  });

  it('pilgrim applied to goblin base stats', () => {
    const goblinStats = { hp: UNITS.goblin.hp, damage: UNITS.goblin.damage, speed: UNITS.goblin.speed };
    const result = applyDifficultyModifiers(goblinStats, 'pilgrim');
    expect(result.hp).toBe(Math.floor(UNITS.goblin.hp * 0.8));
    expect(result.damage).toBe(Math.floor(UNITS.goblin.damage * 0.8));
    expect(result.speed).toBeCloseTo(UNITS.goblin.speed * 0.8);
  });

  it('inquisitor applied to boss base stats', () => {
    const bossStats = { hp: UNITS.boss.hp, damage: UNITS.boss.damage, speed: UNITS.boss.speed };
    const result = applyDifficultyModifiers(bossStats, 'inquisitor');
    expect(result.hp).toBe(Math.floor(UNITS.boss.hp * 1.3));
    expect(result.damage).toBe(Math.floor(UNITS.boss.damage * 1.3));
    expect(result.speed).toBeCloseTo(UNITS.boss.speed * 1.3);
  });

  it('does not mutate input', () => {
    const stats = { hp: 100, damage: 50, speed: 5 };
    applyDifficultyModifiers(stats, 'inquisitor');
    expect(stats).toEqual({ hp: 100, damage: 50, speed: 5 });
  });

  it('all three tiers produce distinct outputs for same input', () => {
    const tiers: DifficultyTier[] = ['pilgrim', 'crusader', 'inquisitor'];
    const results = tiers.map((t) => applyDifficultyModifiers(baseStats, t));
    // Each should differ
    expect(results[0].hp).not.toBe(results[1].hp);
    expect(results[1].hp).not.toBe(results[2].hp);
    expect(results[0].hp).not.toBe(results[2].hp);
  });

  it('floors fractional HP and damage but not speed', () => {
    const odd = { hp: 33, damage: 7, speed: 3 };
    const result = applyDifficultyModifiers(odd, 'inquisitor');
    expect(result.hp).toBe(Math.floor(33 * 1.3)); // 42
    expect(result.damage).toBe(Math.floor(7 * 1.3)); // 9
    expect(result.speed).toBeCloseTo(3 * 1.3); // 3.9 exact
    expect(Number.isInteger(result.hp)).toBe(true);
    expect(Number.isInteger(result.damage)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Wave completion rewards                                           */
/* ------------------------------------------------------------------ */

describe('wave scenarios: completion rewards', () => {
  it('wave 1 reward = 50 + 10*1 = 60', () => {
    const { goldReward, interest } = calculateWaveCompletionReward(1, 0, false);
    expect(goldReward).toBe(60);
    expect(interest).toBe(0);
  });

  it('wave 10 reward = 50 + 10*10 = 150', () => {
    const { goldReward } = calculateWaveCompletionReward(10, 0, false);
    expect(goldReward).toBe(150);
  });

  it('wave 20 reward = 50 + 10*20 = 250', () => {
    const { goldReward } = calculateWaveCompletionReward(20, 0, false);
    expect(goldReward).toBe(250);
  });

  it('golden_age gives 5% interest on current gold', () => {
    const { interest } = calculateWaveCompletionReward(5, 1000, true);
    expect(interest).toBe(50); // floor(1000 * 0.05)
  });

  it('no interest without golden_age relic', () => {
    const { interest } = calculateWaveCompletionReward(5, 1000, false);
    expect(interest).toBe(0);
  });

  it('interest floors fractional amounts', () => {
    const { interest } = calculateWaveCompletionReward(5, 33, true);
    expect(interest).toBe(Math.floor(33 * 0.05)); // 1
  });
});

/* ------------------------------------------------------------------ */
/*  Wave completion detection                                         */
/* ------------------------------------------------------------------ */

describe('wave scenarios: wave completion', () => {
  it('complete when queue empty and no enemies alive', () => {
    expect(isWaveComplete(0, false)).toBe(true);
  });

  it('not complete with remaining queue', () => {
    expect(isWaveComplete(5, false)).toBe(false);
  });

  it('not complete with enemies still alive', () => {
    expect(isWaveComplete(0, true)).toBe(false);
  });

  it('not complete with both queue and enemies', () => {
    expect(isWaveComplete(3, true)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Deterministic wave generation                                     */
/* ------------------------------------------------------------------ */

describe('wave scenarios: determinism', () => {
  it('same seed produces identical queues across runs', () => {
    for (let w = 1; w <= 20; w++) {
      const rng1 = createRng(`det-${w}`);
      const rng2 = createRng(`det-${w}`);
      const q1 = buildWaveQueue(w, rng1);
      const q2 = buildWaveQueue(w, rng2);
      expect(q1).toEqual(q2);
    }
  });

  it('different seeds produce different queues for same wave', () => {
    const rng1 = createRng('seed-alpha');
    const rng2 = createRng('seed-beta');
    const q1 = buildWaveQueue(10, rng1);
    const q2 = buildWaveQueue(10, rng2);
    // Extremely unlikely to be identical with different seeds
    const q1Types = q1.map((e) => e.type).join(',');
    const q2Types = q2.map((e) => e.type).join(',');
    // At least the composition or affixes should differ
    expect(q1Types !== q2Types || JSON.stringify(q1) !== JSON.stringify(q2)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Budget allocation completeness                                    */
/* ------------------------------------------------------------------ */

describe('wave scenarios: budget allocation', () => {
  it('budget is fully spent (remainder < cheapest unit cost)', () => {
    for (let w = 1; w <= 20; w++) {
      const rng = createRng(`alloc-${w}`);
      const budget = calculateWaveBudget(w);
      const queue = buildWaveQueue(w, rng);
      const totalSpent = queue.reduce((sum, e) => sum + (UNITS[e.type].cost ?? 0), 0);
      expect(totalSpent).toBeLessThanOrEqual(budget);
      // Remainder should be less than the cheapest possible unit (goblin=5)
      expect(budget - totalSpent).toBeLessThan(5);
    }
  });

  it('boss wave still fills remaining budget after boss allocation', () => {
    const rng = createRng('boss-fill');
    const queue = buildWaveQueue(10, rng);
    const nonBoss = queue.filter((e) => e.type !== 'boss');
    expect(nonBoss.length).toBeGreaterThan(0);
  });
});
