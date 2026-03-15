/**
 * @module biomeScenarios.test
 *
 * Comprehensive scenario tests for all 4 biomes: kings-road (default),
 * desert-wastes, frost-peaks, and shadow-marsh. Tests modifier application,
 * configuration values, and edge cases.
 */

import {
  applyBiomeModifiers,
  type BiomeSession,
  getAllBiomeIds,
  getBiomeConfig,
} from '../../engine/systems/biomeSystem';

/* ------------------------------------------------------------------ */
/*  Base session for testing                                          */
/* ------------------------------------------------------------------ */

const baseSession: BiomeSession = {
  faithRegenRate: 1.0,
  killGoldBase: 10,
  enemySpeed: 5.0,
  enemyHp: 100,
  buildTimer: 30,
  dropChance: 0.08,
};

/* ------------------------------------------------------------------ */
/*  Biome registry                                                    */
/* ------------------------------------------------------------------ */

describe('biome scenarios: registry', () => {
  it('has exactly 4 biomes', () => {
    expect(getAllBiomeIds()).toHaveLength(4);
  });

  it('contains all expected biome IDs', () => {
    const ids = getAllBiomeIds();
    expect(ids).toContain('kings-road');
    expect(ids).toContain('desert-wastes');
    expect(ids).toContain('frost-peaks');
    expect(ids).toContain('shadow-marsh');
  });

  it('unknown biome falls back to kings-road', () => {
    const config = getBiomeConfig('nonexistent-biome');
    const kingsRoad = getBiomeConfig('kings-road');
    expect(config).toEqual(kingsRoad);
  });
});

/* ------------------------------------------------------------------ */
/*  Kings Road: default (1x everything)                               */
/* ------------------------------------------------------------------ */

describe('biome scenarios: kings-road (default)', () => {
  it('all multipliers are 1.0', () => {
    const config = getBiomeConfig('kings-road');
    expect(config.faithRegenMultiplier).toBe(1.0);
    expect(config.killGoldMultiplier).toBe(1.0);
    expect(config.enemySpeedMultiplier).toBe(1.0);
    expect(config.enemyHpMultiplier).toBe(1.0);
    expect(config.buildTimerMultiplier).toBe(1.0);
    expect(config.dropChanceMultiplier).toBe(1.0);
  });

  it('does not modify any session parameters', () => {
    const modified = applyBiomeModifiers(baseSession, 'kings-road');
    expect(modified.faithRegenRate).toBe(baseSession.faithRegenRate);
    expect(modified.killGoldBase).toBe(baseSession.killGoldBase);
    expect(modified.enemySpeed).toBe(baseSession.enemySpeed);
    expect(modified.enemyHp).toBe(baseSession.enemyHp);
    expect(modified.buildTimer).toBe(baseSession.buildTimer);
    expect(modified.dropChance).toBe(baseSession.dropChance);
  });

  it('has tree and rock scenery', () => {
    const config = getBiomeConfig('kings-road');
    expect(config.sceneryTypes).toContain('tree');
    expect(config.sceneryTypes).toContain('rock');
  });

  it('uses forest ambient audio', () => {
    const config = getBiomeConfig('kings-road');
    expect(config.ambientAudioKey).toBe('forest');
  });

  it('has 4 terrain colors', () => {
    const config = getBiomeConfig('kings-road');
    expect(config.terrainColors).toHaveLength(4);
  });
});

/* ------------------------------------------------------------------ */
/*  Desert Wastes: reduced faith regen, increased kill gold           */
/* ------------------------------------------------------------------ */

