/**
 * @module unlockRepo
 *
 * Transactional purchase logic for building and spell unlocks.
 * Each purchase atomically verifies the player has sufficient coins,
 * deducts the cost, and flips the `unlocked` flag -- all within a
 * single SQLite transaction to prevent double-spend.
 *
 * Also seeds the default unlock rows on first launch via {@link ensureUnlocks}.
 */
import { and, eq } from 'drizzle-orm';
import { BUILDINGS, type BuildingType, type SpellType } from '../../engine/constants';
import { db } from '../client';
import { playerProfile, unlocks } from '../schema';
import { now } from '../utils/time';

const DEFAULT_BUILDING_UNLOCKS: Record<BuildingType, boolean> = {
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

export async function ensureUnlocks() {
  for (const [itemId, unlocked] of Object.entries(DEFAULT_BUILDING_UNLOCKS) as [
    BuildingType,
    boolean,
  ][]) {
    await db
      .insert(unlocks)
      .values({
        domain: 'building',
        itemId,
        unlocked,
        unlockedAt: unlocked ? now() : null,
      })
      .onConflictDoNothing();
  }

  for (const [itemId, unlocked] of Object.entries(DEFAULT_SPELL_UNLOCKS) as [
    SpellType,
    boolean,
  ][]) {
    await db
      .insert(unlocks)
      .values({
        domain: 'spell',
        itemId,
        unlocked,
        unlockedAt: unlocked ? now() : null,
      })
      .onConflictDoNothing();
  }
}

/**
 * Atomically purchases a building unlock: checks coin balance, deducts the
 * cost defined in `BUILDINGS`, and sets `unlocked = true`.
 *
 * @param buildingType - The building to unlock.
 * @returns `true` if the transaction committed successfully.
 *          `false` if the profile is missing, the building is already
 *          unlocked, or the player has insufficient coins.
 */
export async function purchaseUnlockTransaction(buildingType: BuildingType) {
  const cost = BUILDINGS[buildingType].unlockCost;
  if (cost <= 0) return true;

  return db.transaction(async (tx) => {
    const profile = await tx.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
    const unlockRow = await tx
      .select()
      .from(unlocks)
      .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, buildingType)))
      .get();

    if (!profile || !unlockRow || unlockRow.unlocked || profile.coins < cost) {
      return false;
    }

    await tx
      .update(playerProfile)
      .set({
        coins: profile.coins - cost,
        updatedAt: now(),
      })
      .where(eq(playerProfile.id, 1));

    await tx
      .update(unlocks)
      .set({
        unlocked: true,
        unlockedAt: now(),
      })
      .where(and(eq(unlocks.domain, 'building'), eq(unlocks.itemId, buildingType)));

    return true;
  });
}

const SPELL_UNLOCK_COSTS: Record<SpellType, number> = {
  smite: 0,
  holy_nova: 200,
  zealous_haste: 200,
  earthquake: 300,
  chrono_shift: 300,
  meteor_strike: 400,
  divine_shield: 400,
};

/**
 * Atomically purchases a spell unlock: checks coin balance, deducts
 * the cost from {@link SPELL_UNLOCK_COSTS}, and sets `unlocked = true`.
 *
 * @param spellId - The spell to unlock.
 * @returns `true` if the transaction committed successfully.
 *          `false` if the profile is missing, the spell is already
 *          unlocked, or the player has insufficient coins.
 */
export async function purchaseSpellUnlockTransaction(spellId: SpellType) {
  const cost = SPELL_UNLOCK_COSTS[spellId] ?? 200;

  return db.transaction(async (tx) => {
    const profile = await tx.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
    const unlockRow = await tx
      .select()
      .from(unlocks)
      .where(and(eq(unlocks.domain, 'spell'), eq(unlocks.itemId, spellId)))
      .get();

    if (!profile || !unlockRow || unlockRow.unlocked || profile.coins < cost) {
      return false;
    }

    await tx
      .update(playerProfile)
      .set({
        coins: profile.coins - cost,
        updatedAt: now(),
      })
      .where(eq(playerProfile.id, 1));

    await tx
      .update(unlocks)
      .set({
        unlocked: true,
        unlockedAt: now(),
      })
      .where(and(eq(unlocks.domain, 'spell'), eq(unlocks.itemId, spellId)));

    return true;
  });
}
