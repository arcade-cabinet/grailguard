import { db } from '../client';
import { codexEntries, contentState, doctrineNodes } from '../schema';
import { ensurePlayerProfile } from './profileRepo';
import { ensureSettings } from './settingsRepo';
import { ensureUnlocks } from './unlockRepo';
import { now } from '../utils/time';

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
      .onConflictDoNothing()
  );

  const doctrineInserts = DEFAULT_DOCTRINES.map((nodeId) =>
    db
      .insert(doctrineNodes)
      .values({
        nodeId,
        unlocked: false,
        unlockedAt: null,
      })
      .onConflictDoNothing()
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