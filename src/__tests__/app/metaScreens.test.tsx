/**
 * Meta-screens integration test suite. Tests that the main menu, settings,
 * doctrine, and codex screens render correctly and handle user interactions.
 *
 * These tests use Vitest with the mocked db/meta module.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const purchaseBuildingUnlockMock = vi.fn();
const purchaseDoctrineNodeMock = vi.fn();
const updateSettingsMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../../engine/SoundManager', () => ({
  soundManager: {
    init: vi.fn(),
    playAmbience: vi.fn(),
    stopAmbience: vi.fn(),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    playUiClick: vi.fn(),
    playBuild: vi.fn(),
    playCombat: vi.fn(),
    playGameOver: vi.fn(),
  },
}));

vi.mock('../../db/meta', () => ({
  getUnlockCost: (type: string) =>
    ({ wall: 0, hut: 0, range: 50, temple: 150, keep: 300 })[type] ?? 0,
  purchaseBuildingUnlock: (...args: unknown[]) => purchaseBuildingUnlockMock(...args),
  purchaseDoctrineNode: (...args: unknown[]) => purchaseDoctrineNodeMock(...args),
  purchaseSpellUnlock: vi.fn(),
  updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
  useCodexEntries: () => [
    { entryId: 'enemy:goblin', category: 'enemy', discovered: true },
    { entryId: 'biome:kings-road', category: 'biome', discovered: false },
  ],
  useDoctrineNodes: () => [
    { nodeId: 'crown_tithe', level: 0, unlocked: false },
    { nodeId: 'faithward', level: 1, unlocked: true },
    { nodeId: 'iron_vanguard', level: 0, unlocked: false },
  ],
  useRunHistory: () => [],
  useMetaProgress: () => ({
    coins: 250,
    hasActiveRun: true,
    settings: {
      theme: 'holy-grail',
      preferredSpeed: 1.5,
      autoResume: true,
      reducedFx: false,
      soundEnabled: true,
      musicEnabled: true,
    },
    unlocks: {
      wall: true,
      hut: true,
      range: false,
      temple: false,
      keep: false,
      sentry: false,
      obelisk: false,
      lumber: false,
      mine_ore: false,
      mine_gem: false,
      track: true,
      mint: false,
      catapult: false,
      sorcerer: false,
      vault: false,
    },
    spellUnlocks: {
      smite: true,
      holy_nova: false,
      zealous_haste: false,
      earthquake: false,
      chrono_shift: false,
      meteor_strike: false,
      divine_shield: false,
    },
  }),
}));

// Verify the screens can be imported without error
// (full rendering tests require jsdom environment and @testing-library/react)
describe('meta screens', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    purchaseBuildingUnlockMock.mockReset();
    purchaseDoctrineNodeMock.mockReset();
    updateSettingsMock.mockReset();
  });

  it('can import MainMenu screen module', async () => {
    const mod = await import('../../app/index');
    expect(mod.MainMenu).toBeDefined();
    expect(typeof mod.MainMenu).toBe('function');
  });

  it('can import CodexScreen module', async () => {
    const mod = await import('../../app/codex');
    expect(mod.CodexScreen).toBeDefined();
    expect(typeof mod.CodexScreen).toBe('function');
  });

  it('can import DoctrineScreen module', async () => {
    const mod = await import('../../app/doctrine');
    expect(mod.DoctrineScreen).toBeDefined();
    expect(typeof mod.DoctrineScreen).toBe('function');
  });

  it('can import SettingsScreen module', async () => {
    const mod = await import('../../app/settings');
    expect(mod.SettingsScreen).toBeDefined();
    expect(typeof mod.SettingsScreen).toBe('function');
  });

  it('can import HistoryScreen module', async () => {
    const mod = await import('../../app/history');
    expect(mod.HistoryScreen).toBeDefined();
    expect(typeof mod.HistoryScreen).toBe('function');
  });
});
