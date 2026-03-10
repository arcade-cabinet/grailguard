import {
  BUILDING_COST,
  BUILDING_SPAWN_INTERVAL,
  BUILDING_SPAWNS,
  CELL_SIZE,
  ENEMY_WAVE_TYPES,
  GRID_SIZE,
  HALF_GRID,
  HP_SCALE_PER_WAVE,
  TILE,
  UNIT_STATS,
} from '../../engine/constants';

describe('constants', () => {
  describe('grid dimensions', () => {
    it('has a 22×22 grid', () => {
      expect(GRID_SIZE).toBe(22);
    });

    it('computes HALF_GRID from GRID_SIZE and CELL_SIZE', () => {
      expect(HALF_GRID).toBe((GRID_SIZE * CELL_SIZE) / 2);
    });

    it('has a positive CELL_SIZE', () => {
      expect(CELL_SIZE).toBeGreaterThan(0);
    });
  });

  describe('TILE enum', () => {
    it('has distinct values for all tile types', () => {
      const values = Object.values(TILE);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('includes GRASS, PATH, BUILDING, SANCTUARY, SPAWN, SCENERY, BARRICADE', () => {
      expect(TILE).toHaveProperty('GRASS');
      expect(TILE).toHaveProperty('PATH');
      expect(TILE).toHaveProperty('BUILDING');
      expect(TILE).toHaveProperty('SANCTUARY');
      expect(TILE).toHaveProperty('SPAWN');
      expect(TILE).toHaveProperty('SCENERY');
      expect(TILE).toHaveProperty('BARRICADE');
    });
  });

  describe('UNIT_STATS', () => {
    it('defines stats for every UnitType', () => {
      const expectedTypes = [
        'wall',
        'militia',
        'archer',
        'cleric',
        'knight',
        'goblin',
        'orc',
        'troll',
        'boss',
      ];
      for (const type of expectedTypes) {
        expect(UNIT_STATS).toHaveProperty(type);
      }
    });

    it('gives every unit positive maxHp', () => {
      for (const [, stats] of Object.entries(UNIT_STATS)) {
        expect(stats.maxHp).toBeGreaterThan(0);
      }
    });

    it('gives enemies a reward', () => {
      const enemies = ['goblin', 'orc', 'troll', 'boss'] as const;
      for (const type of enemies) {
        expect(UNIT_STATS[type].reward).toBeGreaterThan(0);
      }
    });

    it('marks only cleric as healer', () => {
      expect(UNIT_STATS.cleric.isHealer).toBe(true);
      const nonHealers = [
        'wall',
        'militia',
        'archer',
        'knight',
        'goblin',
        'orc',
        'troll',
        'boss',
      ] as const;
      for (const type of nonHealers) {
        expect(UNIT_STATS[type].isHealer).toBe(false);
      }
    });

    it('gives cleric negative damage (heal)', () => {
      expect(UNIT_STATS.cleric.damage).toBeLessThan(0);
    });

    it('gives wall zero speed', () => {
      expect(UNIT_STATS.wall.speed).toBe(0);
    });

    it('boss has the highest maxHp', () => {
      const allHps = Object.values(UNIT_STATS).map((s) => s.maxHp);
      expect(UNIT_STATS.boss.maxHp).toBe(Math.max(...allHps));
    });
  });

  describe('BUILDING_COST', () => {
    it('defines costs for all building types', () => {
      expect(BUILDING_COST).toHaveProperty('wall');
      expect(BUILDING_COST).toHaveProperty('hut');
      expect(BUILDING_COST).toHaveProperty('range');
      expect(BUILDING_COST).toHaveProperty('temple');
      expect(BUILDING_COST).toHaveProperty('keep');
    });

    it('has all positive costs', () => {
      for (const cost of Object.values(BUILDING_COST)) {
        expect(cost).toBeGreaterThan(0);
      }
    });

    it('wall is cheapest', () => {
      const costs = Object.values(BUILDING_COST);
      expect(BUILDING_COST.wall).toBe(Math.min(...costs));
    });
  });

  describe('BUILDING_SPAWN_INTERVAL', () => {
    it('wall has zero spawn interval (does not spawn)', () => {
      expect(BUILDING_SPAWN_INTERVAL.wall).toBe(0);
    });

    it('spawning buildings have positive intervals', () => {
      const spawners = ['hut', 'range', 'temple', 'keep'] as const;
      for (const type of spawners) {
        expect(BUILDING_SPAWN_INTERVAL[type]).toBeGreaterThan(0);
      }
    });
  });

  describe('BUILDING_SPAWNS', () => {
    it('maps hut → militia, range → archer, temple → cleric, keep → knight', () => {
      expect(BUILDING_SPAWNS.hut).toBe('militia');
      expect(BUILDING_SPAWNS.range).toBe('archer');
      expect(BUILDING_SPAWNS.temple).toBe('cleric');
      expect(BUILDING_SPAWNS.keep).toBe('knight');
    });

    it('does not map wall to any unit', () => {
      expect(BUILDING_SPAWNS.wall).toBeUndefined();
    });
  });

  describe('ENEMY_WAVE_TYPES', () => {
    it('contains goblin, orc, troll', () => {
      expect(ENEMY_WAVE_TYPES).toContain('goblin');
      expect(ENEMY_WAVE_TYPES).toContain('orc');
      expect(ENEMY_WAVE_TYPES).toContain('troll');
    });
  });

  describe('HP_SCALE_PER_WAVE', () => {
    it('is 0.15', () => {
      expect(HP_SCALE_PER_WAVE).toBe(0.15);
    });
  });
});
