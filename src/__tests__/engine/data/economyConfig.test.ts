import economyConfig from '../../../data/economyConfig.json';

describe('economyConfig', () => {
  it('has all required sections', () => {
    expect(economyConfig).toHaveProperty('startingResources');
    expect(economyConfig).toHaveProperty('cart');
    expect(economyConfig).toHaveProperty('deliveries');
    expect(economyConfig).toHaveProperty('coins');
  });

  describe('startingResources', () => {
    it('starts with 300 gold and 50 wood', () => {
      expect(economyConfig.startingResources.gold).toBe(300);
      expect(economyConfig.startingResources.wood).toBe(50);
    });

    it('starts with 0 ore and 0 gems', () => {
      expect(economyConfig.startingResources.ore).toBe(0);
      expect(economyConfig.startingResources.gem).toBe(0);
    });

    it('starts with 100 faith and 20 health', () => {
      expect(economyConfig.startingResources.faith).toBe(100);
      expect(economyConfig.startingResources.health).toBe(20);
    });
  });

  describe('cart', () => {
    it('base speed is 5, relic speed is 10', () => {
      expect(economyConfig.cart.speed).toBe(5);
      expect(economyConfig.cart.speedWithRelic).toBe(10);
    });
  });

  describe('deliveries', () => {
    it('wood delivers 10 per trip', () => {
      expect(economyConfig.deliveries.wood).toBe(10);
    });

    it('ore and gem deliver 1 per trip', () => {
      expect(economyConfig.deliveries.ore).toBe(1);
      expect(economyConfig.deliveries.gem).toBe(1);
    });
  });

  describe('coins', () => {
    it('victory multiplier is 25, defeat is 10', () => {
      expect(economyConfig.coins.victoryMultiplier).toBe(25);
      expect(economyConfig.coins.defeatMultiplier).toBe(10);
    });
  });
});
