import buildingConfig from '../../../data/buildingConfig.json';

describe('buildingConfig', () => {
  const { buildings, upgradeCostMultiplier, spawnRateMultiplier, statMultiplier } = buildingConfig;

  it('has upgrade/spawn/stat multipliers', () => {
    expect(upgradeCostMultiplier).toBe(1.5);
    expect(spawnRateMultiplier).toBe(0.8);
    expect(statMultiplier).toBe(1.3);
  });

  it('has all expected building types', () => {
    const expectedTypes = [
      'wall', 'hut', 'range', 'temple', 'keep', 'sentry', 'obelisk',
      'lumber', 'mine_ore', 'mine_gem', 'track', 'mint', 'catapult',
      'sorcerer', 'vault',
    ];
    for (const type of expectedTypes) {
      expect(buildings).toHaveProperty(type);
    }
  });

  it('each building has required fields', () => {
    const requiredFields = ['cost', 'unlockCost', 'isBuilding', 'icon', 'name', 'role', 'stats', 'spawnTime', 'color'];
    for (const [, building] of Object.entries(buildings)) {
      for (const field of requiredFields) {
        expect(building).toHaveProperty(field);
      }
    }
  });

  it('turrets have range, damage, and atkSpd', () => {
    const turretTypes = ['sentry', 'obelisk', 'catapult', 'sorcerer'] as const;
    for (const type of turretTypes) {
      const building = buildings[type];
      expect(building.isTurret).toBe(true);
      expect(building.range).toBeGreaterThan(0);
      expect(building.damage).toBeGreaterThan(0);
      expect(building.atkSpd).toBeGreaterThan(0);
    }
  });

  it('wall and track are not buildings (isBuilding = false)', () => {
    expect(buildings.wall.isBuilding).toBe(false);
    expect(buildings.track.isBuilding).toBe(false);
  });

  it('hut costs 50 gold and spawns militia', () => {
    expect(buildings.hut.cost).toBe(50);
    expect(buildings.hut.unit).toBe('militia');
  });

  it('sentry has range 20, damage 15, atkSpd 1.0', () => {
    expect(buildings.sentry.range).toBe(20);
    expect(buildings.sentry.damage).toBe(15);
    expect(buildings.sentry.atkSpd).toBe(1.0);
  });

  it('catapult has the longest range', () => {
    expect(buildings.catapult.range).toBe(30);
  });

  it('mint has oreCost', () => {
    expect(buildings.mint.oreCost).toBe(10);
  });

  it('sorcerer has gemCost', () => {
    expect(buildings.sorcerer.gemCost).toBe(5);
  });
});
