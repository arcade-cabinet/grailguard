import unitConfig from '../../../data/unitConfig.json';

describe('unitConfig', () => {
  const { units, waveScalingMultiplier } = unitConfig;

  it('has waveScalingMultiplier of 0.15', () => {
    expect(waveScalingMultiplier).toBe(0.15);
  });

  it('has all expected unit types', () => {
    const expectedTypes = ['wall', 'militia', 'archer', 'cleric', 'knight', 'goblin', 'orc', 'troll', 'boss'];
    for (const type of expectedTypes) {
      expect(units).toHaveProperty(type);
    }
  });

  it('ally units do not have cost or reward', () => {
    const allyTypes = ['wall', 'militia', 'archer', 'cleric', 'knight'] as const;
    for (const type of allyTypes) {
      const unit = units[type] as Record<string, unknown>;
      expect(unit.cost).toBeUndefined();
      expect(unit.reward).toBeUndefined();
    }
  });

  it('enemy units have cost and reward', () => {
    const enemyTypes = ['goblin', 'orc', 'troll', 'boss'] as const;
    for (const type of enemyTypes) {
      const unit = units[type];
      expect(unit.cost).toBeGreaterThan(0);
      expect(unit.reward).toBeGreaterThan(0);
    }
  });

  it('wall has zero speed and damage', () => {
    expect(units.wall.speed).toBe(0);
    expect(units.wall.damage).toBe(0);
  });

  it('cleric has negative damage (healing)', () => {
    expect(units.cleric.damage).toBeLessThan(0);
    expect(units.cleric.isHealer).toBe(true);
  });

  it('boss has the highest HP and scale', () => {
    for (const [type, unit] of Object.entries(units)) {
      if (type !== 'boss') {
        expect(units.boss.hp).toBeGreaterThan(unit.hp);
        expect(units.boss.scale).toBeGreaterThanOrEqual(unit.scale);
      }
    }
  });

  it('each unit has required stat fields', () => {
    const requiredFields = ['hp', 'speed', 'damage', 'range', 'atkSpd', 'isRanged', 'isHealer', 'color', 'scale'];
    for (const [, unit] of Object.entries(units)) {
      for (const field of requiredFields) {
        expect(unit).toHaveProperty(field);
      }
    }
  });

  it('goblin costs 5 budget and rewards 2 gold', () => {
    expect(units.goblin.cost).toBe(5);
    expect(units.goblin.reward).toBe(2);
  });

  it('boss costs 150 budget and rewards 50 gold', () => {
    expect(units.boss.cost).toBe(150);
    expect(units.boss.reward).toBe(50);
  });
});
