/**
 * @module combatSystem.test
 *
 * TDD tests for pure combat functions: target finding, damage calculation,
 * status effect processing, and boss AoE logic.
 */

import type { CombatEntity, CombatUnit } from '../../../engine/systems/combatSystem';
import {
  calculateDamage,
  findCombatTargetPure,
  processBossAoe,
  processStatusEffects,
  rollDrop,
  selectSiegeTarget,
} from '../../../engine/systems/combatSystem';
import { createRng } from '../../../engine/systems/rng';

function makeEntity(overrides: Partial<CombatUnit> & { x?: number; z?: number }): CombatEntity {
  return {
    id: overrides.id ?? Math.floor(Math.random() * 10000),
    x: overrides.x ?? 0,
    z: overrides.z ?? 0,
    unit: {
      id: overrides.id ?? 0,
      type: overrides.type ?? 'militia',
      team: overrides.team ?? 'ally',
      hp: overrides.hp ?? 100,
      maxHp: overrides.maxHp ?? 100,
      damage: overrides.damage ?? 10,
      speed: overrides.speed ?? 5,
      range: overrides.range ?? 2,
      atkSpd: overrides.atkSpd ?? 1,
      isRanged: overrides.isRanged ?? false,
      isHealer: overrides.isHealer ?? false,
      affix: overrides.affix,
      poison: overrides.poison ?? 0,
      frozen: overrides.frozen ?? 0,
      invulnerable: overrides.invulnerable ?? 0,
      slowed: overrides.slowed ?? 0,
      cooldown: overrides.cooldown ?? 0,
      pathIndex: overrides.pathIndex ?? 0,
      timeAlive: overrides.timeAlive ?? 0,
    },
  };
}

