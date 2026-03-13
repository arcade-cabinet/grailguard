import doctrineConfig from '../../../data/doctrineConfig.json';

describe('doctrineConfig', () => {
  const { doctrines, maxLevel } = doctrineConfig;

  it('maxLevel is 5', () => {
    expect(maxLevel).toBe(5);
  });

  it('has all expected doctrines', () => {
    const expectedDoctrines = [
      'crown_tithe', 'faithward', 'iron_vanguard', 'tax_collection', 'masonry',
    ];
    for (const doctrine of expectedDoctrines) {
      expect(doctrines).toHaveProperty(doctrine);
    }
  });

  it('each doctrine has required fields', () => {
    for (const [, doctrine] of Object.entries(doctrines)) {
      expect(doctrine).toHaveProperty('title');
      expect(doctrine).toHaveProperty('description');
      expect(doctrine).toHaveProperty('baseCost');
      expect(doctrine).toHaveProperty('effect');
      expect(doctrine).toHaveProperty('bonusPerLevel');
    }
  });

  it('crown_tithe gives +50 gold per level', () => {
    expect(doctrines.crown_tithe.bonusPerLevel).toBe(50);
    expect(doctrines.crown_tithe.effect).toBe('startingGold');
  });

  it('faithward gives +25% health per level', () => {
    expect(doctrines.faithward.bonusPerLevel).toBe(0.25);
    expect(doctrines.faithward.effect).toBe('startingHealth');
  });

  it('iron_vanguard gives +10% melee HP per level', () => {
    expect(doctrines.iron_vanguard.bonusPerLevel).toBe(0.1);
    expect(doctrines.iron_vanguard.effect).toBe('meleeHpBonus');
  });

  it('all base costs are positive', () => {
    for (const [, doctrine] of Object.entries(doctrines)) {
      expect(doctrine.baseCost).toBeGreaterThan(0);
    }
  });
});
