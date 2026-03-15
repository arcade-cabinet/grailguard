/**
 * @module persistence.test
 *
 * Tests verifying the meta-progression reactive persistence pipeline:
 * - afterWrite calls both persistDatabase and notifyDbChange
 * - Meta write functions (bankRunRewards, updateSettings, purchaseBuildingUnlock)
 *   trigger the full afterWrite pipeline
 */

/* ------------------------------------------------------------------ */
/*  Mock setup                                                         */
/* ------------------------------------------------------------------ */

const persistDatabaseMock = vi.fn();
const notifyDbChangeMock = vi.fn();

// Repo mocks -- all no-op so we only verify the persistence pipeline
const awardCoinsMock = vi.fn();
const updatePlayerProfileStatsMock = vi.fn();
const recordRunHistoryMock = vi.fn();
const clearActiveRunMock = vi.fn();
const saveSettingsMock = vi.fn();
const loadSettingsMock = vi.fn();
const purchaseUnlockTransactionMock = vi.fn();
const purchaseSpellUnlockTransactionMock = vi.fn();
const ensureSeedDataMock = vi.fn();
const purchaseDoctrineNodeMock = vi.fn();
const discoverCodexEntryMock = vi.fn();
const archiveActiveRunMock = vi.fn();
const loadActiveRunMock = vi.fn();
const saveActiveRunMock = vi.fn();
const loadPlayerProfileMock = vi.fn();

vi.mock('../../db/client', () => ({
  db: {},
  persistDatabase: (...args: unknown[]) => persistDatabaseMock(...args),
}));

vi.mock('../../db/useLiveQuery', () => ({
  notifyDbChange: (...args: unknown[]) => notifyDbChangeMock(...args),
  useLiveQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../db/repos/profileRepo', () => ({
  awardCoins: (...args: unknown[]) => awardCoinsMock(...args),
  loadPlayerProfile: (...args: unknown[]) => loadPlayerProfileMock(...args),
  updatePlayerProfileStats: (...args: unknown[]) => updatePlayerProfileStatsMock(...args),
}));

vi.mock('../../db/repos/runRepo', () => ({
  archiveActiveRun: (...args: unknown[]) => archiveActiveRunMock(...args),
  clearActiveRun: (...args: unknown[]) => clearActiveRunMock(...args),
  loadActiveRun: (...args: unknown[]) => loadActiveRunMock(...args),
  recordRunHistory: (...args: unknown[]) => recordRunHistoryMock(...args),
  saveActiveRun: (...args: unknown[]) => saveActiveRunMock(...args),
}));

vi.mock('../../db/repos/settingsRepo', () => ({
  loadSettings: (...args: unknown[]) => loadSettingsMock(...args),
  saveSettings: (...args: unknown[]) => saveSettingsMock(...args),
}));

vi.mock('../../db/repos/bootstrapRepo', () => ({
  ensureSeedData: (...args: unknown[]) => ensureSeedDataMock(...args),
}));

vi.mock('../../db/repos/doctrineRepo', () => ({
  purchaseDoctrineNode: (...args: unknown[]) => purchaseDoctrineNodeMock(...args),
}));

vi.mock('../../db/repos/unlockRepo', () => ({
  purchaseUnlockTransaction: (...args: unknown[]) => purchaseUnlockTransactionMock(...args),
  purchaseSpellUnlockTransaction: (...args: unknown[]) =>
    purchaseSpellUnlockTransactionMock(...args),
}));

vi.mock('../../db/repos/codexRepo', () => ({
  discoverCodexEntry: (...args: unknown[]) => discoverCodexEntryMock(...args),
}));

vi.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: vi.fn(() => ({ data: [] })),
}));

/* ------------------------------------------------------------------ */
/*  Import the meta module under test (after mocks are set up)         */
/* ------------------------------------------------------------------ */

