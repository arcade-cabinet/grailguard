/**
 * @module schema
 *
 * Drizzle ORM table definitions for the Grailguard local SQLite database.
 *
 * The schema covers all persistent meta-progression state: player profile,
 * user settings, building/spell unlocks, doctrine skill-tree nodes, codex
 * bestiary entries, content versioning, active-run snapshots, and completed
 * run history.  Every table is created by the migration runner in
 * {@link ./migrations.ts} and seeded via {@link ./repos/bootstrapRepo.ts}.
 */
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { BuildingType } from '../engine/constants';

/**
 * Discriminator for rows in the {@link unlocks} table.
 * Each domain groups a distinct family of unlockable items
 * (e.g. buildings, spells, relics, biomes, challenges).
 */
export type UnlockDomain = 'building' | 'relic' | 'biome' | 'challenge' | 'spell';

/**
 * Singleton row (id = 1) holding the player's cross-run progression stats:
 * currency balance, lifetime kill/run counters, and the selected visual theme.
 */
export const playerProfile = sqliteTable('player_profile', {
  id: integer('id').primaryKey(),
  coins: integer('coins').notNull().default(0),
  highestWave: integer('highest_wave').notNull().default(0),
  lifetimeKills: integer('lifetime_kills').notNull().default(0),
  lifetimeRuns: integer('lifetime_runs').notNull().default(0),
  currentTheme: text('current_theme').notNull().default('holy-grail'),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Singleton row (id = 1) for user preferences: game speed, auto-resume
 * behavior, accessibility options, audio toggles, camera shake intensity,
 * and the active UI theme.
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  preferredSpeed: real('preferred_speed').notNull().default(1),
  autoResume: integer('auto_resume', { mode: 'boolean' }).notNull().default(true),
  reducedFx: integer('reduced_fx', { mode: 'boolean' }).notNull().default(false),
  soundEnabled: integer('sound_enabled', { mode: 'boolean' }).notNull().default(true),
  musicEnabled: integer('music_enabled', { mode: 'boolean' }).notNull().default(true),
  hapticsEnabled: integer('haptics_enabled', { mode: 'boolean' }).notNull().default(true),
  cameraIntensity: real('camera_intensity').notNull().default(1),
  theme: text('theme').notNull().default('holy-grail'),
  tutorialComplete: integer('tutorial_complete', { mode: 'boolean' }).notNull().default(false),
  highContrast: integer('high_contrast', { mode: 'boolean' }).notNull().default(false),
});

/**
 * Multi-domain unlock ledger keyed by (domain, itemId).
 * Tracks whether each building, spell, relic, biome, or challenge
 * has been purchased and when.  Joined to {@link playerProfile}
 * during purchase transactions.
 */
export const unlocks = sqliteTable(
  'unlocks',
  {
    domain: text('domain').$type<UnlockDomain>().notNull(),
    itemId: text('item_id').notNull(),
    unlocked: integer('unlocked', { mode: 'boolean' }).notNull().default(false),
    unlockedAt: integer('unlocked_at'),
  },
  (table) => [primaryKey({ columns: [table.domain, table.itemId] })],
);

/**
 * Persistent skill-tree nodes for the Doctrine system.
 * Each node can be levelled up to 5, granting permanent passive bonuses.
 * Purchased with coins via {@link ../repos/doctrineRepo.ts}.
 */
export const doctrineNodes = sqliteTable('doctrine_nodes', {
  nodeId: text('node_id').primaryKey(),
  level: integer('level').notNull().default(0),
  unlocked: integer('unlocked', { mode: 'boolean' }).notNull().default(false),
  unlockedAt: integer('unlocked_at'),
});

/**
 * Bestiary / lore codex entries.
 * Rows are seeded undiscovered; they flip to `discovered = true`
 * when the player encounters the corresponding enemy or biome in-game.
 */
export const codexEntries = sqliteTable('codex_entries', {
  entryId: text('entry_id').primaryKey(),
  category: text('category').notNull(),
  discovered: integer('discovered', { mode: 'boolean' }).notNull().default(false),
  discoveredAt: integer('discovered_at'),
});

/**
 * Singleton row (id = 1) tracking the current schema and content version.
 * Used by the bootstrap process to detect when seed data needs updating
 * after an app update ships new content.
 */
export const contentState = sqliteTable('content_state', {
  id: integer('id').primaryKey(),
  schemaVersion: integer('schema_version').notNull(),
  contentVersion: text('content_version').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Active (in-progress) run snapshot.  The full engine state is serialised
 * into `snapshotJson` so the player can resume after a crash or app
 * background.  Denormalised `phase`, `wave`, `biome`, and `status` columns
 * allow quick queries without deserialising the blob.
 */
export const activeRun = sqliteTable(
  'active_run',
  {
    id: text('id').primaryKey(),
    snapshotVersion: integer('snapshot_version').notNull(),
    snapshotJson: text('snapshot_json').notNull(),
    phase: text('phase').notNull(),
    wave: integer('wave').notNull(),
    biome: text('biome').notNull(),
    status: text('status').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('idx_active_run_status').on(table.status)]
);

/**
 * Immutable log of completed (defeated or abandoned) runs.
 * Each row records the wave reached, coins earned, duration, biome,
 * difficulty, and result for historical stats and leaderboard display.
 */
export const runHistory = sqliteTable(
  'run_history',
  {
    runId: text('run_id').primaryKey(),
    waveReached: integer('wave_reached').notNull(),
    coinsEarned: integer('coins_earned').notNull(),
    durationMs: integer('duration_ms').notNull().default(0),
    biome: text('biome').notNull().default('kings-road'),
    difficulty: text('difficulty').notNull().default('pilgrim'),
    result: text('result').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_run_history_created_at').on(table.createdAt)]
);

/**
 * Lightweight projection of a building unlock row used by UI components
 * to render lock/unlock badges without pulling the full unlock record.
 */
export type BuildingUnlockRow = {
  itemId: BuildingType;
  unlocked: boolean;
};