import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { BUILDINGS, type BuildingType, type SpellType } from '../engine/constants';
import { db } from './client';
import { discoverCodexEntry as discoverCodexEntryRepo } from './repos/codexRepo';
import { ensureSeedData as ensureBootstrapSeedData } from './repos/bootstrapRepo';
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
import { purchaseUnlockTransaction, purchaseSpellUnlockTransaction } from './repos/unlockRepo';
import { activeRun, codexEntries, doctrineNodes, playerProfile, settings, unlocks } from './schema';

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

export async function ensureSeedData() {
  await ensureBootstrapSeedData();
}

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

export async function purchaseBuildingUnlock(buildingType: BuildingType) {
  return purchaseUnlockTransaction(buildingType);
}

export async function purchaseSpellUnlock(spellType: SpellType) {
  return purchaseSpellUnlockTransaction(spellType);
}

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

export async function markBrokenRunAndReset() {
  await archiveActiveRun('invalid');
  await clearActiveRun();
}

export async function abandonActiveRun() {
  await archiveActiveRun('abandoned');
  await clearActiveRun();
}

export async function saveActiveRunRecord(record: Omit<ActiveRunSnapshotRecord, 'updatedAt'>) {
  await saveActiveRun(record);
}

export async function loadActiveRunRecord() {
  return loadActiveRun();
}

export async function clearSavedRun(runId?: string) {
  await clearActiveRun(runId);
}

export async function updatePreferredSpeed(preferredSpeed: number) {
  await saveSettings({ preferredSpeed, theme: 'holy-grail' });
}

export async function loadPreferredSpeed() {
  const row = await loadSettings();
  return row?.preferredSpeed ?? 1;
}

export async function loadAutoResumeSetting() {
  const row = await loadSettings();
  return row?.autoResume ?? true;
}

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

export function useCodexEntries() {
  return useLiveQuery(db.select().from(codexEntries)).data;
}

export function useDoctrineNodes() {
  return useLiveQuery(db.select().from(doctrineNodes)).data;
}

export async function purchaseDoctrineNode(nodeId: string, cost: number) {
  return purchaseDoctrineNodeRepo({ nodeId, cost });
}

export async function loadPlayerCoins() {
  const profile = await loadPlayerProfile();
  return profile?.coins ?? 0;
}

export function getUnlockCost(type: BuildingType) {
  return BUILDINGS[type].unlockCost;
}

export async function discoverCodexEntry(entryId: string, category: string) {
  return discoverCodexEntryRepo(entryId, category);
}
