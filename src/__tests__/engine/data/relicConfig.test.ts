import relicConfig from '../../../data/relicConfig.json';

describe('relicConfig', () => {
  const { relics } = relicConfig;

  it('has all expected relics', () => {
    const expectedRelics = [
      'venomous_fletching',
      'martyrs_blood',
      'golden_age',
      'crystal_lens',
      'miners_lantern',
      'iron_tracks',
      'blessed_pickaxe',
      'war_horn',
    ];
    for (const relic of expectedRelics) {
      expect(relics).toHaveProperty(relic);
    }
  });

  it('each relic has name and description', () => {
    for (const [, relic] of Object.entries(relics)) {
      expect(relic).toHaveProperty('name');
      expect(relic).toHaveProperty('description');
      expect(typeof relic.name).toBe('string');
      expect(typeof relic.description).toBe('string');
      expect(relic.name.length).toBeGreaterThan(0);
      expect(relic.description.length).toBeGreaterThan(0);
    }
  });

  it('has exactly 8 relics', () => {
    expect(Object.keys(relics)).toHaveLength(8);
  });
});
