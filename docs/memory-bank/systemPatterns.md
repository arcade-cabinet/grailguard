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

### Why ECS Over Zustand
Zustand was initially considered for runtime state (as discussed in the original Gemini brainstorming). It was rejected because storing unit positions in React `useState` sends updates across the React Native bridge 60 times per second per entity. With 50+ units, the bridge would be saturated. Koota ECS keeps all per-frame data outside React entirely, only crossing the bridge for UI-relevant reads via `useTrait`.

### Why Polynomial Wave Scaling
Logarithmic difficulty curves flatten out, making late-game trivially easy. The wave budget formula `B(W) = floor(50 * 1.15^W + 2W²)` combines exponential and quadratic growth to ensure the player is eventually overwhelmed, creating natural run endings.

### Why JSON Snapshot Over SQL Decomposition
Active run persistence uses a single JSON blob (`ActiveRunSnapshotV1`) rather than decomposing ECS entities into SQL rows. This avoids tight coupling between the ECS trait schema and the database schema, simplifies versioning, and makes save/load a single atomic operation.

### Why Monolithic Engine (and Why It Should Change)
feat/poc-reset consolidates all simulation logic into a single `GameEngine.ts` (~2200 LOC). Initial-release used ~15 modular engine files (`BuildingSystem.ts`, `CombatSystem.ts`, `waveDirector.ts`, `EnemyBrain.ts`, etc.) as pure-function subsystems. The monolith is simpler to reason about during rapid prototyping, but sacrifices testability — initial-release could unit-test individual systems in isolation, while feat/poc-reset can only integration-test the entire engine. Decomposition is planned.

### Data-Driven Configuration Pattern
Initial-release used an external `gameConfig.json` with all balance parameters (wave budget coefficients, unit stats, building costs, spawn timers). feat/poc-reset uses `constants.ts` TypeScript dictionaries. The JSON approach enables balance iteration without code changes — game designers can tune values, QA can swap configs for testing, and A/B testing becomes trivial. This pattern should be adopted as the game matures past prototyping.

### Audio Event Bus Pattern
Initial-release decoupled audio from simulation via a 3-layer architecture: SoundManager (synthesis) → AudioBridge (event translator) → AmbienceManager (environmental). The simulation emits typed events; the bridge maps them to audio commands. This prevents import coupling between engine and audio, makes audio testable in isolation, and allows swapping audio backends (e.g., Tone.js → native audio on mobile). feat/poc-reset's direct `SoundManager` imports work but will need this decoupling as audio complexity grows.

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
