export const migrations: {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>;
} = {
  journal: {
    entries: [
      {
        idx: 0,
        when: 202603120100,
        tag: '0000_full_foundation',
        breakpoints: true,
      },
      {
        idx: 1,
        when: 202603120101,
        tag: '0001_multi_tier',
        breakpoints: true,
      },
    ],
  },
  migrations: {
    '0000_full_foundation': `
      DROP TABLE IF EXISTS meta_progress;

      CREATE TABLE IF NOT EXISTS player_profile (
        id INTEGER PRIMARY KEY NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0,
        highest_wave INTEGER NOT NULL DEFAULT 0,
        lifetime_kills INTEGER NOT NULL DEFAULT 0,
        lifetime_runs INTEGER NOT NULL DEFAULT 0,
        current_theme TEXT NOT NULL DEFAULT 'holy-grail',
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL,
        preferred_speed REAL NOT NULL DEFAULT 1,
        auto_resume INTEGER NOT NULL DEFAULT 1,
        reduced_fx INTEGER NOT NULL DEFAULT 0,
        sound_enabled INTEGER NOT NULL DEFAULT 1,
        music_enabled INTEGER NOT NULL DEFAULT 1,
        haptics_enabled INTEGER NOT NULL DEFAULT 1,
        camera_intensity REAL NOT NULL DEFAULT 1,
        theme TEXT NOT NULL DEFAULT 'holy-grail'
      );

      CREATE TABLE IF NOT EXISTS unlocks (
        domain TEXT NOT NULL,
        item_id TEXT NOT NULL,
        unlocked INTEGER NOT NULL DEFAULT 0,
        unlocked_at INTEGER,
        PRIMARY KEY(domain, item_id)
      );

      CREATE TABLE IF NOT EXISTS doctrine_nodes (
        node_id TEXT PRIMARY KEY NOT NULL,
        unlocked INTEGER NOT NULL DEFAULT 0,
        unlocked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS codex_entries (
        entry_id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        discovered INTEGER NOT NULL DEFAULT 0,
        discovered_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS content_state (
        id INTEGER PRIMARY KEY NOT NULL,
        schema_version INTEGER NOT NULL,
        content_version TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS active_run (
        id TEXT PRIMARY KEY NOT NULL,
        snapshot_version INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL,
        phase TEXT NOT NULL,
        wave INTEGER NOT NULL,
        biome TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS run_history (
        run_id TEXT PRIMARY KEY NOT NULL,
        wave_reached INTEGER NOT NULL,
        coins_earned INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        biome TEXT NOT NULL DEFAULT 'kings-road',
        difficulty TEXT NOT NULL DEFAULT 'pilgrim',
        result TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `,
    '0001_multi_tier': `
      ALTER TABLE doctrine_nodes ADD COLUMN level INTEGER NOT NULL DEFAULT 0;
    `,
  },
};
