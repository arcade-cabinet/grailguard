/**
 * @module bootstrapRepo
 *
 * First-launch seed logic.  Ensures that the player profile, settings,
 * building/spell unlocks, codex entries, doctrine nodes, and content-state
 * rows all exist with sensible defaults.  Every insert uses
 * `onConflictDoNothing` so the function is idempotent.
 */
import { db } from '../client';
import { codexEntries, contentState, doctrineNodes } from '../schema';
import { now } from '../utils/time';
import { ensurePlayerProfile } from './profileRepo';
import { ensureSettings } from './settingsRepo';
import { ensureUnlocks } from './unlockRepo';

const DEFAULT_CODEX = [
  ['enemy:goblin', 'enemy'],
  ['enemy:orc', 'enemy'],
  ['enemy:troll', 'enemy'],
  ['enemy:boss', 'enemy'],
  ['biome:kings-road', 'biome'],
] as const;

const DEFAULT_DOCTRINES = [
  'crown_tithe',
  'faithward',
  'iron_vanguard',
  'tax_collection',
  'masonry',
] as const;

/**
 * Idempotently inserts all default rows required for a new installation:
 * player profile, settings, building/spell unlocks, starter codex entries,
 * starter doctrine nodes, and content-state metadata.
 *
 * Called automatically by {@link ../DatabaseProvider.tsx} after migrations
 * complete.
 */
export async function ensureSeedData() {
  await Promise.all([ensurePlayerProfile(), ensureSettings(), ensureUnlocks()]);

  const codexInserts = DEFAULT_CODEX.map(([entryId, category]) =>
    db
      .insert(codexEntries)
      .values({
        entryId,
        category,
        discovered: false,
        discoveredAt: null,
      })
      .onConflictDoNothing(),
  );

  const doctrineInserts = DEFAULT_DOCTRINES.map((nodeId) =>
    db
      .insert(doctrineNodes)
      .values({
        nodeId,
        unlocked: false,
        unlockedAt: null,
      })
      .onConflictDoNothing(),
  );

  const contentInsert = db
    .insert(contentState)
    .values({
      id: 1,
      schemaVersion: 1,
      contentVersion: '0.1.0',
      updatedAt: now(),
    })
    .onConflictDoNothing();

  await Promise.all([...codexInserts, ...doctrineInserts, contentInsert]);
}
