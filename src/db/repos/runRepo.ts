import { eq } from 'drizzle-orm';
import { db } from '../client';
import { activeRun, runHistory } from '../schema';

function now() {
  return Date.now();
}

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

export async function loadActiveRun() {
  return db.select().from(activeRun).where(eq(activeRun.status, 'active')).get();
}

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

export async function clearActiveRun(runId?: string) {
  if (runId) {
    await db.delete(activeRun).where(eq(activeRun.id, runId));
    return;
  }

  const current = await loadActiveRun();
  if (!current) return;
  await db.delete(activeRun).where(eq(activeRun.id, current.id));
}

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
