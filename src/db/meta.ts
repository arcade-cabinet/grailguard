/**
 * @module meta
 *
 * Public service facade for all meta-progression database operations.
 * UI components and game-over flows import from this module rather than
 * reaching into individual repo files directly.
 *
 * The module exposes:
 * - React hooks (`useMetaProgress`, `useCodexEntries`, `useDoctrineNodes`)
 *   backed by Drizzle live queries that re-render on every DB change.
 * - Async command functions for purchasing unlocks, banking run rewards,
 *   persisting/restoring active-run snapshots, and updating settings.
 */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { BUILDINGS, type BuildingType, type SpellType } from '../engine/constants';
import { db } from './client';
import { ensureSeedData as ensureBootstrapSeedData } from './repos/bootstrapRepo';
import { discoverCodexEntry as discoverCodexEntryRepo } from './repos/codexRepo';
import { purchaseDoctrineNode as purchaseDoctrineNodeRepo } from './repos/doctrineRepo';
import { awardCoins, loadPlayerProfile, updatePlayerProfileStats } from './repos/profileRepo';
import {
  type ActiveRunSnapshotRecord,
  archiveActiveRun,
  clearActiveRun,
  loadActiveRun,
  recordRunHistory,
  saveActiveRun,
} from './repos/runRepo';
import { loadSettings, saveSettings } from './repos/settingsRepo';
import { purchaseSpellUnlockTransaction, purchaseUnlockTransaction } from './repos/unlockRepo';
import { activeRun, codexEntries, doctrineNodes, playerProfile, runHistory, settings, unlocks } from './schema';

const DEFAULT_UNLOCKS: Record<BuildingType, boolean> = {
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
};

const DEFAULT_SPELL_UNLOCKS: Record<SpellType, boolean> = {
  smite: true,
  holy_nova: false,
  zealous_haste: false,
  earthquake: false,
  chrono_shift: false,
  meteor_strike: false,
  divine_shield: false,
};

/**
 * Ensures all seed data (profile, settings, default unlocks, codex entries,
 * doctrine nodes, content state) exists in the database.  Safe to call
 * repeatedly -- every insert uses `onConflictDoNothing`.
 */
export async function ensureSeedData() {
  await ensureBootstrapSeedData();
}

/**
 * Live-query hook that aggregates all meta-progression state into a single
 * reactive object.  Re-renders automatically whenever any underlying table
 * row changes.
 *
 * @returns An object containing:
 *   - `profile` -- full player profile row (or null).
 *   - `coins` -- shorthand for `profile.coins`.
 *   - `settings` -- user settings row (or null).
 *   - `unlocks` -- map of BuildingType to unlocked boolean.
 *   - `spellUnlocks` -- map of SpellType to unlocked boolean.
 *   - `hasActiveRun` -- whether an in-progress run snapshot exists.
 *   - `activeRun` -- the active run row (or null).
 *   - `codexCount` -- number of discovered codex entries.
 *   - `doctrineCount` -- number of unlocked doctrine nodes.
 */