describe('biome scenarios: desert-wastes', () => {
  it('faith regen is 0.5x', () => {
    const config = getBiomeConfig('desert-wastes');
    expect(config.faithRegenMultiplier).toBe(0.5);
  });

  it('kill gold is 1.5x', () => {
    const config = getBiomeConfig('desert-wastes');
    expect(config.killGoldMultiplier).toBe(1.5);
  });

  it('other multipliers are 1.0', () => {
    const config = getBiomeConfig('desert-wastes');
    expect(config.enemySpeedMultiplier).toBe(1.0);
    expect(config.enemyHpMultiplier).toBe(1.0);
    expect(config.buildTimerMultiplier).toBe(1.0);
    expect(config.dropChanceMultiplier).toBe(1.0);
  });

  it('halves faith regen rate in session', () => {
    const modified = applyBiomeModifiers(baseSession, 'desert-wastes');
    expect(modified.faithRegenRate).toBe(0.5);
  });

  it('increases kill gold by 50% (floored)', () => {
    const modified = applyBiomeModifiers(baseSession, 'desert-wastes');
    expect(modified.killGoldBase).toBe(Math.floor(10 * 1.5)); // 15
  });

  it('kill gold floors odd values', () => {
    const oddSession = { ...baseSession, killGoldBase: 7 };
    const modified = applyBiomeModifiers(oddSession, 'desert-wastes');
    expect(modified.killGoldBase).toBe(Math.floor(7 * 1.5)); // 10
  });

  it('does not change enemy speed', () => {
    const modified = applyBiomeModifiers(baseSession, 'desert-wastes');
    expect(modified.enemySpeed).toBe(5.0);
  });

  it('has rock and cactus scenery', () => {
    const config = getBiomeConfig('desert-wastes');
    expect(config.sceneryTypes).toContain('rock');
    expect(config.sceneryTypes).toContain('cactus');
  });

  it('uses desert ambient audio', () => {
    const config = getBiomeConfig('desert-wastes');
    expect(config.ambientAudioKey).toBe('desert');
  });
});

/* ------------------------------------------------------------------ */
/*  Frost Peaks: enemies start slowed, reduced build timer            */
/* ------------------------------------------------------------------ */

describe('biome scenarios: frost-peaks', () => {
  it('enemy speed is 0.8x (slowed)', () => {
    const config = getBiomeConfig('frost-peaks');
    expect(config.enemySpeedMultiplier).toBe(0.8);
  });

  it('build timer is 0.8x (reduced)', () => {
    const config = getBiomeConfig('frost-peaks');
    expect(config.buildTimerMultiplier).toBe(0.8);
  });

  it('other multipliers are 1.0', () => {
    const config = getBiomeConfig('frost-peaks');
    expect(config.faithRegenMultiplier).toBe(1.0);
    expect(config.killGoldMultiplier).toBe(1.0);
    expect(config.enemyHpMultiplier).toBe(1.0);
    expect(config.dropChanceMultiplier).toBe(1.0);
  });

  it('slows enemies in session', () => {
    const modified = applyBiomeModifiers(baseSession, 'frost-peaks');
    expect(modified.enemySpeed).toBe(4.0); // 5 * 0.8
  });

  it('reduces build timer in session', () => {
    const modified = applyBiomeModifiers(baseSession, 'frost-peaks');
    expect(modified.buildTimer).toBe(24); // 30 * 0.8
  });

  it('does not change faith regen', () => {
    const modified = applyBiomeModifiers(baseSession, 'frost-peaks');
    expect(modified.faithRegenRate).toBe(1.0);
  });

  it('has pine and rock scenery', () => {
    const config = getBiomeConfig('frost-peaks');
    expect(config.sceneryTypes).toContain('pine');
    expect(config.sceneryTypes).toContain('rock');
  });

  it('uses snow ambient audio', () => {
    const config = getBiomeConfig('frost-peaks');
    expect(config.ambientAudioKey).toBe('snow');
  });
});

/* ------------------------------------------------------------------ */
/*  Shadow Marsh: enemies +20% HP, doubled drop chance               */
/* ------------------------------------------------------------------ */