describe('combatSystem', () => {
  describe('findCombatTargetPure', () => {
    it('returns undefined when no enemies in range', () => {
      const attacker = makeEntity({ team: 'ally', x: 0, z: 0 });
      const candidates = [
        makeEntity({ team: 'enemy', x: 100, z: 100 }), // too far
      ];
      const result = findCombatTargetPure(attacker, candidates);
      expect(result).toBeUndefined();
    });

    it('finds nearest enemy for melee ally', () => {
      const attacker = makeEntity({ team: 'ally', x: 0, z: 0, range: 5 });
      const near = makeEntity({ id: 1, team: 'enemy', x: 3, z: 0, hp: 50 });
      const far = makeEntity({ id: 2, team: 'enemy', x: 7, z: 0, hp: 50 });
      const result = findCombatTargetPure(attacker, [near, far]);
      expect(result?.id).toBe(1);
    });

    it('healer targets injured ally', () => {
      const healer = makeEntity({
        team: 'ally',
        x: 0,
        z: 0,
        isHealer: true,
        range: 12,
      });
      const injured = makeEntity({
        id: 1,
        team: 'ally',
        x: 5,
        z: 0,
        hp: 20,
        maxHp: 100,
      });
      const healthy = makeEntity({
        id: 2,
        team: 'ally',
        x: 4,
        z: 0,
        hp: 100,
        maxHp: 100,
      });
      const result = findCombatTargetPure(healer, [injured, healthy]);
      expect(result?.id).toBe(1);
    });

    it('healer ignores full-health allies', () => {
      const healer = makeEntity({
        team: 'ally',
        x: 0,
        z: 0,
        isHealer: true,
        range: 12,
      });
      const healthy = makeEntity({
        id: 1,
        team: 'ally',
        x: 3,
        z: 0,
        hp: 100,
        maxHp: 100,
      });
      expect(findCombatTargetPure(healer, [healthy])).toBeUndefined();
    });

    it('enemy prioritizes walls when close', () => {
      const enemy = makeEntity({ team: 'enemy', x: 0, z: 0, range: 3 });
      const wall = makeEntity({
        id: 1,
        team: 'ally',
        type: 'wall',
        x: 3,
        z: 0,
        hp: 600,
      });
      const militia = makeEntity({
        id: 2,
        team: 'ally',
        type: 'militia',
        x: 2,
        z: 0,
        hp: 40,
      });
      const result = findCombatTargetPure(enemy, [wall, militia]);
      expect(result?.id).toBe(1);
    });

    it('ignores dead candidates (hp <= 0)', () => {
      const attacker = makeEntity({ team: 'ally', x: 0, z: 0, range: 5 });
      const dead = makeEntity({ id: 1, team: 'enemy', x: 2, z: 0, hp: 0 });
      expect(findCombatTargetPure(attacker, [dead])).toBeUndefined();
    });
  });

  describe('calculateDamage', () => {
    it('returns full damage for non-armored target', () => {
      const result = calculateDamage(100, false, false);
      expect(result).toBe(100);
    });

    it('reduces damage by 50% for armored target with physical attack', () => {
      const result = calculateDamage(100, true, false);
      expect(result).toBe(50);
    });

    it('does not reduce damage for armored target with magic attack', () => {
      const result = calculateDamage(100, true, true);
      expect(result).toBe(100);
    });

    it('returns at least 1 damage for armored target', () => {
      const result = calculateDamage(1, true, false);
      expect(result).toBe(1);
    });
  });

  describe('processStatusEffects', () => {
    it('applies poison damage over time', () => {
      const result = processStatusEffects(
        { hp: 100, poison: 10, frozen: 0, slowed: 0, affix: undefined },
        0.5,
      );
      // poisonDamageRate = 0.2, dt = 0.5 => damage = 10 * 0.2 * 0.5 = 1
      expect(result.hp).toBeCloseTo(99, 0);
      expect(result.poison).toBeLessThan(10);
    });

    it('decays poison over time', () => {
      const result = processStatusEffects(
        { hp: 100, poison: 10, frozen: 0, slowed: 0, affix: undefined },
        1.0,
      );
      // poisonDecayRate = 2, dt = 1 => new poison = max(0, 10 - 2) = 8
      expect(result.poison).toBe(8);
    });

    it('regenerating affix heals over time', () => {
      const result = processStatusEffects(
        {
          hp: 50,
          maxHp: 100,
          poison: 0,
          frozen: 0,
          slowed: 0,
          affix: 'regenerating',
        },
        1.0,
      );
      // regeneratingHpPerSec = 2, dt = 1 => hp = 52
      expect(result.hp).toBe(52);
    });

    it('regeneration does not exceed maxHp', () => {
      const result = processStatusEffects(
        {
          hp: 99,
          maxHp: 100,
          poison: 0,
          frozen: 0,
          slowed: 0,
          affix: 'regenerating',
        },
        1.0,
      );
      expect(result.hp).toBe(100);
    });

    it('does not regenerate when at full hp', () => {
      const result = processStatusEffects(
        {
          hp: 100,
          maxHp: 100,
          poison: 0,
          frozen: 0,
          slowed: 0,
          affix: 'regenerating',
        },
        1.0,
      );
      expect(result.hp).toBe(100);
    });

    it('decays frozen timer', () => {
      const result = processStatusEffects(
        { hp: 100, poison: 0, frozen: 3, slowed: 0, affix: undefined },
        1.0,
      );
      expect(result.frozen).toBe(2);
    });
  });

  describe('processBossAoe', () => {
    it('damages all allies within boss AoE radius', () => {
      const bossPos = { x: 0, z: 0 };
      const bossDamage = 50;
      const allies: Array<{ id: number; x: number; z: number; invulnerable: number }> = [
        { id: 1, x: 3, z: 0, invulnerable: 0 },
        { id: 2, x: 7, z: 0, invulnerable: 0 },
        { id: 3, x: 20, z: 0, invulnerable: 0 }, // out of range
      ];

      const results = processBossAoe(bossPos, bossDamage, allies);
      // bossAoeRadius = 8
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toEqual([1, 2]);
      expect(results[0].damage).toBe(50);
    });

    it('skips invulnerable allies', () => {
      const bossPos = { x: 0, z: 0 };
      const allies = [{ id: 1, x: 3, z: 0, invulnerable: 5 }];
      const results = processBossAoe(bossPos, 50, allies);
      expect(results).toHaveLength(0);
    });
  });

  describe('selectSiegeTarget', () => {
    const buildings = [
      { id: 1, type: 'hut' as const, x: 10, z: 0 },
      { id: 2, type: 'range' as const, x: 20, z: 0 },
      { id: 3, type: 'temple' as const, x: 30, z: 0 },
      { id: 4, type: 'keep' as const, x: 40, z: 0 },
    ];

    it('orc targets hut first (highest priority)', () => {
      const target = selectSiegeTarget('orc', buildings, { x: 25, z: 0 });
      expect(target?.id).toBe(1); // hut is first priority
    });

    it('orc targets range if no hut available', () => {
      const noHut = buildings.filter((b) => b.type !== 'hut');
      const target = selectSiegeTarget('orc', noHut, { x: 25, z: 0 });
      expect(target?.id).toBe(2); // range is second priority
    });

    it('troll targets range first', () => {
      const target = selectSiegeTarget('troll', buildings, { x: 25, z: 0 });
      expect(target?.id).toBe(2); // range is first troll priority
    });

    it('troll falls back to temple then keep', () => {
      const noRange = buildings.filter((b) => b.type !== 'range');
      const target = selectSiegeTarget('troll', noRange, { x: 25, z: 0 });
      expect(target?.id).toBe(3); // temple is second troll priority
    });

    it('boss targets keep', () => {
      const target = selectSiegeTarget('boss', buildings, { x: 25, z: 0 });
      expect(target?.id).toBe(4); // keep
    });

    it('goblin targets nearest building', () => {
      // Goblin at x=35, nearest building is temple at x=30
      const target = selectSiegeTarget('goblin', buildings, { x: 35, z: 0 });
      expect(target?.id).toBe(3); // temple is nearest
    });

    it('goblin targets nearest among all types', () => {
      // Goblin at x=9, nearest is hut at x=10
      const target = selectSiegeTarget('goblin', buildings, { x: 9, z: 0 });
      expect(target?.id).toBe(1); // hut is nearest
    });

    it('returns undefined when no buildings available', () => {
      const target = selectSiegeTarget('orc', [], { x: 0, z: 0 });
      expect(target).toBeUndefined();
    });

    it('falls back to nearest when no priority buildings exist', () => {
      // Only lumber buildings, orc wants hut/range
      const lumber = [{ id: 5, type: 'lumber' as const, x: 10, z: 0 }];
      const target = selectSiegeTarget('orc', lumber, { x: 0, z: 0 });
      expect(target?.id).toBe(5); // falls back to nearest
    });
  });

  describe('rollDrop', () => {
    it('returns null most of the time (low drop chance)', () => {
      // With many rolls, most should be null
      let nullCount = 0;
      for (let i = 0; i < 100; i++) {
        const rng = createRng(`drop-null-${i}`);
        if (rollDrop(rng, []) === null) nullCount++;
      }
      // Combined chance is 0.05 + 0.03 = 0.08, so ~92% should be null
      expect(nullCount).toBeGreaterThan(80);
    });

    it('can return "potion" as a drop', () => {
      let foundPotion = false;
      for (let i = 0; i < 500; i++) {
        const rng = createRng(`drop-potion-${i}`);
        if (rollDrop(rng, []) === 'potion') {
          foundPotion = true;
          break;
        }
      }
      expect(foundPotion).toBe(true);
    });

    it('can return "star" as a drop', () => {
      let foundStar = false;
      for (let i = 0; i < 500; i++) {
        const rng = createRng(`drop-star-${i}`);
        if (rollDrop(rng, []) === 'star') {
          foundStar = true;
          break;
        }
      }
      expect(foundStar).toBe(true);
    });

    it('golden_age relic doubles drop chances', () => {
      let dropsWithRelic = 0;
      let dropsWithout = 0;
      const trials = 2000;

      for (let i = 0; i < trials; i++) {
        const rng1 = createRng(`relic-test-${i}`);
        const rng2 = createRng(`relic-test-${i}`);
        if (rollDrop(rng1, ['golden_age']) !== null) dropsWithRelic++;
        if (rollDrop(rng2, []) !== null) dropsWithout++;
      }

      // With relic, effective rate is ~0.16 vs ~0.08 without
      // dropsWithRelic should be roughly 2x dropsWithout
      expect(dropsWithRelic).toBeGreaterThan(dropsWithout * 1.5);
    });

    it('is deterministic with same RNG seed', () => {
      const results: (string | null)[] = [];
      for (let run = 0; run < 2; run++) {
        const rng = createRng('deterministic-drop');
        results.push(rollDrop(rng, []));
      }
      expect(results[0]).toBe(results[1]);
    });
  });
});