export function useMetaProgress() {
  const profileQuery = useLiveQuery(db.select().from(playerProfile).where(eq(playerProfile.id, 1)));
  const settingsQuery = useLiveQuery(db.select().from(settings).where(eq(settings.id, 1)));
  const unlockQuery = useLiveQuery(db.select().from(unlocks).where(eq(unlocks.domain, 'building')));
  const spellQuery = useLiveQuery(db.select().from(unlocks).where(eq(unlocks.domain, 'spell')));
  const runQuery = useLiveQuery(db.select().from(activeRun).where(eq(activeRun.status, 'active')));
  const codexQuery = useLiveQuery(db.select().from(codexEntries));
  const doctrineQuery = useLiveQuery(db.select().from(doctrineNodes));

  const profile = profileQuery.data[0] ?? null;
  const settingsRow = settingsQuery.data[0] ?? null;
  const activeRunRow = runQuery.data[0] ?? null;
  const unlockMap = unlockQuery.data.reduce<Record<BuildingType, boolean>>(
    (acc, row) => {
      acc[row.itemId as BuildingType] = row.unlocked;
      return acc;
    },
    { ...DEFAULT_UNLOCKS },
  );

  const spellUnlockMap = spellQuery.data.reduce<Record<SpellType, boolean>>(
    (acc, row) => {
      acc[row.itemId as SpellType] = row.unlocked;
      return acc;
    },
    { ...DEFAULT_SPELL_UNLOCKS },
  );

  return {
    profile,
    coins: profile?.coins ?? 0,
    settings: settingsRow,
    unlocks: unlockMap,
    spellUnlocks: spellUnlockMap,
    hasActiveRun: Boolean(activeRunRow),
    activeRun: activeRunRow,
    codexCount: codexQuery.data.filter((entry) => entry.discovered).length,
    doctrineCount: doctrineQuery.data.filter((node) => node.unlocked).length,
  };
}

/**
 * Atomically deducts coins and marks a building as unlocked.
 * @param buildingType - The building to unlock.
 * @returns `true` if the purchase succeeded, `false` if funds are insufficient or the building is already unlocked.
 */
export async function purchaseBuildingUnlock(buildingType: BuildingType) {
  return purchaseUnlockTransaction(buildingType);
}

/**
 * Atomically deducts coins and marks a spell as unlocked.
 * @param spellType - The spell to unlock.
 * @returns `true` if the purchase succeeded, `false` if funds are insufficient or the spell is already unlocked.
 */
export async function purchaseSpellUnlock(spellType: SpellType) {
  return purchaseSpellUnlockTransaction(spellType);
}

/**
 * End-of-run settlement: awards earned coins to the player profile, updates
 * lifetime stats (highest wave, kills, run count), records the run in
 * history, and clears the active-run snapshot.
 *
 * @param input - Run summary including earned coins, wave, kills, result, and timing.
 */
export async function bankRunRewards(input: {
  earnedCoins: number;
  waveReached: number;
  kills: number;
  result: 'defeat' | 'abandoned';
  runId: string;
  durationMs: number;
  biome?: string;
  difficulty?: string;
}) {
  await awardCoins(input.earnedCoins);
  await updatePlayerProfileStats({
    highestWave: input.waveReached,
    lifetimeKillsDelta: input.kills,
    lifetimeRunsDelta: 1,
  });
  await recordRunHistory({
    runId: input.runId,
    waveReached: input.waveReached,
    coinsEarned: input.earnedCoins,
    durationMs: input.durationMs,
    biome: input.biome ?? 'kings-road',
    difficulty: input.difficulty ?? 'pilgrim',
    result: input.result,
  });
  await clearActiveRun(input.runId);
}

/**
 * Marks the current active run as invalid (e.g. corrupt snapshot) and
 * removes it so the player returns to the lobby without banking rewards.
 */
export async function markBrokenRunAndReset() {
  await archiveActiveRun('invalid');
  await clearActiveRun();
}

/**
 * Voluntarily abandons the current active run, archiving it with an
 * 'abandoned' status and clearing the snapshot.  No rewards are banked.
 */
export async function abandonActiveRun() {
  await archiveActiveRun('abandoned');
  await clearActiveRun();
}

/**
 * Persists (upserts) an active-run snapshot so the player can resume later.
 * The `updatedAt` timestamp is set automatically.
 *
 * @param record - Serialised engine state without the `updatedAt` field.
 */
export async function saveActiveRunRecord(record: Omit<ActiveRunSnapshotRecord, 'updatedAt'>) {
  await saveActiveRun(record);
}

/**
 * Loads the most recent active-run snapshot (status = 'active'), if any.
 * @returns The snapshot row, or `undefined` if no active run exists.
 */
export async function loadActiveRunRecord() {
  return loadActiveRun();
}

