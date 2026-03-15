/**
 * @module buildingScenarios.test
 *
 * Comprehensive scenario tests for building placement, upgrade costs,
 * sell values, spawn rates, stat multipliers, and affordability checks.
 */

import { BUILDINGS, type BuildingType } from '../../engine/constants';
import {
  calculateSellValue,
  calculateSpawnRate,
  calculateStatMultiplier,
  calculateUpgradeCost,
  canAffordBuilding,
  getRoadDistancePure,
  isPlacementValidPure,
  snapToGrid,
} from '../../engine/systems/buildingSystem';

/* ------------------------------------------------------------------ */
/*  Road distance rules                                               */
/* ------------------------------------------------------------------ */

const roadSamples = [
  { x: 0, z: 0 },
  { x: 5, z: 0 },
  { x: 10, z: 0 },
  { x: 15, z: 0 },
  { x: 20, z: 0 },
];
const sanctuaryPos = { x: 25, z: 0 };

describe('building scenarios: placement near road (<=4) only allows walls', () => {
  it('wall at distance 0 from road is valid', () => {
    expect(isPlacementValidPure('wall', { x: 0, z: 0 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('wall at distance 3 from road is valid', () => {
    expect(isPlacementValidPure('wall', { x: 0, z: 3 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('wall at distance 4 from road is valid', () => {
    expect(isPlacementValidPure('wall', { x: 0, z: 4 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('wall at distance 5 from road is rejected (>4)', () => {
    expect(isPlacementValidPure('wall', { x: 0, z: 5 }, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });

  it('hut at distance 3 from road is rejected (too close)', () => {
    expect(isPlacementValidPure('hut', { x: 0, z: 3 }, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });

  it('range at distance 5 from road is rejected (5 < 7)', () => {
    expect(isPlacementValidPure('range', { x: 0, z: 5 }, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });

  it('sentry turret at distance 2 from road is rejected', () => {
    expect(isPlacementValidPure('sentry', { x: 0, z: 2 }, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Placement far from road (>=7) allows spawners/turrets             */
/* ------------------------------------------------------------------ */

describe('building scenarios: placement far from road (>=7)', () => {
  it('hut at distance 7 from road is valid', () => {
    expect(isPlacementValidPure('hut', { x: 0, z: 7 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('hut at distance 10 from road is valid', () => {
    expect(isPlacementValidPure('hut', { x: 0, z: 10 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('range at distance 8 from road is valid', () => {
    expect(isPlacementValidPure('range', { x: 0, z: 8 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('temple at distance 15 from road is valid', () => {
    expect(isPlacementValidPure('temple', { x: 0, z: 15 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('keep at distance 7 from road is valid', () => {
    expect(isPlacementValidPure('keep', { x: 0, z: 7 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('sentry turret at distance 10 from road is valid', () => {
    expect(isPlacementValidPure('sentry', { x: 0, z: 10 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('obelisk turret at distance 20 from road is valid', () => {
    expect(
      isPlacementValidPure('obelisk', { x: 0, z: 20 }, roadSamples, sanctuaryPos, [], []),
    ).toBe(true);
  });

  it('hut at distance 6 from road is rejected (6 < 7)', () => {
    expect(isPlacementValidPure('hut', { x: 0, z: 6 }, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Tracks can be placed anywhere                                     */
/* ------------------------------------------------------------------ */

describe('building scenarios: track placement', () => {
  it('track near road is valid', () => {
    expect(isPlacementValidPure('track', { x: 0, z: 1 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('track far from road is valid', () => {
    expect(isPlacementValidPure('track', { x: 0, z: 50 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('track on road is valid', () => {
    expect(isPlacementValidPure('track', { x: 5, z: 0 }, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });

  it('track can overlap resource buildings (lumber, ore, gem, mint)', () => {
    for (const resourceType of ['lumber', 'mine_ore', 'mine_gem', 'mint'] as BuildingType[]) {
      const existing = [{ type: resourceType, x: 0, z: 10 }];
      expect(
        isPlacementValidPure('track', { x: 0, z: 10 }, roadSamples, sanctuaryPos, existing, []),
      ).toBe(true);
    }
  });

  it('track cannot overlap non-resource buildings (hut, range, etc.)', () => {
    const existing = [{ type: 'hut' as BuildingType, x: 0, z: 10 }];
    expect(
      isPlacementValidPure('track', { x: 0, z: 10 }, roadSamples, sanctuaryPos, existing, []),
    ).toBe(false);
  });

  it('track on sanctuary position is valid', () => {
    expect(isPlacementValidPure('track', sanctuaryPos, roadSamples, sanctuaryPos, [], [])).toBe(
      true,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  No overlapping (5-unit spacing)                                   */
/* ------------------------------------------------------------------ */

describe('building scenarios: no overlapping', () => {
  it('buildings at same position overlap', () => {
    const existing = [{ type: 'hut' as BuildingType, x: 0, z: 10 }];
    expect(
      isPlacementValidPure('range', { x: 0, z: 10 }, roadSamples, sanctuaryPos, existing, []),
    ).toBe(false);
  });

  it('buildings within 5 units overlap', () => {
    const existing = [{ type: 'hut' as BuildingType, x: 0, z: 10 }];
    expect(
      isPlacementValidPure('range', { x: 0, z: 12 }, roadSamples, sanctuaryPos, existing, []),
    ).toBe(false);
  });

  it('buildings at exactly 5 units apart do not overlap', () => {
    const existing = [{ type: 'hut' as BuildingType, x: 0, z: 10 }];
    expect(
      isPlacementValidPure('range', { x: 0, z: 15 }, roadSamples, sanctuaryPos, existing, []),
    ).toBe(true);
  });

  it('buildings far apart are valid', () => {
    const existing = [{ type: 'hut' as BuildingType, x: 0, z: 10 }];
    expect(
      isPlacementValidPure('range', { x: 0, z: 20 }, roadSamples, sanctuaryPos, existing, []),
    ).toBe(true);
  });

  it('wall units block building placement', () => {
    const walls = [{ x: 0, z: 3 }];
    expect(isPlacementValidPure('wall', { x: 0, z: 3 }, roadSamples, sanctuaryPos, [], walls)).toBe(
      false,
    );
  });

  it('wall units within 5 units block placement', () => {
    const walls = [{ x: 0, z: 8 }];
    expect(isPlacementValidPure('hut', { x: 0, z: 10 }, roadSamples, sanctuaryPos, [], walls)).toBe(
      false,
    );
  });

  it('sanctuary overlap is rejected for non-track buildings', () => {
    expect(isPlacementValidPure('hut', sanctuaryPos, roadSamples, sanctuaryPos, [], [])).toBe(
      false,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  Grid snap (5-unit grid)                                           */
/* ------------------------------------------------------------------ */

describe('building scenarios: grid snap', () => {
  it('snaps 3 to 5', () => {
    expect(snapToGrid({ x: 3, y: 0, z: 0 })).toEqual({ x: 5, y: 1.5, z: 0 });
  });

  it('snaps 7 to 5', () => {
    expect(snapToGrid({ x: 7, y: 0, z: 0 })).toEqual({ x: 5, y: 1.5, z: 0 });
  });

  it('snaps 8 to 10', () => {
    expect(snapToGrid({ x: 8, y: 0, z: 0 })).toEqual({ x: 10, y: 1.5, z: 0 });
  });

  it('keeps multiples of 5 unchanged', () => {
    expect(snapToGrid({ x: 10, y: 0, z: 15 })).toEqual({ x: 10, y: 1.5, z: 15 });
  });

  it('snaps both x and z', () => {
    expect(snapToGrid({ x: 3, y: 0, z: 7 })).toEqual({ x: 5, y: 1.5, z: 5 });
  });

  it('always sets y to 1.5', () => {
    expect(snapToGrid({ x: 0, y: 99, z: 0 }).y).toBe(1.5);
  });

  it('handles negative coordinates', () => {
    expect(snapToGrid({ x: -3, y: 0, z: -7 })).toEqual({ x: -5, y: 1.5, z: -5 });
  });

  it('snaps 0 to 0', () => {
    expect(snapToGrid({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 1.5, z: 0 });
  });

  it('snaps 2.5 to 5 (rounds up at midpoint)', () => {
    expect(snapToGrid({ x: 2.5, y: 0, z: 0 })).toEqual({ x: 5, y: 1.5, z: 0 });
  });

  it('handles large coordinates', () => {
    expect(snapToGrid({ x: 102, y: 0, z: 998 })).toEqual({ x: 100, y: 1.5, z: 1000 });
  });
});

/* ------------------------------------------------------------------ */
/*  Upgrade cost formula: baseCost * 1.5^(level-1)                    */
/* ------------------------------------------------------------------ */

describe('building scenarios: upgrade cost formula', () => {
  const base = 100;

  it('level 1: baseCost * 1.5^0 = baseCost', () => {
    expect(calculateUpgradeCost(base, 1)).toEqual({ gold: 100, wood: 100 });
  });

  it('level 2: baseCost * 1.5^1 = 150', () => {
    expect(calculateUpgradeCost(base, 2)).toEqual({ gold: 150, wood: 150 });
  });

  it('level 3: baseCost * 1.5^2 = 225', () => {
    expect(calculateUpgradeCost(base, 3)).toEqual({ gold: 225, wood: 225 });
  });

  it('level 4: baseCost * 1.5^3 = 337 (floored from 337.5)', () => {
    expect(calculateUpgradeCost(base, 4)).toEqual({ gold: 337, wood: 337 });
  });

  it('level 5: baseCost * 1.5^4 = 506 (floored from 506.25)', () => {
    expect(calculateUpgradeCost(base, 5)).toEqual({ gold: 506, wood: 506 });
  });

  it('level 6: returns Infinity (max level 5)', () => {
    expect(calculateUpgradeCost(base, 6)).toEqual({ gold: Infinity, wood: Infinity });
  });

  it('level 10: returns Infinity', () => {
    expect(calculateUpgradeCost(base, 10)).toEqual({ gold: Infinity, wood: Infinity });
  });

  it('works with hut base cost (50)', () => {
    expect(calculateUpgradeCost(50, 1)).toEqual({ gold: 50, wood: 50 });
    expect(calculateUpgradeCost(50, 2)).toEqual({ gold: 75, wood: 75 });
    expect(calculateUpgradeCost(50, 3)).toEqual({ gold: 112, wood: 112 }); // floor(50*2.25)
  });

  it('works with keep base cost (200)', () => {
    expect(calculateUpgradeCost(200, 1)).toEqual({ gold: 200, wood: 200 });
    expect(calculateUpgradeCost(200, 2)).toEqual({ gold: 300, wood: 300 });
  });

  it('cost increases monotonically', () => {
    for (let level = 2; level <= 5; level++) {
      const prev = calculateUpgradeCost(100, level - 1);
      const curr = calculateUpgradeCost(100, level);
      expect(curr.gold).toBeGreaterThan(prev.gold);
    }
  });

  it('gold and wood costs are always equal', () => {
    for (let level = 1; level <= 5; level++) {
      const { gold, wood } = calculateUpgradeCost(100, level);
      expect(gold).toBe(wood);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Max level 5 enforcement                                           */
/* ------------------------------------------------------------------ */

describe('building scenarios: max level enforcement', () => {
  it('level 5 upgrade is allowed', () => {
    const { gold } = calculateUpgradeCost(100, 5);
    expect(gold).toBeLessThan(Infinity);
  });

  it('level 6 upgrade returns Infinity', () => {
    const { gold, wood } = calculateUpgradeCost(100, 6);
    expect(gold).toBe(Infinity);
    expect(wood).toBe(Infinity);
  });

  it('all levels beyond 5 return Infinity', () => {
    for (let level = 6; level <= 20; level++) {
      const { gold } = calculateUpgradeCost(100, level);
      expect(gold).toBe(Infinity);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Sell value = 50% gold + 50% wood                                  */
/* ------------------------------------------------------------------ */

describe('building scenarios: sell value', () => {
  it('hut at level 1 sells for 50% of base gold cost', () => {
    const result = calculateSellValue('hut', 1, 1);
    expect(result.gold).toBe(Math.floor(50 * 0.5)); // 25
  });

  it('wall sells for 50% of wood cost', () => {
    const result = calculateSellValue('wall', 1, 1);
    expect(result.wood).toBe(Math.floor(15 * 0.5)); // 7
  });

  it('upgraded building sells for more gold', () => {
    const lowLevel = calculateSellValue('hut', 1, 1);
    const highLevel = calculateSellValue('hut', 3, 3);
    expect(highLevel.gold).toBeGreaterThan(lowLevel.gold);
  });

  it('sell value accounts for both spawn and stats upgrade investments', () => {
    // hut cost=50, levelSpawn=2, levelStats=1
    // spawn upgrades: 50*1.5^0 = 50 (level 1->2)
    // total invested: 50 (base) + 50 (spawn) = 100
    // sell gold = floor(100 * 0.5) = 50
    const result = calculateSellValue('hut', 2, 1);
    expect(result.gold).toBe(50);
  });

  it('keep at level 1 sells for 50% of base cost', () => {
    const result = calculateSellValue('keep', 1, 1);
    expect(result.gold).toBe(Math.floor(200 * 0.5)); // 100
  });
});

/* ------------------------------------------------------------------ */
/*  Building spawn rates                                              */
/* ------------------------------------------------------------------ */

describe('building scenarios: spawn rates', () => {
  it('hut spawns at base rate (3.5s) at level 1', () => {
    expect(calculateSpawnRate('hut', 1)).toBeCloseTo(3.5);
  });

  it('higher level reduces spawn time', () => {
    const rate1 = calculateSpawnRate('hut', 1);
    const rate3 = calculateSpawnRate('hut', 3);
    const rate5 = calculateSpawnRate('hut', 5);
    expect(rate3).toBeLessThan(rate1);
    expect(rate5).toBeLessThan(rate3);
  });

  it('range spawns at 4.5s base', () => {
    expect(calculateSpawnRate('range', 1)).toBeCloseTo(4.5);
  });

  it('temple spawns at 6.0s base', () => {
    expect(calculateSpawnRate('temple', 1)).toBeCloseTo(6.0);
  });

  it('keep spawns at 8.0s base', () => {
    expect(calculateSpawnRate('keep', 1)).toBeCloseTo(8.0);
  });

  it('spawn rate formula: baseTime * 0.8^(level-1)', () => {
    for (let level = 1; level <= 5; level++) {
      const expected = 3.5 * 0.8 ** (level - 1);
      expect(calculateSpawnRate('hut', level)).toBeCloseTo(expected, 4);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Stat multiplier                                                   */
/* ------------------------------------------------------------------ */

describe('building scenarios: stat multiplier', () => {
  it('level 1 multiplier is 1.0', () => {
    expect(calculateStatMultiplier(1)).toBe(1.0);
  });

  it('level 2 multiplier is 1.3', () => {
    expect(calculateStatMultiplier(2)).toBeCloseTo(1.3);
  });

  it('level 3 multiplier is 1.3^2 = 1.69', () => {
    expect(calculateStatMultiplier(3)).toBeCloseTo(1.69);
  });

  it('multiplier increases each level', () => {
    for (let level = 2; level <= 5; level++) {
      expect(calculateStatMultiplier(level)).toBeGreaterThan(calculateStatMultiplier(level - 1));
    }
  });

  it('formula: 1.3^(level-1)', () => {
    for (let level = 1; level <= 5; level++) {
      expect(calculateStatMultiplier(level)).toBeCloseTo(1.3 ** (level - 1), 4);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Building types and unit spawns                                    */
/* ------------------------------------------------------------------ */

describe('building scenarios: building type unit spawns', () => {
  it('hut spawns militia', () => {
    expect(BUILDINGS.hut.unit).toBe('militia');
  });

  it('range spawns archer', () => {
    expect(BUILDINGS.range.unit).toBe('archer');
  });

  it('temple spawns cleric', () => {
    expect(BUILDINGS.temple.unit).toBe('cleric');
  });

  it('keep spawns knight', () => {
    expect(BUILDINGS.keep.unit).toBe('knight');
  });

  it('wall spawns wall unit', () => {
    expect(BUILDINGS.wall.unit).toBe('wall');
  });

  it('turrets spawn no units', () => {
    expect(BUILDINGS.sentry.unit).toBeNull();
    expect(BUILDINGS.obelisk.unit).toBeNull();
    expect(BUILDINGS.catapult.unit).toBeNull();
    expect(BUILDINGS.sorcerer.unit).toBeNull();
  });

  it('resource buildings spawn no units', () => {
    expect(BUILDINGS.lumber.unit).toBeNull();
    expect(BUILDINGS.mine_ore.unit).toBeNull();
    expect(BUILDINGS.mine_gem.unit).toBeNull();
    expect(BUILDINGS.vault.unit).toBeNull();
  });

  it('track spawns no units', () => {
    expect(BUILDINGS.track.unit).toBeNull();
  });

  it('mint spawns no units', () => {
    expect(BUILDINGS.mint.unit).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Turret config                                                     */
/* ------------------------------------------------------------------ */

describe('building scenarios: turret targeting modes', () => {
  it('sentry has range, damage, and atkSpd', () => {
    expect(BUILDINGS.sentry.range).toBe(20);
    expect(BUILDINGS.sentry.damage).toBe(15);
    expect(BUILDINGS.sentry.atkSpd).toBe(1.0);
  });

  it('obelisk has range, damage, and atkSpd', () => {
    expect(BUILDINGS.obelisk.range).toBe(25);
    expect(BUILDINGS.obelisk.damage).toBe(40);
    expect(BUILDINGS.obelisk.atkSpd).toBe(2.5);
  });

  it('catapult has range, damage, and atkSpd', () => {
    expect(BUILDINGS.catapult.range).toBe(30);
    expect(BUILDINGS.catapult.damage).toBe(80);
    expect(BUILDINGS.catapult.atkSpd).toBe(4.0);
  });

  it('sorcerer has range, damage, and atkSpd', () => {
    expect(BUILDINGS.sorcerer.range).toBe(20);
    expect(BUILDINGS.sorcerer.damage).toBe(10);
    expect(BUILDINGS.sorcerer.atkSpd).toBe(1.5);
  });

  it('all turrets are marked isTurret', () => {
    expect(BUILDINGS.sentry.isTurret).toBe(true);
    expect(BUILDINGS.obelisk.isTurret).toBe(true);
    expect(BUILDINGS.catapult.isTurret).toBe(true);
    expect(BUILDINGS.sorcerer.isTurret).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Resource buildings                                                */
/* ------------------------------------------------------------------ */

describe('building scenarios: resource buildings', () => {
  it('lumber camp produces wood (spawnTime 5.0)', () => {
    expect(BUILDINGS.lumber.spawnTime).toBe(5.0);
  });

  it('ore mine produces ore (spawnTime 5.0)', () => {
    expect(BUILDINGS.mine_ore.spawnTime).toBe(5.0);
  });

  it('gem mine produces gems (spawnTime 10.0)', () => {
    expect(BUILDINGS.mine_gem.spawnTime).toBe(10.0);
  });

  it('vault produces gold (spawnTime 10.0)', () => {
    expect(BUILDINGS.vault.spawnTime).toBe(10.0);
  });
});

/* ------------------------------------------------------------------ */
/*  Affordability checks                                              */
/* ------------------------------------------------------------------ */

describe('building scenarios: affordability', () => {
  it('can afford hut with 50g 20w', () => {
    expect(canAffordBuilding('hut', 50, 20, [])).toBe(true);
  });

  it('cannot afford hut with 49g 20w', () => {
    expect(canAffordBuilding('hut', 49, 20, [])).toBe(false);
  });

  it('cannot afford hut with 50g 19w', () => {
    expect(canAffordBuilding('hut', 50, 19, [])).toBe(false);
  });

  it('wall only costs wood (0g 15w)', () => {
    expect(canAffordBuilding('wall', 0, 15, [])).toBe(true);
  });

  it('cannot afford wall with 0g 14w', () => {
    expect(canAffordBuilding('wall', 0, 14, [])).toBe(false);
  });

  it('track costs 5g 5w', () => {
    expect(canAffordBuilding('track', 5, 5, [])).toBe(true);
    expect(canAffordBuilding('track', 4, 5, [])).toBe(false);
    expect(canAffordBuilding('track', 5, 4, [])).toBe(false);
  });

  it('iron_tracks relic waives track wood cost', () => {
    expect(canAffordBuilding('track', 5, 0, ['iron_tracks'])).toBe(true);
  });

  it('iron_tracks relic does not affect non-track buildings', () => {
    expect(canAffordBuilding('hut', 50, 0, ['iron_tracks'])).toBe(false);
  });

  it('keep costs 200g 100w', () => {
    expect(canAffordBuilding('keep', 200, 100, [])).toBe(true);
    expect(canAffordBuilding('keep', 199, 100, [])).toBe(false);
    expect(canAffordBuilding('keep', 200, 99, [])).toBe(false);
  });

  it('sentry costs 0g 100w', () => {
    expect(canAffordBuilding('sentry', 0, 100, [])).toBe(true);
    expect(canAffordBuilding('sentry', 0, 99, [])).toBe(false);
  });

  it('excess resources are fine', () => {
    expect(canAffordBuilding('hut', 9999, 9999, [])).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Road distance calculation                                         */
/* ------------------------------------------------------------------ */

describe('building scenarios: road distance', () => {
  it('on the road returns 0', () => {
    expect(getRoadDistancePure({ x: 5, z: 0 }, roadSamples)).toBe(0);
  });

  it('perpendicular distance is correct', () => {
    const dist = getRoadDistancePure({ x: 5, z: 10 }, roadSamples);
    expect(dist).toBe(10);
  });

  it('diagonal distance is correct', () => {
    const dist = getRoadDistancePure({ x: 3, z: 4 }, [{ x: 0, z: 0 }]);
    expect(dist).toBe(5);
  });

  it('picks the nearest sample point', () => {
    const dist = getRoadDistancePure({ x: 12, z: 0 }, roadSamples);
    // Nearest is x=10, distance = 2
    expect(dist).toBe(2);
  });

  it('returns Infinity-like distance for very far positions', () => {
    const dist = getRoadDistancePure({ x: 1000, z: 1000 }, roadSamples);
    expect(dist).toBeGreaterThan(100);
  });
});
