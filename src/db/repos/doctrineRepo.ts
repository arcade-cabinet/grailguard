import { eq } from 'drizzle-orm';
import { db } from '../client';
import { doctrineNodes, playerProfile } from '../schema';
import { now } from '../utils/time';

export async function purchaseDoctrineNode(input: {
  nodeId: string;
  cost: number;
}): Promise<{ success: true } | { success: false; reason: string }> {
  return db.transaction(async (tx) => {
    const profile = await tx.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
    const node = await tx
      .select()
      .from(doctrineNodes)
      .where(eq(doctrineNodes.nodeId, input.nodeId))
      .get();

    if (!profile) {
      return { success: false, reason: 'profile_not_found' };
    }
    if (!node) {
      return { success: false, reason: 'node_not_found' };
    }
    if (node.level >= 5) {
      return { success: false, reason: 'max_level_reached' };
    }
    if (profile.coins < input.cost) {
      return { success: false, reason: 'insufficient_coins' };
    }

    await tx
      .update(playerProfile)
      .set({
        coins: profile.coins - input.cost,
        updatedAt: now(),
      })
      .where(eq(playerProfile.id, 1));

    await tx
      .update(doctrineNodes)
      .set({
        level: node.level + 1,
        unlocked: true,
        unlockedAt: now(),
      })
      .where(eq(doctrineNodes.nodeId, input.nodeId));

    return { success: true };
  });
}