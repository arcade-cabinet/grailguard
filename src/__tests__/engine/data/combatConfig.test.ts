import combatConfig from '../../../data/combatConfig.json';

describe('combatConfig', () => {
  it('has all required keys', () => {
    const requiredKeys = [
      'meleeSearchRange',
      'rangedSearchRange',
      'wallPriorityRange',
      'poisonDamageRate',
      'poisonDecayRate',
      'freezeDecayRate',
      'slowDuration',
      'bossAoeRadius',
      'vampiricHealPercent',
      'armoredDamageReduction',
      'swiftSpeedMultiplier',
      'swiftCooldownMultiplier',
      'explosiveAoeDamage',
      'explosiveAoeRadius',
      'sellValuePercent',
      'regeneratingHpPerSec',
      'invulnerabilityDuration',
      'poisonAmount',
    ];
    for (const key of requiredKeys) {
      expect(combatConfig).toHaveProperty(key);
    }
  });

  it('ranged search range is larger than melee', () => {
    expect(combatConfig.rangedSearchRange).toBeGreaterThan(combatConfig.meleeSearchRange);
  });

  it('has correct search ranges', () => {
    expect(combatConfig.meleeSearchRange).toBe(8);
    expect(combatConfig.rangedSearchRange).toBe(25);
  });

  it('has correct affix values', () => {
    expect(combatConfig.swiftSpeedMultiplier).toBe(2);
    expect(combatConfig.swiftCooldownMultiplier).toBe(0.5);
    expect(combatConfig.armoredDamageReduction).toBe(0.5);
    expect(combatConfig.vampiricHealPercent).toBe(0.5);
    expect(combatConfig.regeneratingHpPerSec).toBe(2);
    expect(combatConfig.explosiveAoeDamage).toBe(50);
    expect(combatConfig.explosiveAoeRadius).toBe(6);
  });

  it('has correct status effect values', () => {
    expect(combatConfig.poisonDamageRate).toBe(0.2);
    expect(combatConfig.poisonDecayRate).toBe(2);
    expect(combatConfig.poisonAmount).toBe(10);
    expect(combatConfig.freezeDecayRate).toBe(1);
    expect(combatConfig.slowDuration).toBe(3);
    expect(combatConfig.invulnerabilityDuration).toBe(5);
  });

  it('sell value is 50%', () => {
    expect(combatConfig.sellValuePercent).toBe(0.5);
  });

  it('all values are numbers', () => {
    for (const value of Object.values(combatConfig)) {
      expect(typeof value).toBe('number');
    }
  });
});
