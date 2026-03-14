/**
 * Shared test helper: creates an in-memory SQLite database via better-sqlite3
 * and wraps it with Drizzle ORM, applying the full Grailguard schema.
 *
 * The Grailguard repo code was written for expo-sqlite's sync-mode Drizzle
 * adapter where `db.transaction(async (tx) => ...)` works because async
 * functions are resolved synchronously.  The better-sqlite3 adapter normally
 * rejects async callbacks, so we patch `db.transaction` to unwrap the
 * promise returned by async callbacks.
 *
 * Usage in test files:
 *   import { createTestDb, type TestDb } from '../testDb';
 *
 *   let testDb: TestDb;
 *   beforeEach(() => { testDb = createTestDb(); });
 *   afterEach(() => { testDb.close(); });
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../db/schema';

const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS player_profile (
    id INTEGER PRIMARY KEY NOT NULL,
    coins INTEGER NOT NULL DEFAULT 0,
    highest_wave INTEGER NOT NULL DEFAULT 0,
    lifetime_kills INTEGER NOT NULL DEFAULT 0,
    lifetime_runs INTEGER NOT NULL DEFAULT 0,
    current_theme TEXT NOT NULL DEFAULT 'holy-grail',
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY NOT NULL,
    preferred_speed REAL NOT NULL DEFAULT 1,
    auto_resume INTEGER NOT NULL DEFAULT 1,
    reduced_fx INTEGER NOT NULL DEFAULT 0,
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    music_enabled INTEGER NOT NULL DEFAULT 1,
    haptics_enabled INTEGER NOT NULL DEFAULT 1,
    camera_intensity REAL NOT NULL DEFAULT 1,
    theme TEXT NOT NULL DEFAULT 'holy-grail',
    tutorial_complete INTEGER NOT NULL DEFAULT 0,
    high_contrast INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS unlocks (
    domain TEXT NOT NULL,
    item_id TEXT NOT NULL,
    unlocked INTEGER NOT NULL DEFAULT 0,
    unlocked_at INTEGER,
    PRIMARY KEY(domain, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS doctrine_nodes (
    node_id TEXT PRIMARY KEY NOT NULL,
    unlocked INTEGER NOT NULL DEFAULT 0,
    unlocked_at INTEGER,
    level INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS codex_entries (
    entry_id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    discovered INTEGER NOT NULL DEFAULT 0,
    discovered_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS content_state (
    id INTEGER PRIMARY KEY NOT NULL,
    schema_version INTEGER NOT NULL,
    content_version TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS active_run (
    id TEXT PRIMARY KEY NOT NULL,
    snapshot_version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    phase TEXT NOT NULL,
    wave INTEGER NOT NULL,
    biome TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS run_history (
    run_id TEXT PRIMARY KEY NOT NULL,
    wave_reached INTEGER NOT NULL,
    coins_earned INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    biome TEXT NOT NULL DEFAULT 'kings-road',
    difficulty TEXT NOT NULL DEFAULT 'pilgrim',
    result TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export type TestDb = ReturnType<typeof createTestDb>;

/**
 * Creates a fresh in-memory SQLite database with all Grailguard tables.
 * Patches `db.transaction` to support async callbacks (which expo-sqlite
 * handles natively but better-sqlite3 rejects).
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');

  for (const stmt of MIGRATION_STATEMENTS) {
    sqlite.prepare(stmt).run();
  }

  const db = drizzle(sqlite, { schema }) as BetterSQLite3Database<typeof schema>;

  // Patch: the expo-sqlite Drizzle adapter runs transactions synchronously,
  // so `db.transaction(async (tx) => ...)` works because the awaited DB calls
  // resolve synchronously.  better-sqlite3 explicitly rejects async callbacks.
  // We wrap the native transaction to execute the callback within a manual
  // BEGIN/COMMIT and then await the (already-resolved) Promise.
  const origTransaction = db.transaction.bind(db);
  (db as unknown as Record<string, unknown>).transaction = async <T>(
    fn: (tx: unknown) => T | Promise<T>,
  ): Promise<T> => {
    // For sync callbacks, delegate to the original
    try {
      const result = origTransaction(((tx: unknown) => {
        const maybePromise = fn(tx);
        // If the callback returned a promise, the sync transaction will throw.
        // We handle this below in the catch block.
        if (maybePromise && typeof (maybePromise as Promise<T>).then === 'function') {
          throw Object.assign(new Error('__async_tx__'), { promise: maybePromise, tx });
        }
        return maybePromise;
      }) as (tx: unknown) => T);
      return result;
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'message' in e && (e as Error).message === '__async_tx__') {
        // Async callback path: run within manual BEGIN/COMMIT.
        // Since better-sqlite3 is synchronous and all awaits resolve
        // immediately, this works correctly for our test scenario.
        const asyncErr = e as Error & { promise: Promise<T>; tx: unknown };
        sqlite.prepare('BEGIN').run();
        try {
          const result = await asyncErr.promise;
          sqlite.prepare('COMMIT').run();
          return result;
        } catch (innerErr) {
          sqlite.prepare('ROLLBACK').run();
          throw innerErr;
        }
      }
      throw e;
    }
  };

  return {
    db,
    sqlite,
    close() {
      sqlite.close();
    },
  };
}
