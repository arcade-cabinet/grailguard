/**
 * @module client
 *
 * Opens the local SQLite database (`grailguard.db`) via expo-sqlite and
 * wraps it with Drizzle ORM.  The `enableChangeListener` flag is required
 * so that Drizzle's `useLiveQuery` hooks receive real-time row-change
 * notifications.
 *
 * Exports:
 * - {@link sqlite} -- raw expo-sqlite handle (used by the migration runner).
 * - {@link db}     -- Drizzle ORM instance bound to the full schema.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

export const sqlite = SQLite.openDatabaseSync('grailguard.db', {
  enableChangeListener: true,
});

export const db = drizzle(sqlite, { schema });
