const awardCoinsMock = jest.fn();
const updatePlayerProfileStatsMock = jest.fn();
const recordRunHistoryMock = jest.fn();
const clearActiveRunMock = jest.fn();

jest.mock('../../db/repos/profileRepo', () => ({
  awardCoins: (...args: unknown[]) => awardCoinsMock(...args),
  loadPlayerProfile: jest.fn(),
  updatePlayerProfileStats: (...args: unknown[]) => updatePlayerProfileStatsMock(...args),
}));

jest.mock('../../db/repos/runRepo', () => ({
  archiveActiveRun: jest.fn(),
  clearActiveRun: (...args: unknown[]) => clearActiveRunMock(...args),
  loadActiveRun: jest.fn(),
  recordRunHistory: (...args: unknown[]) => recordRunHistoryMock(...args),
  saveActiveRun: jest.fn(),
}));

jest.mock('../../db/repos/settingsRepo', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
}));

jest.mock('../../db/repos/bootstrapRepo', () => ({
  ensureSeedData: jest.fn(),
}));

jest.mock('../../db/repos/doctrineRepo', () => ({
  purchaseDoctrineNode: jest.fn(),
}));

jest.mock('../../db/repos/unlockRepo', () => ({
  purchaseUnlockTransaction: jest.fn(),
}));

jest.mock('../../db/client', () => ({
  db: {},
}));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  useLiveQuery: jest.fn(() => ({ data: [] })),
}));

describe('meta services', () => {
  beforeEach(() => {
    jest.resetModules();
    awardCoinsMock.mockReset();
    updatePlayerProfileStatsMock.mockReset();
    recordRunHistoryMock.mockReset();
    clearActiveRunMock.mockReset();
  });

  it('banks run rewards and clears the saved run exactly once', async () => {
    const { bankRunRewards } = await import('../../db/meta');

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
    expect(updatePlayerProfileStatsMock).toHaveBeenCalledWith({
      highestWave: 7,
      lifetimeKillsDelta: 42,
      lifetimeRunsDelta: 1,
    });
    expect(recordRunHistoryMock).toHaveBeenCalledWith({
      runId: 'run_123',
      waveReached: 7,
      coinsEarned: 70,
      durationMs: 120000,
      biome: 'kings-road',
      difficulty: 'pilgrim',
      result: 'defeat',
    });
    expect(clearActiveRunMock).toHaveBeenCalledWith('run_123');
  });
});
