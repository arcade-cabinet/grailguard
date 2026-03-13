---
title: "Grailguard System Patterns"
domain: architecture
audience: all-agents
reads-before: [projectbrief.md, productContext.md]
last-updated: 2026-03-13
status: stable
summary: "Architecture decisions, data flow, ECS patterns, and component relationships"
---

# System Patterns

## Architecture Overview

Grailguard enforces a strict three-layer split:

```
┌─────────────────────────────────────────────────┐
│  Rendering Layer (React Three Fiber + React Native) │
│  src/components/3d/  -- 3D meshes, arena, camera  │
│  src/components/ui/  -- HUD, toychest, modals      │
│  src/app/            -- Expo Router screens         │
├─────────────────────────────────────────────────┤
│  Simulation Layer (Koota ECS + Yuka AI)            │
│  src/engine/GameEngine.ts  -- world, traits, systems│
│  src/engine/constants.ts   -- data dictionaries     │
│  src/engine/mapGenerator.ts -- procedural road      │
│  src/engine/selectors.ts   -- ECS query helpers     │
│  src/engine/SoundManager.ts -- Tone.js audio        │
├─────────────────────────────────────────────────┤
│  Persistence Layer (SQLite + Drizzle ORM)          │
│  src/db/schema.ts      -- table definitions         │
│  src/db/repos/*.ts     -- repository functions      │
│  src/db/meta.ts        -- service facade            │
│  src/db/migrations.ts  -- schema migrations         │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. ECS as Runtime Authority

All live game state lives in the Koota ECS world via traits:
- `GameSession` -- run-level state (gold, wave, phase, resources)
- `WaveState` -- spawn queue and timer
- `Building`, `Unit`, `Projectile`, `Particle`, `FloatingText`, `WorldEffect` -- entity data
- `ResourceCart` -- logistics transport entities
- `AutosaveState` -- dirty tracking for checkpoint persistence

React components **never** own simulation truth. They read traits and dispatch `WorldCommand` messages.

### 2. Command Queue Pattern

UI actions flow through `queueWorldCommand()` which buffers commands processed each frame by `processCommands()`. This decouples UI events from simulation timing.

Command types: `build`, `upgrade`, `sellBuilding`, `startWave`, `castSpell`, `toggleGameSpeed`, `selectEntity`, `setTargeting`, `draftRelic`, `setPlacementPreview`.

### 3. Yuka AI for Unit Movement

Enemy pathfinding uses Yuka's `FollowPathBehavior` along the road spline. Allied units use `SeekBehavior` to intercept enemies and `SeparationBehavior` for spacing. Each non-wall unit has a Yuka `Vehicle` linked by entity ID.

### 4. SQLite for Durable State

All persistent data goes through Drizzle ORM repositories:
- `profileRepo` -- player coins, stats, highest wave
- `unlockRepo` -- building/spell unlocks (purchase transactions)
- `runRepo` -- active run snapshots (versioned JSON), run history
- `settingsRepo` -- user preferences
- `doctrineRepo` -- skill tree node levels
- `codexRepo` -- discovered encyclopedia entries
- `bootstrapRepo` -- seed data initialization

Active runs serialize the ECS world to a JSON snapshot (`ActiveRunSnapshotV1`) stored in SQLite, enabling resume.

### 5. Rendering Rules

- **No React state for per-frame updates.** Use `useFrame` + `useRef` for position/rotation.
- **InstancedMesh** for high-volume effects (particles, scenery).
- **Preload all GLBs** via `useGLTF.preload()` before gameplay.
- **React Native primitives only** for 2D UI -- no DOM APIs.

## Data Flow

```
User Input (touch/click)
    |
    v
queueWorldCommand({ type: 'build', ... })
    |
    v
processCommands() [called each frame in stepRunWorld]
    |
    v
Mutation of ECS traits (GameSession, Building, Unit, etc.)
    |
    v
updateGameWorld(dt) [systems: wave, buildings, logistics, units, projectiles, particles]
    |
    v
React components re-read traits via koota/react hooks
    |
    v
3D meshes update in useFrame; UI re-renders on trait changes
```

## Placement Validation

Buildings have placement rules based on distance to the road spline:
- **Walls**: must be ON the road (`roadDistance <= 4`)
- **Spawners/Turrets**: must be OFF the road (`roadDistance >= 7`)
- **Tracks**: can be placed anywhere (no road constraint)
- **No overlaps**: minimum 5-unit spacing between structures