import { bankRunRewards, purchaseBuildingUnlock, updateSettings } from '../../db/meta';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('persistence pipeline', () => {
  beforeEach(() => {
    persistDatabaseMock.mockReset();
    notifyDbChangeMock.mockReset();
    awardCoinsMock.mockReset();
    updatePlayerProfileStatsMock.mockReset();
    recordRunHistoryMock.mockReset();
    clearActiveRunMock.mockReset();
    saveSettingsMock.mockReset();
    loadSettingsMock.mockReset();
    purchaseUnlockTransactionMock.mockReset();
    purchaseSpellUnlockTransactionMock.mockReset();
    ensureSeedDataMock.mockReset();
    purchaseDoctrineNodeMock.mockReset();
    discoverCodexEntryMock.mockReset();
    archiveActiveRunMock.mockReset();
    loadActiveRunMock.mockReset();
    saveActiveRunMock.mockReset();
    loadPlayerProfileMock.mockReset();
  });

  /* ---------- afterWrite pipeline ---------- */

  describe('notifyDbChange triggers re-query', () => {
    test('afterWrite calls both persistDatabase and notifyDbChange', async () => {
      // bankRunRewards calls afterWrite at the end -- use it to verify pipeline
      await bankRunRewards({
        earnedCoins: 50,
        waveReached: 3,
        kills: 10,
        result: 'defeat',
        runId: 'run_persist_test',
        durationMs: 30000,
      });

      expect(persistDatabaseMock).toHaveBeenCalledTimes(1);
      expect(notifyDbChangeMock).toHaveBeenCalledTimes(1);
    });

    test('persistDatabase is called before notifyDbChange', async () => {
      const callOrder: string[] = [];
      persistDatabaseMock.mockImplementation(() => {
        callOrder.push('persist');
      });
      notifyDbChangeMock.mockImplementation(() => {
        callOrder.push('notify');
      });

      await bankRunRewards({
        earnedCoins: 10,
        waveReached: 1,
        kills: 2,
        result: 'defeat',
        runId: 'run_order_test',
        durationMs: 5000,
      });

      expect(callOrder).toEqual(['persist', 'notify']);
    });
  });

  /* ---------- Meta write functions call afterWrite ---------- */

  describe('purchaseBuildingUnlock persists changes', () => {
    test('purchaseUnlockTransaction triggers persist and notify', async () => {
      purchaseUnlockTransactionMock.mockResolvedValue(true);

      await purchaseBuildingUnlock('range');

      expect(purchaseUnlockTransactionMock).toHaveBeenCalledWith('range');
      expect(persistDatabaseMock).toHaveBeenCalledTimes(1);
      expect(notifyDbChangeMock).toHaveBeenCalledTimes(1);
    });

    test('persistDatabase and notifyDbChange are called even when unlock fails', async () => {
      purchaseUnlockTransactionMock.mockResolvedValue(false);

      await purchaseBuildingUnlock('temple');

      // afterWrite is still called regardless of success/failure
      expect(persistDatabaseMock).toHaveBeenCalledTimes(1);
      expect(notifyDbChangeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings persists changes', () => {
    test('updateSettings triggers persist and notify', async () => {
      await updateSettings({ soundEnabled: false, musicEnabled: false });

      expect(saveSettingsMock).toHaveBeenCalledWith({
        soundEnabled: false,
        musicEnabled: false,
      });
      expect(persistDatabaseMock).toHaveBeenCalledTimes(1);
      expect(notifyDbChangeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('bankRunRewards persists changes', () => {
    test('bankRunRewards triggers persist and notify', async () => {
      await bankRunRewards({
        earnedCoins: 100,
        waveReached: 10,
        kills: 55,
        result: 'defeat',
        runId: 'run_bank_test',
        durationMs: 120000,
        biome: 'desert-wastes',
        difficulty: 'crusader',
      });

      expect(awardCoinsMock).toHaveBeenCalledWith(100);
      expect(updatePlayerProfileStatsMock).toHaveBeenCalledWith({
        highestWave: 10,
        lifetimeKillsDelta: 55,
        lifetimeRunsDelta: 1,
      });
      expect(recordRunHistoryMock).toHaveBeenCalledWith({
        runId: 'run_bank_test',
        waveReached: 10,
        coinsEarned: 100,
        durationMs: 120000,
        biome: 'desert-wastes',
        difficulty: 'crusader',
        result: 'defeat',
      });
      expect(clearActiveRunMock).toHaveBeenCalledWith('run_bank_test');
      expect(persistDatabaseMock).toHaveBeenCalledTimes(1);
      expect(notifyDbChangeMock).toHaveBeenCalledTimes(1);
    });
  });
});
