/**
 * @module client
 *
 * Opens the local SQLite database (`grailguard.db`) via expo-sqlite and
 * wraps it with Drizzle ORM. On native, initialization is eager (no
 * COEP concerns). On web, initialization is lazy via `initDatabase()`
 * to avoid SharedArrayBuffer checks during bundle parse.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import * as schema from './schema';

/** Raw expo-sqlite database handle. */
export const sqlite = SQLite.openDatabaseSync('grailguard.db', {
  enableChangeListener: true,
});

/** Drizzle ORM instance bound to the full schema. */
export const db = drizzle(sqlite, { schema });

/**
 * No-op on native. On web, this would need to be an async dynamic
 * import — but for now web support is handled by the COI service
 * worker and COEP headers at the HTTP level.
 */
export async function initDatabase(): Promise<void> {
  // On native, db is already initialized eagerly above.
  // On web, the COEP headers + COI service worker handle SharedArrayBuffer.
  // This function exists as a lifecycle hook for DatabaseProvider.
}