describe('biome scenarios: shadow-marsh', () => {
  it('enemy HP is 1.2x', () => {
    const config = getBiomeConfig('shadow-marsh');
    expect(config.enemyHpMultiplier).toBe(1.2);
  });

  it('drop chance is 2.0x (doubled)', () => {
    const config = getBiomeConfig('shadow-marsh');
    expect(config.dropChanceMultiplier).toBe(2.0);
  });

  it('other multipliers are 1.0', () => {
    const config = getBiomeConfig('shadow-marsh');
    expect(config.faithRegenMultiplier).toBe(1.0);
    expect(config.killGoldMultiplier).toBe(1.0);
    expect(config.enemySpeedMultiplier).toBe(1.0);
    expect(config.buildTimerMultiplier).toBe(1.0);
  });

  it('increases enemy HP by 20% in session (floored)', () => {
    const modified = applyBiomeModifiers(baseSession, 'shadow-marsh');
    expect(modified.enemyHp).toBe(Math.floor(100 * 1.2)); // 120
  });

  it('enemy HP floors odd values', () => {
    const oddSession = { ...baseSession, enemyHp: 33 };
    const modified = applyBiomeModifiers(oddSession, 'shadow-marsh');
    expect(modified.enemyHp).toBe(Math.floor(33 * 1.2)); // 39
  });

  it('doubles drop chance in session', () => {
    const modified = applyBiomeModifiers(baseSession, 'shadow-marsh');
    expect(modified.dropChance).toBe(0.16); // 0.08 * 2.0
  });

  it('does not change enemy speed', () => {
    const modified = applyBiomeModifiers(baseSession, 'shadow-marsh');
    expect(modified.enemySpeed).toBe(5.0);
  });

  it('has deadTree and mushroom scenery', () => {
    const config = getBiomeConfig('shadow-marsh');
    expect(config.sceneryTypes).toContain('deadTree');
    expect(config.sceneryTypes).toContain('mushroom');
  });

  it('uses swamp ambient audio', () => {
    const config = getBiomeConfig('shadow-marsh');
    expect(config.ambientAudioKey).toBe('swamp');
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-biome comparison                                            */
/* ------------------------------------------------------------------ */

describe('biome scenarios: cross-biome comparison', () => {
  it('only desert-wastes reduces faith regen', () => {
    const ids = getAllBiomeIds();
    for (const id of ids) {
      const config = getBiomeConfig(id);
      if (id === 'desert-wastes') {
        expect(config.faithRegenMultiplier).toBeLessThan(1.0);
      } else {
        expect(config.faithRegenMultiplier).toBe(1.0);
      }
    }
  });

  it('only frost-peaks slows enemies', () => {
    const ids = getAllBiomeIds();
    for (const id of ids) {
      const config = getBiomeConfig(id);
      if (id === 'frost-peaks') {
        expect(config.enemySpeedMultiplier).toBeLessThan(1.0);
      } else {
        expect(config.enemySpeedMultiplier).toBe(1.0);
      }
    }
  });

  it('only shadow-marsh increases enemy HP', () => {
    const ids = getAllBiomeIds();
    for (const id of ids) {
      const config = getBiomeConfig(id);
      if (id === 'shadow-marsh') {
        expect(config.enemyHpMultiplier).toBeGreaterThan(1.0);
      } else {
        expect(config.enemyHpMultiplier).toBe(1.0);
      }
    }
  });

  it('each biome has a unique ambient audio key', () => {
    const ids = getAllBiomeIds();
    const audioKeys = ids.map((id) => getBiomeConfig(id).ambientAudioKey);
    const uniqueKeys = new Set(audioKeys);
    expect(uniqueKeys.size).toBe(ids.length);
  });

  it('each biome has at least 2 scenery types', () => {
    for (const id of getAllBiomeIds()) {
      const config = getBiomeConfig(id);
      expect(config.sceneryTypes.length).toBeGreaterThanOrEqual(2);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Immutability                                                      */
/* ------------------------------------------------------------------ */

describe('biome scenarios: immutability', () => {
  it('applyBiomeModifiers does not mutate input session', () => {
    const session = { ...baseSession };
    applyBiomeModifiers(session, 'desert-wastes');
    expect(session).toEqual(baseSession);
  });

  it('returns a new object', () => {
    const result = applyBiomeModifiers(baseSession, 'kings-road');
    expect(result).not.toBe(baseSession);
  });
});
