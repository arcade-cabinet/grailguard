import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import { ensurePlayerProfile } from '../../../db/repos/profileRepo';
import {
  ensureUnlocks,
  purchaseSpellUnlockTransaction,
  purchaseUnlockTransaction,
} from '../../../db/repos/unlockRepo';
import { playerProfile } from '../../../db/schema';
import { BUILDINGS } from '../../../engine/constants';

/** Helper to read coins from the profile. */
async function getCoins(): Promise<number> {
  const row = await testDb.db.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
  return row?.coins ?? 0;
}

/** Helper to set coin balance directly. */
async function setCoins(amount: number) {
  await testDb.db
    .update(playerProfile)
    .set({ coins: amount, updatedAt: Date.now() })
    .where(eq(playerProfile.id, 1));
}

describe('unlockRepo', () => {
  beforeEach(async () => {
    testDb = createTestDb();
    await ensurePlayerProfile();
    await ensureUnlocks();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('ensureUnlocks', () => {
    it('seeds all building unlock rows', async () => {
      const { unlocks } = await import('../../../db/schema');
      const rows = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'building'))
        .all();

      // Should have one row per BuildingType
      expect(rows.length).toBe(Object.keys(BUILDINGS).length);
    });

    it('seeds all spell unlock rows', async () => {
      const { unlocks } = await import('../../../db/schema');
      const rows = await testDb.db.select().from(unlocks).where(eq(unlocks.domain, 'spell')).all();

      // 7 spells
      expect(rows.length).toBe(7);
    });

    it('marks default-unlocked buildings as unlocked', async () => {
      const { unlocks } = await import('../../../db/schema');
      const { and } = await import('drizzle-orm');

      const wall = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'wall')))
        .get();
      expect(wall!.unlocked).toBe(true);

      const hut = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'hut')))
        .get();
      expect(hut!.unlocked).toBe(true);

      const track = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'track')))
        .get();
      expect(track!.unlocked).toBe(true);
    });

    it('marks locked buildings as not unlocked', async () => {
      const { unlocks } = await import('../../../db/schema');
      const { and } = await import('drizzle-orm');

      const range = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'range')))
        .get();
      expect(range!.unlocked).toBe(false);
    });

    it('is idempotent -- running twice does not duplicate rows', async () => {
      await ensureUnlocks(); // second call

      const { unlocks } = await import('../../../db/schema');
      const rows = await testDb.db
        .select()
        .from(unlocks)
        .where(eq(unlocks.domain, 'building'))
        .all();
      expect(rows.length).toBe(Object.keys(BUILDINGS).length);
    });
  });

  describe('purchaseUnlockTransaction (buildings)', () => {
    it('deducts coins and marks building as unlocked', async () => {
      const cost = BUILDINGS.range.unlockCost;
      await setCoins(cost + 100);

      const result = await purchaseUnlockTransaction('range');
      expect(result).toBe(true);

      const coins = await getCoins();
      expect(coins).toBe(100);
    });

    it('returns false when player has insufficient coins', async () => {
      await setCoins(10); // range costs 50

      const result = await purchaseUnlockTransaction('range');
      expect(result).toBe(false);

      // Coins should be unchanged
      const coins = await getCoins();
      expect(coins).toBe(10);
    });

    it('returns false when building is already unlocked', async () => {
      const cost = BUILDINGS.range.unlockCost;
      await setCoins(cost * 3);

      const first = await purchaseUnlockTransaction('range');
      expect(first).toBe(true);

      const second = await purchaseUnlockTransaction('range');
      expect(second).toBe(false);

      // Only one deduction should have occurred
      const coins = await getCoins();
      expect(coins).toBe(cost * 3 - cost);
    });

    it('returns true immediately for zero-cost buildings (wall)', async () => {
      const result = await purchaseUnlockTransaction('wall');
      expect(result).toBe(true);
    });

    it('does not deduct coins for zero-cost buildings', async () => {
      await setCoins(100);
      await purchaseUnlockTransaction('wall');

      const coins = await getCoins();
      expect(coins).toBe(100);
    });

    it('handles exact-balance purchase', async () => {
      const cost = BUILDINGS.temple.unlockCost;
      await setCoins(cost);

      const result = await purchaseUnlockTransaction('temple');
      expect(result).toBe(true);

      const coins = await getCoins();
      expect(coins).toBe(0);
    });

    it('correctly sets unlockedAt timestamp on purchase', async () => {
      const { unlocks } = await import('../../../db/schema');
      const { and } = await import('drizzle-orm');

      const cost = BUILDINGS.range.unlockCost;
      await setCoins(cost);
      const before = Date.now();

      await purchaseUnlockTransaction('range');

      const row = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'range')))
        .get();

      expect(row!.unlocked).toBe(true);
      expect(row!.unlockedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('purchaseSpellUnlockTransaction (spells)', () => {
    it('deducts coins and marks spell as unlocked', async () => {
      await setCoins(500);

      const result = await purchaseSpellUnlockTransaction('holy_nova');
      expect(result).toBe(true);

      const coins = await getCoins();
      // holy_nova costs 200
      expect(coins).toBe(300);
    });

    it('returns false for insufficient coins', async () => {
      await setCoins(50);

      const result = await purchaseSpellUnlockTransaction('holy_nova');
      expect(result).toBe(false);

      const coins = await getCoins();
      expect(coins).toBe(50);
    });

    it('returns false when spell is already unlocked', async () => {
      await setCoins(1000);

      await purchaseSpellUnlockTransaction('holy_nova');
      const result = await purchaseSpellUnlockTransaction('holy_nova');
      expect(result).toBe(false);
    });

    it('separates spell unlocks from building unlocks', async () => {
      const { unlocks } = await import('../../../db/schema');
      const { and } = await import('drizzle-orm');

      await setCoins(1000);
      await purchaseSpellUnlockTransaction('holy_nova');

      // Spell should be unlocked
      const spell = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'spell'), eq(unlocks.itemId, 'holy_nova')))
        .get();
      expect(spell!.unlocked).toBe(true);

      // Building "range" should still be locked
      const building = await testDb.db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, 'range')))
        .get();
      expect(building!.unlocked).toBe(false);
    });

    it('handles higher-cost spells correctly', async () => {
      await setCoins(400);

      // meteor_strike costs 400
      const result = await purchaseSpellUnlockTransaction('meteor_strike');
      expect(result).toBe(true);

      const coins = await getCoins();
      expect(coins).toBe(0);
    });
  });
});
