import spellConfig from '../../../data/spellConfig.json';

describe('spellConfig', () => {
  const { spells } = spellConfig;

  it('has all seven spells', () => {
    const expectedSpells = [
      'smite',
      'holy_nova',
      'zealous_haste',
      'earthquake',
      'chrono_shift',
      'meteor_strike',
      'divine_shield',
    ];
    for (const spell of expectedSpells) {
      expect(spells).toHaveProperty(spell);
    }
  });

  it('each spell has name, faithCost, cooldown, and unlockCost', () => {
    for (const [, spell] of Object.entries(spells)) {
      expect(spell).toHaveProperty('name');
      expect(spell).toHaveProperty('faithCost');
      expect(spell).toHaveProperty('cooldown');
      expect(spell).toHaveProperty('unlockCost');
    }
  });

  it('smite is free to unlock', () => {
    expect(spells.smite.unlockCost).toBe(0);
  });

  it('smite does 300 damage to 3 targets', () => {
    expect(spells.smite.damage).toBe(300);
    expect(spells.smite.targets).toBe(3);
  });

  it('meteor_strike costs 35 faith and deals 400 damage', () => {
    expect(spells.meteor_strike.faithCost).toBe(35);
    expect(spells.meteor_strike.damage).toBe(400);
  });

  it('divine_shield costs 40 faith and lasts 5 seconds', () => {
    expect(spells.divine_shield.faithCost).toBe(40);
    expect(spells.divine_shield.duration).toBe(5);
  });

  it('chrono_shift costs 50 faith and freezes for 4 seconds', () => {
    expect(spells.chrono_shift.faithCost).toBe(50);
    expect(spells.chrono_shift.freezeDuration).toBe(4);
  });

  it('holy_nova heals for 50', () => {
    expect(spells.holy_nova.healAmount).toBe(50);
  });

  it('earthquake does 20 damage and stuns for 3 seconds', () => {
    expect(spells.earthquake.damage).toBe(20);
    expect(spells.earthquake.stunDuration).toBe(3);
  });

  it('all faith costs are positive numbers', () => {
    for (const [, spell] of Object.entries(spells)) {
      expect(spell.faithCost).toBeGreaterThan(0);
    }
  });

  it('all cooldowns are positive numbers', () => {
    for (const [, spell] of Object.entries(spells)) {
      expect(spell.cooldown).toBeGreaterThan(0);
    }
  });
});
