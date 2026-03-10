/**
 * Unit tests for useMetaStore.
 *
 * The store uses zustand/persist with AsyncStorage. In a Node/Jest environment
 * AsyncStorage is not available, so we test the store's synchronous behaviour
 * only (persist middleware gracefully falls back).
 */
import { useMetaStore } from '../../store/useMetaStore';

// Reset store before each test
beforeEach(() => {
  useMetaStore.getState().resetMeta();
});

describe('useMetaStore', () => {
  describe('initial state', () => {
    it('starts with 0 coins', () => {
      expect(useMetaStore.getState().coins).toBe(0);
    });

    it('wall and hut are unlocked by default', () => {
      const { unlocks } = useMetaStore.getState();
      expect(unlocks.wall).toBe(true);
      expect(unlocks.hut).toBe(true);
    });

    it('range, temple, keep are locked by default', () => {
      const { unlocks } = useMetaStore.getState();
      expect(unlocks.range).toBe(false);
      expect(unlocks.temple).toBe(false);
      expect(unlocks.keep).toBe(false);
    });
  });

  describe('awardCoins', () => {
    it('increases coins', () => {
      useMetaStore.getState().awardCoins(50);
      expect(useMetaStore.getState().coins).toBe(50);
    });

    it('accumulates across multiple awards', () => {
      useMetaStore.getState().awardCoins(30);
      useMetaStore.getState().awardCoins(20);
      expect(useMetaStore.getState().coins).toBe(50);
    });
  });

  describe('unlockBuilding', () => {
    it('unlocks a building when enough coins', () => {
      useMetaStore.getState().awardCoins(200);
      const result = useMetaStore.getState().unlockBuilding('range', 100);
      expect(result).toBe(true);
      expect(useMetaStore.getState().unlocks.range).toBe(true);
      expect(useMetaStore.getState().coins).toBe(100);
    });

    it('fails when not enough coins', () => {
      useMetaStore.getState().awardCoins(10);
      const result = useMetaStore.getState().unlockBuilding('range', 100);
      expect(result).toBe(false);
      expect(useMetaStore.getState().unlocks.range).toBe(false);
      expect(useMetaStore.getState().coins).toBe(10);
    });

    it('returns true without spending if already unlocked', () => {
      useMetaStore.getState().awardCoins(200);
      useMetaStore.getState().unlockBuilding('range', 100);
      const coinsBefore = useMetaStore.getState().coins;
      const result = useMetaStore.getState().unlockBuilding('range', 100);
      expect(result).toBe(true);
      expect(useMetaStore.getState().coins).toBe(coinsBefore);
    });

    it('returns true for default-unlocked buildings', () => {
      const result = useMetaStore.getState().unlockBuilding('wall', 25);
      expect(result).toBe(true);
    });
  });

  describe('resetMeta', () => {
    it('resets coins and unlocks to defaults', () => {
      useMetaStore.getState().awardCoins(500);
      useMetaStore.getState().unlockBuilding('range', 100);
      useMetaStore.getState().resetMeta();

      const state = useMetaStore.getState();
      expect(state.coins).toBe(0);
      expect(state.unlocks.range).toBe(false);
      expect(state.unlocks.wall).toBe(true);
      expect(state.unlocks.hut).toBe(true);
    });
  });
});
