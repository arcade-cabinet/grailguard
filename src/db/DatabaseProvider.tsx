/**
 * @module DatabaseProvider
 *
 * React context provider that gates the component tree behind successful
 * database migration and seed-data initialisation. Wrap the app root with
 * `<DatabaseProvider>` to guarantee every downstream component can safely
 * query the database.
 */
import { useEffect, useState } from 'react';
import { getSqlite, initDatabase, persistDatabase } from './client';
import { ensureSeedData } from './meta';
import { migrations } from './migrations';

/**
 * Runs sql.js migrations on mount, seeds default data on success, and
 * renders either an error screen, a loading splash, or the child tree.
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Initialize sql.js WASM database
        await initDatabase();
        const sqlite = getSqlite();

        // Create migration tracking table
        sqlite.run(
          'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)',
        );

        // Run pending migrations in order
        for (const entry of migrations.journal.entries) {
          const existing = sqlite.exec(
            `SELECT 1 FROM __drizzle_migrations WHERE tag = '${entry.tag}'`,
          );
          if (existing.length > 0 && existing[0].values.length > 0) continue;

          const sql = migrations.migrations[entry.tag];
          if (sql) {
            // Split multi-statement SQL and run each
            const statements = sql
              .split(';')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            for (const stmt of statements) {
              sqlite.run(stmt);
            }
          }

          sqlite.run(
            `INSERT INTO __drizzle_migrations (tag, created_at) VALUES ('${entry.tag}', ${Date.now()})`,
          );
        }

        persistDatabase();

        // Seed default data
        await ensureSeedData();
        persistDatabase();

        if (!cancelled) setState('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setState('error');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#120b08] px-6">
        <h1 className="text-4xl font-bold text-[#d4af37]">Database Error</h1>
        <p className="mt-3 text-center text-base text-[#d7c6af]">{errorMessage}</p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#120b08]">
        <h1 className="text-5xl font-bold text-[#d4af37]">Grailguard</h1>
        <p className="mt-3 text-lg text-[#d7c6af]">Sanctifying the archives...</p>
      </div>
    );
  }

  return <>{children}</>;
}
