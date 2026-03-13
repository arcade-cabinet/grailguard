---
title: "Persistence Architecture"
domain: architecture
audience: db-agents
reads-before: [../memory-bank/systemPatterns.md]
last-updated: 2026-03-13
status: stable
summary: "SQLite schema, Drizzle ORM repos, snapshot serialization, and data flow"
---

# Persistence Architecture

All durable state lives in SQLite via `expo-sqlite` + `drizzle-orm`. The database is initialized by `DatabaseProvider.tsx` which runs migrations and seeds on app start.

## Schema (`src/db/schema.ts`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `player_profile` | Player identity + stats | coins, highestWave, lifetimeKills, lifetimeRuns |
| `settings` | User preferences | preferredSpeed, autoResume, reducedFx, sound/music/haptics |
| `unlocks` | Building/spell unlock state | domain, itemId, unlocked (composite PK) |
| `doctrine_nodes` | Skill tree node levels | nodeId, level, unlocked |
| `codex_entries` | Discovery encyclopedia | entryId, category, discovered |
| `content_state` | Schema/content versioning | schemaVersion, contentVersion |
| `active_run` | In-progress run snapshot | snapshotJson, phase, wave, biome, status |
| `run_history` | Completed run records | waveReached, coinsEarned, durationMs, result |

## Repository Pattern

Each domain has a focused repo file under `src/db/repos/`:

| Repo | Responsibility |
|------|---------------|
| `bootstrapRepo.ts` | Ensure seed data exists on first launch |
| `profileRepo.ts` | Load/update player profile, award coins |
| `settingsRepo.ts` | Load/save user settings |
| `unlockRepo.ts` | Purchase building/spell unlocks (transactional) |
| `doctrineRepo.ts` | Purchase doctrine nodes (coin deduction + node creation) |
| `codexRepo.ts` | Discover codex entries |
| `runRepo.ts` | Save/load/clear active runs, record run history |

## Service Facade (`src/db/meta.ts`)

`meta.ts` provides the public API for UI components:

- **React hooks**: `useMetaProgress()`, `useCodexEntries()`, `useDoctrineNodes()` -- live queries via `useLiveQuery`
- **Async operations**: `purchaseBuildingUnlock()`, `bankRunRewards()`, `saveActiveRunRecord()`, etc.

UI components call meta.ts functions. Meta.ts delegates to the appropriate repo.

## Active Run Serialization

The active run is serialized as `ActiveRunSnapshotV1`:

```typescript
interface ActiveRunSnapshotV1 {
  version: 1;
  session: SessionState;      // GameSession trait data
  waveState: RuntimeState;     // WaveState trait data
  buildings: Array<{...}>;     // All Building entities + positions
  units: Array<{...}>;         // All Unit entities + positions + facing
}
```

This JSON blob is stored in `active_run.snapshot_json`. On resume, the engine hydrates the ECS world from this snapshot.

## Key Rules

1. UI must not perform multi-step persistence inline -- use repo/service functions
2. Active runs are stored as versioned JSON, not decomposed into SQL tables
3. Purchase operations (unlocks, doctrines) are transactional (coin deduction + item creation)
4. `useLiveQuery` provides reactive data binding for React components
