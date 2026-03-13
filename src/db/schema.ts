import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { BuildingType } from '../engine/constants';

export type UnlockDomain = 'building' | 'relic' | 'biome' | 'challenge' | 'spell';

export const playerProfile = sqliteTable('player_profile', {
  id: integer('id').primaryKey(),
  coins: integer('coins').notNull().default(0),
  highestWave: integer('highest_wave').notNull().default(0),
  lifetimeKills: integer('lifetime_kills').notNull().default(0),
  lifetimeRuns: integer('lifetime_runs').notNull().default(0),
  currentTheme: text('current_theme').notNull().default('holy-grail'),
  updatedAt: integer('updated_at').notNull(),
});

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
});

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

export const doctrineNodes = sqliteTable('doctrine_nodes', {
  nodeId: text('node_id').primaryKey(),
  level: integer('level').notNull().default(0),
  unlocked: integer('unlocked', { mode: 'boolean' }).notNull().default(false),
  unlockedAt: integer('unlocked_at'),
});

export const codexEntries = sqliteTable('codex_entries', {
  entryId: text('entry_id').primaryKey(),
  category: text('category').notNull(),
  discovered: integer('discovered', { mode: 'boolean' }).notNull().default(false),
  discoveredAt: integer('discovered_at'),
});

export const contentState = sqliteTable('content_state', {
  id: integer('id').primaryKey(),
  schemaVersion: integer('schema_version').notNull(),
  contentVersion: text('content_version').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const activeRun = sqliteTable('active_run', {
  id: text('id').primaryKey(),
  snapshotVersion: integer('snapshot_version').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  phase: text('phase').notNull(),
  wave: integer('wave').notNull(),
  biome: text('biome').notNull(),
  status: text('status').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const runHistory = sqliteTable('run_history', {
  runId: text('run_id').primaryKey(),
  waveReached: integer('wave_reached').notNull(),
  coinsEarned: integer('coins_earned').notNull(),
  durationMs: integer('duration_ms').notNull().default(0),
  biome: text('biome').notNull().default('kings-road'),
  difficulty: text('difficulty').notNull().default('pilgrim'),
  result: text('result').notNull(),
  createdAt: integer('created_at').notNull(),
});

export type BuildingUnlockRow = {
  itemId: BuildingType;
  unlocked: boolean;
};
