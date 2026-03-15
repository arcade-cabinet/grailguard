/**
 * @module settingsRepo
 *
 * Read/write operations for the singleton `settings` row (id = 1).
 * Covers game speed, accessibility flags, audio toggles, camera shake,
 * and theme selection.
 */
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
      tutorialComplete: false,
      highContrast: false,
    })
    .onConflictDoNothing();
}

/**
 * Reads the singleton settings row.
 * @returns The settings row, or `undefined` if not yet seeded.
 */
export async function loadSettings() {
  return db.select().from(settings).where(eq(settings.id, 1)).get();
}

/**
 * Applies a partial update to the settings row.
 * Only provided keys are overwritten; all others remain unchanged.
 *
 * @param patch - A subset of setting fields to persist.
 */
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
    tutorialComplete: boolean;
    highContrast: boolean;
  }>,
) {
  await db.update(settings).set(patch).where(eq(settings.id, 1));
}
