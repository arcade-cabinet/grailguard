
/* ------------------------------------------------------------------ */
/*  Mock setup                                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
const awardCoinsMock = vi.fn<(...args: any[]) => any>();
const loadPlayerProfileMock = vi.fn<(...args: any[]) => any>();
const updatePlayerProfileStatsMock = vi.fn<(...args: any[]) => any>();

const archiveActiveRunMock = vi.fn<(...args: any[]) => any>();
const clearActiveRunMock = vi.fn<(...args: any[]) => any>();
const loadActiveRunMock = vi.fn<(...args: any[]) => any>();
const recordRunHistoryMock = vi.fn<(...args: any[]) => any>();
const saveActiveRunMock = vi.fn<(...args: any[]) => any>();

const loadSettingsMock = vi.fn<(...args: any[]) => any>();
const saveSettingsMock = vi.fn<(...args: any[]) => any>();

const ensureSeedDataMock = vi.fn<(...args: any[]) => any>();
const purchaseDoctrineNodeMock = vi.fn<(...args: any[]) => any>();
const purchaseUnlockTransactionMock = vi.fn<(...args: any[]) => any>();
const purchaseSpellUnlockTransactionMock = vi.fn<(...args: any[]) => any>();
const discoverCodexEntryMock = vi.fn<(...args: any[]) => any>();

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

vi.mock('../../db/client', () => ({
  db: {},
  persistDatabase: vi.fn(),
}));

vi.mock('../../db/useLiveQuery', () => ({
  notifyDbChange: vi.fn(),
  useLiveQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: vi.fn(() => ({ data: [] })),
}));

/* ------------------------------------------------------------------ */
/*  Import the meta module under test (after mocks are set up)         */
/* ------------------------------------------------------------------ */

