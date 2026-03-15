/**
 * @module client
 *
 * Opens the local SQLite database (`grailguard.db`) via sql.js (WASM)
 * and wraps it with Drizzle ORM. On web, sql.js runs SQLite in WASM
 * without requiring COEP/COOP headers (unlike expo-sqlite).
 *
 * The database is persisted to localStorage on every write and
 * restored from localStorage on startup.
 *
 * ## Future: @capacitor-community/sqlite migration
 *
 * `@capacitor-community/sqlite` is installed as a dependency. On native
 * Capacitor platforms (iOS/Android) it provides a native SQLite driver
 * via `CapacitorSQLite.open()`, `.execute()`, `.query()`, `.close()`.
 * On web it uses sql.js internally, so behavior is equivalent.
 *
 * Currently we use the sql.js Drizzle adapter directly for simplicity.
 * Migrating to the capacitor-sqlite API is a future optimization that
 * will unlock native SQLite performance on iOS/Android while keeping
 * web parity via its built-in sql.js fallback.
 */
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { type Database } from 'sql.js';
import * as schema from './schema';

const DB_STORAGE_KEY = 'grailguard-db';

let sqliteDb: Database | null = null;
let drizzleInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize the sql.js database. Must be called once before accessing `db`.
 * Restores data from localStorage if available.
 */
export async function initDatabase(): Promise<void> {
  if (sqliteDb) return;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `${import.meta.env.BASE_URL}${file}`,
  });

  // Try to restore from localStorage
  const savedData = localStorage.getItem(DB_STORAGE_KEY);
  if (savedData) {
    const uint8Array = new Uint8Array(
      atob(savedData)
        .split('')
        .map((c) => c.charCodeAt(0)),
    );
    sqliteDb = new SQL.Database(uint8Array);
  } else {
    sqliteDb = new SQL.Database();
  }

  drizzleInstance = drizzle(sqliteDb, { schema });
}

/**
 * Persist the current database state to localStorage.
 * Call this after any write operation.
 */
export function persistDatabase(): void {
  if (!sqliteDb) return;
  const data = sqliteDb.export();
  const binary = String.fromCharCode(...data);
  localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
}

/**
 * Get the raw sql.js database handle.
 * Throws if `initDatabase()` has not been called.
 */
export function getSqlite(): Database {
  if (!sqliteDb) throw new Error('Database not initialized. Call initDatabase() first.');
  return sqliteDb;
}

/**
 * Drizzle ORM instance bound to the full schema.
 * This is a proxy that lazily accesses the initialized instance.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!drizzleInstance) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return (drizzleInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});
