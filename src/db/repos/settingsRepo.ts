import { eq } from 'drizzle-orm';
import { db } from '../client';
import { settings } from '../schema';

export async function ensureSettings() {
  await db
    .insert(settings)
    .values({
      id: 1,
      preferredSpeed: 1,
      autoResume: true,
      reducedFx: false,
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      cameraIntensity: 1,
      theme: 'holy-grail',
    })
    .onConflictDoNothing();
}

export async function loadSettings() {
  return db.select().from(settings).where(eq(settings.id, 1)).get();
}

export async function saveSettings(
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
  await db.update(settings).set(patch).where(eq(settings.id, 1));
}
