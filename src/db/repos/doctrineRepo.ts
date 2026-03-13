import { eq } from 'drizzle-orm';
import { db } from '../client';
import { doctrineNodes, playerProfile } from '../schema';

function now() {
  return Date.now();
}

export async function purchaseDoctrineNode(input: { nodeId: string; cost: number }) {
  return db.transaction(async (tx) => {
    const profile = await tx.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
    const node = await tx
      .select()
      .from(doctrineNodes)
      .where(eq(doctrineNodes.nodeId, input.nodeId))
      .get();

    if (!profile || !node || node.level >= 5 || profile.coins < input.cost) {
      return false;
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

    return true;
  });
}
