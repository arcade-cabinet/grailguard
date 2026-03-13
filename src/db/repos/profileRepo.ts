/**
 * @module profileRepo
 *
 * CRUD operations for the singleton `player_profile` row (id = 1).
 * Handles coin awards, lifetime stat updates, and first-launch seeding.
 */
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { playerProfile } from '../schema';

function now() {
  return Date.now();
}

/**
 * Reads the singleton player profile row.
 * @returns The profile row, or `undefined` if it has not been seeded yet.
 */
export async function loadPlayerProfile() {
  return db.select().from(playerProfile).where(eq(playerProfile.id, 1)).get();
}

export async function ensurePlayerProfile() {
  await db
    .insert(playerProfile)
    .values({
      id: 1,
      coins: 0,
      highestWave: 0,
      lifetimeKills: 0,
      lifetimeRuns: 0,
      currentTheme: 'holy-grail',
      updatedAt: now(),
    })
    .onConflictDoNothing();
}

/**
 * Adds coins to the player's balance.  No-ops if the profile row is missing.
 * @param amount - Number of coins to add (may be zero or negative, though
 *                 negative values are not validated against the balance).
 */
export async function awardCoins(amount: number) {
  const profile = await loadPlayerProfile();
  if (!profile) return;

  await db
    .update(playerProfile)
    .set({
      coins: profile.coins + amount,
      updatedAt: now(),
    })
    .where(eq(playerProfile.id, 1));
}

/**
 * Merges lifetime stat deltas into the player profile.
 * - `highestWave` is set to the max of the current value and the provided value.
 * - `lifetimeKillsDelta` and `lifetimeRunsDelta` are added to their respective totals.
 * - `currentTheme` replaces the stored theme if provided.
 *
 * @param patch - Partial stat updates; omitted fields are left unchanged.
 */
export async function updatePlayerProfileStats(patch: {
  highestWave?: number;
  lifetimeKillsDelta?: number;
  lifetimeRunsDelta?: number;
  currentTheme?: string;
}) {
  const profile = await loadPlayerProfile();
  if (!profile) return;

  await db
    .update(playerProfile)
    .set({
      highestWave: Math.max(profile.highestWave, patch.highestWave ?? profile.highestWave),
      lifetimeKills: profile.lifetimeKills + (patch.lifetimeKillsDelta ?? 0),
      lifetimeRuns: profile.lifetimeRuns + (patch.lifetimeRunsDelta ?? 0),
      currentTheme: patch.currentTheme ?? profile.currentTheme,
      updatedAt: now(),
    })
    .where(eq(playerProfile.id, 1));
}
