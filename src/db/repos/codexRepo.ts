import { db } from '../client';
import { codexEntries } from '../schema';

export async function discoverCodexEntry(entryId: string, category: string): Promise<void> {
  const timestamp = Date.now();
  await db
    .insert(codexEntries)
    .values({
      entryId,
      category,
      discovered: true,
      discoveredAt: timestamp,
    })
    .onConflictDoUpdate({
      target: codexEntries.entryId,
      set: {
        category,
        discovered: true,
        discoveredAt: timestamp,
      },
    });
}