/**
 * @module runRepo
 *
 * Persistence layer for in-progress run snapshots and completed run history.
 *
 * Active runs are stored as a single row in the `active_run` table with the
 * full engine state serialised in `snapshotJson`.  When a run ends the row
 * is either archived (status changed) or deleted, and a summary is written
 * to `run_history`.
 */
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { activeRun, runHistory } from '../schema';

function now() {
  return Date.now();
}

/**
 * Shape of a row in the `active_run` table.
 * `snapshotJson` holds the serialised engine state; the remaining columns
 * are denormalised for quick status checks without deserialisation.
 */
export interface ActiveRunSnapshotRecord {
  id: string;
  snapshotVersion: number;
  snapshotJson: string;
  phase: string;
  wave: number;
  biome: string;
  status: string;
  updatedAt: number;
}

/**
 * Loads the active (in-progress) run snapshot, if one exists.
 * @returns The active run row, or `undefined` if no run has status `'active'`.
 */
export async function loadActiveRun() {
  return db.select().from(activeRun).where(eq(activeRun.status, 'active')).get();
}

/**
 * Upserts an active-run snapshot.  If a row with the same `id` already exists
 * it is fully overwritten; otherwise a new row is inserted.  The `updatedAt`
 * timestamp is set to `Date.now()` automatically.
 *
 * @param input - Run snapshot fields (without `updatedAt`).
 */
export async function saveActiveRun(input: Omit<ActiveRunSnapshotRecord, 'updatedAt'>) {
  await db
    .insert(activeRun)
    .values({
      ...input,
      updatedAt: now(),
    })
    .onConflictDoUpdate({
      target: activeRun.id,
      set: {
        snapshotVersion: input.snapshotVersion,
        snapshotJson: input.snapshotJson,
        phase: input.phase,
        wave: input.wave,
        biome: input.biome,
        status: input.status,
        updatedAt: now(),
      },
    });
}

/**
 * Deletes the active-run snapshot row from the database.
 *
 * @param runId - If provided, deletes only the row matching this id.
 *                If omitted, deletes the currently active run (if any).
 */
export async function clearActiveRun(runId?: string) {
  if (runId) {
    await db.delete(activeRun).where(eq(activeRun.id, runId));
    return;
  }

  const current = await loadActiveRun();
  if (!current) return;
  await db.delete(activeRun).where(eq(activeRun.id, current.id));
}

/**
 * Changes the status of the current active run without deleting the row.
 * This is used to mark a run as ended before it is cleared or before rewards
 * are banked.
 *
 * @param result - The terminal status to apply: `'defeat'`, `'abandoned'`, or `'invalid'`.
 */
export async function archiveActiveRun(result: 'defeat' | 'abandoned' | 'invalid') {
  const current = await loadActiveRun();
  if (!current) return;

  await db
    .update(activeRun)
    .set({
      status: result,
      updatedAt: now(),
    })
    .where(eq(activeRun.id, current.id));
}

/**
 * Inserts an immutable record into the `run_history` table after a run ends.
 * The `createdAt` timestamp is set automatically to `Date.now()`.
 *
 * @param summary - Completed run stats including wave reached, coins earned,
 *                  duration, biome, difficulty, and result.
 */
export async function recordRunHistory(summary: {
  runId: string;
  waveReached: number;
  coinsEarned: number;
  durationMs: number;
  biome: string;
  difficulty: string;
  result: string;
}) {
  await db.insert(runHistory).values({
    runId: summary.runId,
    waveReached: summary.waveReached,
    coinsEarned: summary.coinsEarned,
    durationMs: summary.durationMs,
    biome: summary.biome,
    difficulty: summary.difficulty,
    result: summary.result,
    createdAt: now(),
  });
}