import {
  abandonActiveRun,
  bankRunRewards,
  clearSavedRun,
  discoverCodexEntry,
  ensureSeedData,
  loadActiveRunRecord,
  loadAutoResumeSetting,
  loadPlayerCoins,
  loadPreferredSpeed,
  markBrokenRunAndReset,
  purchaseBuildingUnlock,
  purchaseDoctrineNode,
  purchaseSpellUnlock,
  saveActiveRunRecord,
  updatePreferredSpeed,
  updateSettings,
} from '../../db/meta';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('meta services', () => {
  beforeEach(() => {
    awardCoinsMock.mockReset();
    loadPlayerProfileMock.mockReset();
    updatePlayerProfileStatsMock.mockReset();
    archiveActiveRunMock.mockReset();
    clearActiveRunMock.mockReset();
    loadActiveRunMock.mockReset();
    recordRunHistoryMock.mockReset();
    saveActiveRunMock.mockReset();
    loadSettingsMock.mockReset();
    saveSettingsMock.mockReset();
    ensureSeedDataMock.mockReset();
    purchaseDoctrineNodeMock.mockReset();
    purchaseUnlockTransactionMock.mockReset();
    purchaseSpellUnlockTransactionMock.mockReset();
    discoverCodexEntryMock.mockReset();
  });

  /* ---------- bankRunRewards ---------- */

  describe('bankRunRewards', () => {
    it('awards coins, updates stats, records history, and clears the run', async () => {
      await bankRunRewards({
        earnedCoins: 70,
        waveReached: 7,
        kills: 42,
        result: 'defeat',
        runId: 'run_123',
        durationMs: 120000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
      });

      expect(awardCoinsMock).toHaveBeenCalledWith(70);
      expect(awardCoinsMock).toHaveBeenCalledTimes(1);
      expect(updatePlayerProfileStatsMock).toHaveBeenCalledWith({
        highestWave: 7,
        lifetimeKillsDelta: 42,
        lifetimeRunsDelta: 1,
      });
      expect(updatePlayerProfileStatsMock).toHaveBeenCalledTimes(1);
      expect(recordRunHistoryMock).toHaveBeenCalledWith({
        runId: 'run_123',
        waveReached: 7,
        coinsEarned: 70,
        durationMs: 120000,
        biome: 'kings-road',
        difficulty: 'pilgrim',
        result: 'defeat',
      });
      expect(recordRunHistoryMock).toHaveBeenCalledTimes(1);
      expect(clearActiveRunMock).toHaveBeenCalledWith('run_123');
      expect(clearActiveRunMock).toHaveBeenCalledTimes(1);
    });

    it('uses default biome and difficulty when not provided', async () => {
      await bankRunRewards({
        earnedCoins: 10,
        waveReached: 1,
        kills: 5,
        result: 'abandoned',
        runId: 'run_456',
        durationMs: 5000,
      });

      expect(recordRunHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          biome: 'kings-road',
          difficulty: 'pilgrim',
        }),
      );
    });

    it('handles zero coins and zero kills', async () => {
      await bankRunRewards({
        earnedCoins: 0,
        waveReached: 0,
        kills: 0,
        result: 'defeat',
        runId: 'run_zero',
        durationMs: 1000,
      });

      expect(awardCoinsMock).toHaveBeenCalledWith(0);
      expect(updatePlayerProfileStatsMock).toHaveBeenCalledWith({
        highestWave: 0,
        lifetimeKillsDelta: 0,
        lifetimeRunsDelta: 1,
      });
    });
  });

  /* ---------- Profile operations ---------- */

  describe('loadPlayerCoins', () => {
    it('returns coins from the profile', async () => {
      loadPlayerProfileMock.mockResolvedValue({ coins: 500 });
      const coins = await loadPlayerCoins();
      expect(coins).toBe(500);
    });

    it('returns 0 when no profile exists', async () => {
      loadPlayerProfileMock.mockResolvedValue(undefined);
      const coins = await loadPlayerCoins();
      expect(coins).toBe(0);
    });

    it('returns 0 when profile has null coins', async () => {
      loadPlayerProfileMock.mockResolvedValue({ coins: null });
      const coins = await loadPlayerCoins();
      expect(coins).toBe(0);
    });
  });

  /* ---------- Settings CRUD ---------- */

  describe('settings operations', () => {
    describe('loadPreferredSpeed', () => {
      it('returns the stored speed', async () => {
        loadSettingsMock.mockResolvedValue({ preferredSpeed: 2 });
        const speed = await loadPreferredSpeed();
        expect(speed).toBe(2);
      });

      it('returns 1 as default when no settings row exists', async () => {
        loadSettingsMock.mockResolvedValue(undefined);
        const speed = await loadPreferredSpeed();
        expect(speed).toBe(1);
      });
    });

    describe('updatePreferredSpeed', () => {
      it('calls saveSettings with the new speed and default theme', async () => {
        await updatePreferredSpeed(1.5);
        expect(saveSettingsMock).toHaveBeenCalledWith({
          preferredSpeed: 1.5,
          theme: 'holy-grail',
        });
      });
    });

    describe('loadAutoResumeSetting', () => {
      it('returns the stored autoResume value', async () => {
        loadSettingsMock.mockResolvedValue({ autoResume: false });
        const result = await loadAutoResumeSetting();
        expect(result).toBe(false);
      });

      it('returns true as default when no settings exist', async () => {
        loadSettingsMock.mockResolvedValue(undefined);
        const result = await loadAutoResumeSetting();
        expect(result).toBe(true);
      });
    });

    describe('updateSettings', () => {
      it('delegates patch to saveSettings', async () => {
        const patch = {
          soundEnabled: false,
          musicEnabled: false,
          cameraIntensity: 0.5,
        };
        await updateSettings(patch);
        expect(saveSettingsMock).toHaveBeenCalledWith(patch);
        expect(saveSettingsMock).toHaveBeenCalledTimes(1);
      });

      it('passes through partial updates', async () => {
        await updateSettings({ theme: 'dark' });
        expect(saveSettingsMock).toHaveBeenCalledWith({ theme: 'dark' });
      });
    });
  });

  /* ---------- Unlock flow ---------- */

  describe('unlock operations', () => {
    describe('purchaseBuildingUnlock', () => {
      it('delegates to purchaseUnlockTransaction', async () => {
        purchaseUnlockTransactionMock.mockResolvedValue(true);
        const result = await purchaseBuildingUnlock('range');
        expect(purchaseUnlockTransactionMock).toHaveBeenCalledWith('range');
        expect(result).toBe(true);
      });

      it('returns false when transaction fails', async () => {
        purchaseUnlockTransactionMock.mockResolvedValue(false);
        const result = await purchaseBuildingUnlock('temple');
        expect(result).toBe(false);
      });
    });

    describe('purchaseSpellUnlock', () => {
      it('delegates to purchaseSpellUnlockTransaction', async () => {
        purchaseSpellUnlockTransactionMock.mockResolvedValue(true);
        const result = await purchaseSpellUnlock('holy_nova');
        expect(purchaseSpellUnlockTransactionMock).toHaveBeenCalledWith('holy_nova');
        expect(result).toBe(true);
      });

      it('returns false when transaction fails', async () => {
        purchaseSpellUnlockTransactionMock.mockResolvedValue(false);
        const result = await purchaseSpellUnlock('earthquake');
        expect(result).toBe(false);
      });
    });
  });

  /* ---------- Run save/resume/finalize lifecycle ---------- */

  describe('active run lifecycle', () => {
    describe('saveActiveRunRecord', () => {
      it('delegates to saveActiveRun with the record', async () => {
        const record = {
          id: 'run_001',
          snapshotVersion: 1,
          snapshotJson: '{"wave":3}',
          phase: 'defend',
          wave: 3,
          biome: 'kings-road',
          status: 'active',
        };

        await saveActiveRunRecord(record);
        expect(saveActiveRunMock).toHaveBeenCalledWith(record);
        expect(saveActiveRunMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('loadActiveRunRecord', () => {
      it('returns the active run snapshot', async () => {
        const snapshot = {
          id: 'run_001',
          snapshotVersion: 1,
          snapshotJson: '{}',
          phase: 'defend',
          wave: 5,
          biome: 'kings-road',
          status: 'active',
          updatedAt: Date.now(),
        };
        loadActiveRunMock.mockResolvedValue(snapshot);

        const result = await loadActiveRunRecord();
        expect(result).toEqual(snapshot);
      });

      it('returns undefined when no active run exists', async () => {
        loadActiveRunMock.mockResolvedValue(undefined);
        const result = await loadActiveRunRecord();
        expect(result).toBeUndefined();
      });
    });

    describe('clearSavedRun', () => {
      it('clears by runId when provided', async () => {
        await clearSavedRun('run_001');
        expect(clearActiveRunMock).toHaveBeenCalledWith('run_001');
      });

      it('clears without runId when not provided', async () => {
        await clearSavedRun();
        expect(clearActiveRunMock).toHaveBeenCalledWith(undefined);
      });
    });

    describe('markBrokenRunAndReset', () => {
      it('archives as invalid and clears', async () => {
        await markBrokenRunAndReset();
        expect(archiveActiveRunMock).toHaveBeenCalledWith('invalid');
        expect(clearActiveRunMock).toHaveBeenCalled();
      });

      it('calls archive before clear', async () => {
        const callOrder: string[] = [];
        archiveActiveRunMock.mockImplementation(() => {
          callOrder.push('archive');
        });
        clearActiveRunMock.mockImplementation(() => {
          callOrder.push('clear');
        });

        await markBrokenRunAndReset();
        expect(callOrder).toEqual(['archive', 'clear']);
      });
    });

    describe('abandonActiveRun', () => {
      it('archives as abandoned and clears', async () => {
        await abandonActiveRun();
        expect(archiveActiveRunMock).toHaveBeenCalledWith('abandoned');
        expect(clearActiveRunMock).toHaveBeenCalled();
      });
    });

    describe('full run lifecycle through meta facade', () => {
      it('save -> resume -> finalize flow', async () => {
        // Step 1: Save a run
        const record = {
          id: 'run_lifecycle',
          snapshotVersion: 1,
          snapshotJson: '{"wave":1}',
          phase: 'build',
          wave: 1,
          biome: 'kings-road',
          status: 'active',
        };
        await saveActiveRunRecord(record);
        expect(saveActiveRunMock).toHaveBeenCalledWith(record);

        // Step 2: Load/resume the run
        loadActiveRunMock.mockResolvedValue({ ...record, updatedAt: Date.now() });
        const loaded = await loadActiveRunRecord();
        expect(loaded).toBeDefined();
        expect(loaded!.id).toBe('run_lifecycle');

        // Step 3: Save updated progress
        const updatedRecord = { ...record, wave: 5, phase: 'defend', snapshotJson: '{"wave":5}' };
        await saveActiveRunRecord(updatedRecord);

        // Step 4: Bank rewards (finalize)
        await bankRunRewards({
          earnedCoins: 100,
          waveReached: 5,
          kills: 30,
          result: 'defeat',
          runId: 'run_lifecycle',
          durationMs: 60000,
        });

        expect(awardCoinsMock).toHaveBeenCalledWith(100);
        expect(clearActiveRunMock).toHaveBeenCalledWith('run_lifecycle');
      });
    });
  });

  /* ---------- Doctrine ---------- */

  describe('purchaseDoctrineNode', () => {
    it('delegates nodeId and cost to the repo', async () => {
      purchaseDoctrineNodeMock.mockResolvedValue({ success: true });
      const result = await purchaseDoctrineNode('crown_tithe', 100);
      expect(purchaseDoctrineNodeMock).toHaveBeenCalledWith({
        nodeId: 'crown_tithe',
        cost: 100,
      });
      expect(result).toEqual({ success: true });
    });

    it('returns failure result from repo', async () => {
      purchaseDoctrineNodeMock.mockResolvedValue({
        success: false,
        reason: 'insufficient_coins',
      });
      const result = await purchaseDoctrineNode('faithward', 500);
      expect(result).toEqual({ success: false, reason: 'insufficient_coins' });
    });
  });

  /* ---------- Codex ---------- */

  describe('discoverCodexEntry', () => {
    it('delegates entryId and category to the repo', async () => {
      await discoverCodexEntry('enemy:goblin', 'enemy');
      expect(discoverCodexEntryMock).toHaveBeenCalledWith('enemy:goblin', 'enemy');
      expect(discoverCodexEntryMock).toHaveBeenCalledTimes(1);
    });
  });

  /* ---------- Seed data ---------- */

  describe('ensureSeedData', () => {
    it('delegates to the bootstrap repo', async () => {
      await ensureSeedData();
      expect(ensureSeedDataMock).toHaveBeenCalledTimes(1);
    });
  });
});
