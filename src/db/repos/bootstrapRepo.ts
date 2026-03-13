import { db } from '../client';
import { codexEntries, contentState, doctrineNodes } from '../schema';
import { ensurePlayerProfile } from './profileRepo';
import { ensureSettings } from './settingsRepo';
import { ensureUnlocks } from './unlockRepo';

function now() {
  return Date.now();
}

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
  await ensurePlayerProfile();
  await ensureSettings();
  await ensureUnlocks();

  for (const [entryId, category] of DEFAULT_CODEX) {
    await db
      .insert(codexEntries)
      .values({
        entryId,
        category,
        discovered: false,
        discoveredAt: null,
      })
      .onConflictDoNothing();
  }

  for (const nodeId of DEFAULT_DOCTRINES) {
    await db
      .insert(doctrineNodes)
      .values({
        nodeId,
        unlocked: false,
        unlockedAt: null,
      })
      .onConflictDoNothing();
  }

  await db
    .insert(contentState)
    .values({
      id: 1,
      schemaVersion: 1,
      contentVersion: '0.1.0',
      updatedAt: now(),
    })
    .onConflictDoNothing();
}
