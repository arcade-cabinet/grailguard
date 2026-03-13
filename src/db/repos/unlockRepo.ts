import { and, eq } from 'drizzle-orm';
import { BUILDINGS, type BuildingType, type SpellType } from '../../engine/constants';
import { db } from '../client';
import { playerProfile, unlocks } from '../schema';

function now() {
  return Date.now();
}

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

export async function purchaseSpellUnlockTransaction(spellId: SpellType) {
  const cost = 200; // Flat cost per instruction

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
