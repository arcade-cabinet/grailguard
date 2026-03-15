import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

// Must import after mock registration
import {
  awardCoins,
  ensurePlayerProfile,
  loadPlayerProfile,
  updatePlayerProfileStats,
} from '../../../db/repos/profileRepo';

describe('profileRepo', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('ensurePlayerProfile', () => {
    it('creates a default profile with zero balances', async () => {
      await ensurePlayerProfile();
      const profile = await loadPlayerProfile();

      expect(profile).toBeDefined();
      expect(profile!.id).toBe(1);
      expect(profile!.coins).toBe(0);
      expect(profile!.highestWave).toBe(0);
      expect(profile!.lifetimeKills).toBe(0);
      expect(profile!.lifetimeRuns).toBe(0);
      expect(profile!.currentTheme).toBe('holy-grail');
    });

    it('is idempotent -- second call does not overwrite existing profile', async () => {
      await ensurePlayerProfile();
      await awardCoins(100);
      await ensurePlayerProfile(); // second call

      const profile = await loadPlayerProfile();
      expect(profile!.coins).toBe(100);
    });
  });

  describe('loadPlayerProfile', () => {
    it('returns undefined when no profile exists', async () => {
      const profile = await loadPlayerProfile();
      expect(profile).toBeUndefined();
    });
  });

  describe('awardCoins', () => {
    it('adds coins to the balance', async () => {
      await ensurePlayerProfile();
      await awardCoins(50);

      const profile = await loadPlayerProfile();
      expect(profile!.coins).toBe(50);
    });

    it('accumulates multiple awards', async () => {
      await ensurePlayerProfile();
      await awardCoins(30);
      await awardCoins(20);
      await awardCoins(10);

      const profile = await loadPlayerProfile();
      expect(profile!.coins).toBe(60);
    });

    it('allows zero-coin awards (no-op on balance)', async () => {
      await ensurePlayerProfile();
      await awardCoins(50);
      await awardCoins(0);

      const profile = await loadPlayerProfile();
      expect(profile!.coins).toBe(50);
    });

    it('allows negative amounts (coin deduction)', async () => {
      await ensurePlayerProfile();
      await awardCoins(100);
      await awardCoins(-30);

      const profile = await loadPlayerProfile();
      expect(profile!.coins).toBe(70);
    });

    it('no-ops when profile does not exist', async () => {
      // Should not throw
      await awardCoins(100);
      const profile = await loadPlayerProfile();
      expect(profile).toBeUndefined();
    });

    it('updates the updatedAt timestamp', async () => {
      await ensurePlayerProfile();
      const before = (await loadPlayerProfile())!.updatedAt;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 5));
      await awardCoins(10);

      const after = (await loadPlayerProfile())!.updatedAt;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('updatePlayerProfileStats', () => {
    beforeEach(async () => {
      await ensurePlayerProfile();
    });

    it('updates highest wave when new value is higher', async () => {
      await updatePlayerProfileStats({ highestWave: 5 });
      let profile = await loadPlayerProfile();
      expect(profile!.highestWave).toBe(5);

      await updatePlayerProfileStats({ highestWave: 10 });
      profile = await loadPlayerProfile();
      expect(profile!.highestWave).toBe(10);
    });

    it('does NOT update highest wave when new value is lower', async () => {
      await updatePlayerProfileStats({ highestWave: 10 });
      await updatePlayerProfileStats({ highestWave: 3 });

      const profile = await loadPlayerProfile();
      expect(profile!.highestWave).toBe(10);
    });

    it('accumulates lifetime kills via delta', async () => {
      await updatePlayerProfileStats({ lifetimeKillsDelta: 42 });
      await updatePlayerProfileStats({ lifetimeKillsDelta: 18 });

      const profile = await loadPlayerProfile();
      expect(profile!.lifetimeKills).toBe(60);
    });

    it('accumulates lifetime runs via delta', async () => {
      await updatePlayerProfileStats({ lifetimeRunsDelta: 1 });
      await updatePlayerProfileStats({ lifetimeRunsDelta: 1 });
      await updatePlayerProfileStats({ lifetimeRunsDelta: 1 });

      const profile = await loadPlayerProfile();
      expect(profile!.lifetimeRuns).toBe(3);
    });

    it('updates current theme when provided', async () => {
      await updatePlayerProfileStats({ currentTheme: 'dark-souls' });
      const profile = await loadPlayerProfile();
      expect(profile!.currentTheme).toBe('dark-souls');
    });

    it('leaves theme unchanged when not provided', async () => {
      await updatePlayerProfileStats({ highestWave: 5 });
      const profile = await loadPlayerProfile();
      expect(profile!.currentTheme).toBe('holy-grail');
    });

    it('handles empty patch (no fields provided)', async () => {
      await updatePlayerProfileStats({});
      const profile = await loadPlayerProfile();
      expect(profile!.highestWave).toBe(0);
      expect(profile!.lifetimeKills).toBe(0);
      expect(profile!.lifetimeRuns).toBe(0);
    });

    it('no-ops when profile does not exist', async () => {
      // Create a fresh db without profile
      testDb.close();
      testDb = createTestDb();

      await updatePlayerProfileStats({ highestWave: 10 });
      const profile = await loadPlayerProfile();
      expect(profile).toBeUndefined();
    });

    it('applies multiple stat fields simultaneously', async () => {
      await updatePlayerProfileStats({
        highestWave: 7,
        lifetimeKillsDelta: 50,
        lifetimeRunsDelta: 1,
        currentTheme: 'castle',
      });

      const profile = await loadPlayerProfile();
      expect(profile!.highestWave).toBe(7);
      expect(profile!.lifetimeKills).toBe(50);
      expect(profile!.lifetimeRuns).toBe(1);
      expect(profile!.currentTheme).toBe('castle');
    });
  });
});