/**
 * Deletes the active-run snapshot row.
 * @param runId - If provided, only the row with this id is deleted.
 *                Otherwise the current active run is cleared.
 */
export async function clearSavedRun(runId?: string) {
  await clearActiveRun(runId);
}

/**
 * Persists the player's preferred game speed multiplier.
 * @param preferredSpeed - Speed multiplier (e.g. 1, 1.5, 2).
 */
export async function updatePreferredSpeed(preferredSpeed: number) {
  await saveSettings({ preferredSpeed, theme: 'holy-grail' });
}

/**
 * Reads the player's preferred game speed from the settings table.
 * @returns The stored speed multiplier, defaulting to 1 if no row exists.
 */
export async function loadPreferredSpeed() {
  const row = await loadSettings();
  return row?.preferredSpeed ?? 1;
}

/**
 * Reads whether the auto-resume feature is enabled.
 * @returns `true` (the default) if auto-resume is on, `false` otherwise.
 */
export async function loadAutoResumeSetting() {
  const row = await loadSettings();
  return row?.autoResume ?? true;
}

/**
 * Applies a partial update to the singleton settings row.
 * Only the keys present in `patch` are overwritten; all others remain unchanged.
 *
 * @param patch - A subset of setting fields to update.
 */
export async function updateSettings(
  patch: Partial<{
    preferredSpeed: number;
    autoResume: boolean;
    reducedFx: boolean;
    soundEnabled: boolean;
    musicEnabled: boolean;
    hapticsEnabled: boolean;
    cameraIntensity: number;
    theme: string;
  }>,
) {
  await saveSettings(patch);
}

/**
 * Live-query hook returning all codex entry rows.
 * Re-renders whenever a codex entry is discovered.
 *
 * @returns Array of codex entry rows (discovered and undiscovered).
 */
export function useCodexEntries() {
  return useLiveQuery(db.select().from(codexEntries)).data;
}

/**
 * Live-query hook returning all completed run history rows, sorted
 * newest first by createdAt. Re-renders when a new run is recorded.
 *
 * @returns Array of run history rows.
 */
export function useRunHistory() {
  return useLiveQuery(db.select().from(runHistory)).data;
}

/**
 * Live-query hook returning all doctrine node rows.
 * Re-renders whenever a doctrine node is purchased or levelled up.
 *
 * @returns Array of doctrine node rows with their current levels.
 */
export function useDoctrineNodes() {
  return useLiveQuery(db.select().from(doctrineNodes)).data;
}

/**
 * Atomically deducts coins and increments a doctrine node's level by one.
 * Nodes cap at level 5.
 *
 * @param nodeId - Identifier of the doctrine node to upgrade.
 * @param cost - Coin cost for this level-up.
 * @returns `true` if the purchase succeeded, `false` if funds are insufficient or the node is maxed.
 */
export async function purchaseDoctrineNode(nodeId: string, cost: number) {
  return purchaseDoctrineNodeRepo({ nodeId, cost });
}

/**
 * Reads the player's current coin balance.
 * @returns The coin count, defaulting to 0 if the profile row is missing.
 */
export async function loadPlayerCoins() {
  const profile = await loadPlayerProfile();
  return profile?.coins ?? 0;
}

/**
 * Looks up the coin cost to unlock a building from the static BUILDINGS table.
 * @param type - The building type to query.
 * @returns The unlock cost in coins.
 */
export function getUnlockCost(type: BuildingType) {
  return BUILDINGS[type].unlockCost;
}

/**
 * Marks a codex entry as discovered (upsert).  If the entry does not exist
 * it is created; if it already exists it is updated to `discovered = true`.
 *
 * @param entryId - Unique identifier for the codex entry (e.g. "enemy:goblin").
 * @param category - Category grouping (e.g. "enemy", "biome").
 */
export async function discoverCodexEntry(entryId: string, category: string) {
  return discoverCodexEntryRepo(entryId, category);
}
