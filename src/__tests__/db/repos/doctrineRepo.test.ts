import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

jest.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import { purchaseDoctrineNode } from '../../../db/repos/doctrineRepo';
import { ensurePlayerProfile } from '../../../db/repos/profileRepo';
import { doctrineNodes, playerProfile } from '../../../db/schema';

/** Seed a doctrine node at a given starting level. */
async function seedDoctrineNode(nodeId: string, level = 0) {
  await testDb.db
    .insert(doctrineNodes)
    .values({ nodeId, level, unlocked: level > 0, unlockedAt: level > 0 ? Date.now() : null })
    .onConflictDoNothing();
}

/** Helper to read coins. */
async function getCoins(): Promise<number> {
  const row = await testDb.db.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
  return row?.coins ?? 0;
}

/** Helper to set coins. */
async function setCoins(amount: number) {
  await testDb.db
    .update(playerProfile)
    .set({ coins: amount, updatedAt: Date.now() })
    .where(eq(playerProfile.id, 1));
}

/** Helper to read a doctrine node. */
async function getNode(nodeId: string) {
  return testDb.db.select().from(doctrineNodes).where(eq(doctrineNodes.nodeId, nodeId)).get();
}

describe('doctrineRepo', () => {
  beforeEach(async () => {
    testDb = createTestDb();
    await ensurePlayerProfile();
    await seedDoctrineNode('crown_tithe');
    await seedDoctrineNode('faithward');
    await seedDoctrineNode('iron_vanguard');
  });

  afterEach(() => {
    testDb.close();
  });

  describe('purchaseDoctrineNode', () => {
    it('levels up a node from 0 to 1 and deducts coins', async () => {
      await setCoins(100);

      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 50 });
      expect(result).toEqual({ success: true });

      const node = await getNode('crown_tithe');
      expect(node!.level).toBe(1);
      expect(node!.unlocked).toBe(true);
      expect(node!.unlockedAt).toBeDefined();

      const coins = await getCoins();
      expect(coins).toBe(50);
    });

    it('levels up from 1 to 2', async () => {
      await setCoins(200);

      await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 50 });
      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 75 });
      expect(result).toEqual({ success: true });

      const node = await getNode('crown_tithe');
      expect(node!.level).toBe(2);

      const coins = await getCoins();
      expect(coins).toBe(75); // 200 - 50 - 75
    });

    it('can level up to max level 5', async () => {
      await setCoins(10000);

      for (let i = 0; i < 5; i++) {
        const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });
        expect(result).toEqual({ success: true });
      }

      const node = await getNode('crown_tithe');
      expect(node!.level).toBe(5);
    });

    it('returns failure when node is at max level (5)', async () => {
      await setCoins(10000);

      // Level up to 5
      for (let i = 0; i < 5; i++) {
        await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });
      }

      // Attempt level 6
      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });
      expect(result).toEqual({ success: false, reason: 'max_level_reached' });

      const node = await getNode('crown_tithe');
      expect(node!.level).toBe(5);
    });

    it('returns failure when coins are insufficient', async () => {
      await setCoins(30);

      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 50 });
      expect(result).toEqual({ success: false, reason: 'insufficient_coins' });

      const node = await getNode('crown_tithe');
      expect(node!.level).toBe(0);

      const coins = await getCoins();
      expect(coins).toBe(30); // unchanged
    });

    it('returns failure when node does not exist', async () => {
      await setCoins(500);

      const result = await purchaseDoctrineNode({ nodeId: 'nonexistent_node', cost: 50 });
      expect(result).toEqual({ success: false, reason: 'node_not_found' });
    });

    it('returns failure when profile does not exist', async () => {
      // Delete the profile
      await testDb.db.delete(playerProfile).where(eq(playerProfile.id, 1));

      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 50 });
      expect(result).toEqual({ success: false, reason: 'profile_not_found' });
    });

    it('does not deduct coins when level is maxed', async () => {
      await setCoins(10000);

      for (let i = 0; i < 5; i++) {
        await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });
      }
      const coinsAfterMax = await getCoins();

      await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });
      const coinsAfterAttempt = await getCoins();

      expect(coinsAfterAttempt).toBe(coinsAfterMax);
    });

    it('handles exact-balance purchase', async () => {
      await setCoins(75);

      const result = await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 75 });
      expect(result).toEqual({ success: true });

      const coins = await getCoins();
      expect(coins).toBe(0);
    });

    it('does not affect other nodes when leveling one', async () => {
      await setCoins(500);

      await purchaseDoctrineNode({ nodeId: 'crown_tithe', cost: 100 });

      const faithward = await getNode('faithward');
      expect(faithward!.level).toBe(0);
      expect(faithward!.unlocked).toBe(false);
    });
  });
});
