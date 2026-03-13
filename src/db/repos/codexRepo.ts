/**
 * @module codexRepo
 *
 * Write operations for the bestiary / lore codex.
 * Entries are upserted so that discovering an already-known entry is a no-op
 * (the `discoveredAt` timestamp updates but no error is thrown).
 */
import { db } from '../client';
import { codexEntries } from '../schema';

/**
 * Marks a codex entry as discovered.  If the entry does not yet exist it is
 * inserted; if it already exists its `discovered` flag and timestamp are
 * updated via `onConflictDoUpdate`.
 *
 * @param entryId - Unique entry key, e.g. `"enemy:goblin"` or `"biome:kings-road"`.
 * @param category - Grouping category such as `"enemy"` or `"biome"`.
 */
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