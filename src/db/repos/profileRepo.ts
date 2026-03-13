import { eq } from 'drizzle-orm';
import { db } from '../client';
import { playerProfile } from '../schema';

function now() {
  return Date.now();
}

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
