import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../testDb';

let testDb: TestDb;

vi.mock('../../../db/client', () => ({
  get db() {
    return testDb.db;
  },
}));

import {
  archiveActiveRun,
  clearActiveRun,
  loadActiveRun,
  recordRunHistory,
  saveActiveRun,
} from '../../../db/repos/runRepo';
import { activeRun, runHistory } from '../../../db/schema';

function makeSnapshot(overrides: Partial<Parameters<typeof saveActiveRun>[0]> = {}) {
  return {
    id: 'run_001',
    snapshotVersion: 1,
    snapshotJson: JSON.stringify({ wave: 1, entities: [] }),
    phase: 'defend',
    wave: 1,
    biome: 'kings-road',
    status: 'active',
    ...overrides,
  };
}

describe('runRepo', () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('saveActiveRun', () => {
    it('inserts a new active run snapshot', async () => {
      await saveActiveRun(makeSnapshot());

      const row = await loadActiveRun();
      expect(row).toBeDefined();
      expect(row!.id).toBe('run_001');
      expect(row!.wave).toBe(1);
      expect(row!.status).toBe('active');
    });

    it('sets updatedAt automatically', async () => {
      const before = Date.now();
      await saveActiveRun(makeSnapshot());

      const row = await loadActiveRun();
      expect(row!.updatedAt).toBeGreaterThanOrEqual(before);
    });

    it('upserts on conflict (updates existing row)', async () => {
      await saveActiveRun(makeSnapshot({ wave: 1 }));
      await saveActiveRun(makeSnapshot({ wave: 5 }));

      const rows = await testDb.db.select().from(activeRun).all();
      expect(rows.length).toBe(1);
      expect(rows[0].wave).toBe(5);
    });

    it('preserves snapshot JSON across roundtrip', async () => {
      const complex = { wave: 3, entities: [{ id: 1, pos: [10, 20] }], gold: 500 };
      await saveActiveRun(makeSnapshot({ snapshotJson: JSON.stringify(complex) }));

      const row = await loadActiveRun();
      expect(JSON.parse(row!.snapshotJson)).toEqual(complex);
    });
  });

  describe('loadActiveRun', () => {
    it('returns undefined when no active run exists', async () => {
      const row = await loadActiveRun();
      expect(row).toBeUndefined();
    });

    it('only returns runs with status = active', async () => {
      await saveActiveRun(makeSnapshot({ status: 'defeated' }));

      const row = await loadActiveRun();
      expect(row).toBeUndefined();
    });

    it('returns the active run when one exists among archived', async () => {
      // Insert a defeated run directly
      await testDb.db.insert(activeRun).values({
        id: 'run_old',
        snapshotVersion: 1,
        snapshotJson: '{}',
        phase: 'defend',
        wave: 3,
        biome: 'kings-road',
        status: 'defeated',
        updatedAt: Date.now(),
      });

      // Insert active run
      await saveActiveRun(makeSnapshot({ id: 'run_active' }));

      const row = await loadActiveRun();
      expect(row!.id).toBe('run_active');
    });
  });

  describe('clearActiveRun', () => {
    it('deletes a run by specific runId', async () => {
      await saveActiveRun(makeSnapshot());
      await clearActiveRun('run_001');

      const row = await loadActiveRun();
      expect(row).toBeUndefined();
    });

    it('deletes the currently active run when no runId is provided', async () => {
      await saveActiveRun(makeSnapshot());
      await clearActiveRun();

      const row = await loadActiveRun();
      expect(row).toBeUndefined();
    });

    it('no-ops when no active run exists and no runId given', async () => {
      // Should not throw
      await clearActiveRun();
    });

    it('no-ops when runId does not match any row', async () => {
      await saveActiveRun(makeSnapshot());
      await clearActiveRun('nonexistent_id');

      // Original run should still exist
      const row = await loadActiveRun();
      expect(row).toBeDefined();
    });
  });

  describe('archiveActiveRun', () => {
    it('changes status from active to the given result', async () => {
      await saveActiveRun(makeSnapshot());
      await archiveActiveRun('defeat');

      // loadActiveRun only returns status=active, so it should be undefined now
      const active = await loadActiveRun();
      expect(active).toBeUndefined();

      // But the row should still be in the table with new status
      const row = await testDb.db.select().from(activeRun).where(eq(activeRun.id, 'run_001')).get();
      expect(row!.status).toBe('defeat');
    });

    it('marks as abandoned', async () => {
      await saveActiveRun(makeSnapshot());
      await archiveActiveRun('abandoned');

      const row = await testDb.db.select().from(activeRun).where(eq(activeRun.id, 'run_001')).get();
      expect(row!.status).toBe('abandoned');
    });

    it('marks as invalid', async () => {
      await saveActiveRun(makeSnapshot());
      await archiveActiveRun('invalid');

      const row = await testDb.db.select().from(activeRun).where(eq(activeRun.id, 'run_001')).get();
      expect(row!.status).toBe('invalid');
    });

    it('no-ops when no active run exists', async () => {
      // Should not throw
      await archiveActiveRun('defeat');
    });

    it('updates the updatedAt timestamp', async () => {
      await saveActiveRun(makeSnapshot());
      const before = Date.now();

      await new Promise((r) => setTimeout(r, 5));
      await archiveActiveRun('defeat');

      const row = await testDb.db.select().from(activeRun).where(eq(activeRun.id, 'run_001')).get();
      expect(row!.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('recordRunHistory', () => {
    it('inserts a completed run record', async () => {
      await recordRunHistory({
        runId: 'run_001',
        waveReached: 7,
        coinsEarned: 150,
        durationMs: 180000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });

      const rows = await testDb.db.select().from(runHistory).all();
      expect(rows.length).toBe(1);
      expect(rows[0].runId).toBe('run_001');
      expect(rows[0].waveReached).toBe(7);
      expect(rows[0].coinsEarned).toBe(150);
      expect(rows[0].durationMs).toBe(180000);
      expect(rows[0].result).toBe('defeat');
    });

    it('records multiple runs', async () => {
      await recordRunHistory({
        runId: 'run_001',
        waveReached: 5,
        coinsEarned: 100,
        durationMs: 60000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });

      await recordRunHistory({
        runId: 'run_002',
        waveReached: 12,
        coinsEarned: 300,
        durationMs: 240000,
        biome: 'kings-road',
        difficulty: 'crusader',
        result: 'abandoned',
      });

      const rows = await testDb.db.select().from(runHistory).all();
      expect(rows.length).toBe(2);
    });

    it('sets createdAt automatically', async () => {
      const before = Date.now();
      await recordRunHistory({
        runId: 'run_001',
        waveReached: 1,
        coinsEarned: 10,
        durationMs: 5000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });

      const row = await testDb.db
        .select()
        .from(runHistory)
        .where(eq(runHistory.runId, 'run_001'))
        .get();
      expect(row!.createdAt).toBeGreaterThanOrEqual(before);
    });

    it('rejects duplicate runId (primary key conflict)', async () => {
      await recordRunHistory({
        runId: 'run_dup',
        waveReached: 3,
        coinsEarned: 50,
        durationMs: 30000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });

      await expect(
        recordRunHistory({
          runId: 'run_dup',
          waveReached: 5,
          coinsEarned: 80,
          durationMs: 60000,
          biome: 'kings-road',
          difficulty: 'pilgrim',
          result: 'defeat',
        }),
      ).rejects.toThrow();
    });
  });

  describe('active run lifecycle: create -> save -> resume -> finalize', () => {
    it('full lifecycle', async () => {
      // Step 1: Create initial snapshot
      await saveActiveRun(makeSnapshot({ wave: 1, phase: 'build' }));
      let run = await loadActiveRun();
      expect(run!.wave).toBe(1);
      expect(run!.phase).toBe('build');

      // Step 2: Update (save progress mid-game)
      await saveActiveRun(makeSnapshot({ wave: 3, phase: 'defend' }));
      run = await loadActiveRun();
      expect(run!.wave).toBe(3);
      expect(run!.phase).toBe('defend');

      // Step 3: Resume check (load returns latest state)
      const resumed = await loadActiveRun();
      expect(resumed!.wave).toBe(3);

      // Step 4: Archive (defeat)
      await archiveActiveRun('defeat');
      const active = await loadActiveRun();
      expect(active).toBeUndefined();

      // Step 5: Record history and clear
      await recordRunHistory({
        runId: 'run_001',
        waveReached: 3,
        coinsEarned: 75,
        durationMs: 90000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });
      await clearActiveRun('run_001');

      // Verify history recorded
      const history = await testDb.db.select().from(runHistory).all();
      expect(history.length).toBe(1);

      // Verify active run is gone
      const allRuns = await testDb.db.select().from(activeRun).all();
      expect(allRuns.length).toBe(0);
    });
  });
});
