---
title: "Game Engine Architecture"
domain: architecture
audience: engine-agents
reads-before: [../memory-bank/systemPatterns.md]
last-updated: 2026-03-14
status: stable
summary: "ECS world structure, trait definitions, simulation systems, and game loop"
---

# Game Engine Architecture

`src/engine/GameEngine.ts` is the orchestration layer. It owns all live game state via Koota ECS traits and delegates simulation logic to 9 decomposed subsystem modules under `src/engine/systems/`.

## ECS Traits (Components)

| Trait | Purpose | Key Fields |
|-------|---------|------------|
| `GameSession` | Run-level state | gold, wood, ore, gem, faith, health, wave, phase, biome, doctrines, relics, spells |
| `WaveState` | Spawn queue + timer | spawnQueue, spawnTimer |
| `AutosaveState` | Dirty tracking | dirty, reason, lastCheckpointAt |
| `Building` | Placed structure | type, levelSpawn, levelStats, timer, cooldown, targeting |
| `Unit` | Combat entity | type, team, hp, damage, speed, range, atkSpd, affix, poison, frozen |
| `Projectile` | In-flight attack | targetId, damage, speed, isHeal, isPoison, splashRadius, isSlow |
| `Particle` | Visual effect | color, life, size, velocity (vx/vy/vz) |
| `FloatingText` | Damage/heal number | text, color, life, riseSpeed |
| `WorldEffect` | Ground effect circle | kind (smite/boss_spawn), color, life, radius |
| `ResourceCart` | Logistics transport | resource type, path nodes, pathIndex |
| `Position` | World coordinates | x, y, z |
| `Facing` | Rotation | y (radians) |
| `CodexId` | Discovery tag | id (unit/building type string) |

## Engine Decomposition

The engine is decomposed into 9 subsystem modules under `src/engine/systems/`:

| Module | Responsibility |
|--------|---------------|
| `waveSystem.ts` | Wave spawning, build timer, wave completion |
| `combatSystem.ts` | Melee/ranged combat, targeting, damage |
| `buildingSystem.ts` | Resource generation, turret firing, unit spawning |
| `logisticsSystem.ts` | ResourceCart movement, track routing, delivery |
| `projectileSystem.ts` | Projectile movement, impact effects |
| `spellSystem.ts` | Spell casting, cooldowns, faith cost |
| `vfxSystem.ts` | Particles, floating text, world effects |
| `codexSystem.ts` | Auto-discovery encyclopedia scanning |
| `biomeSystem.ts` | Biome modifiers and visual adaptation |
| `rng.ts` | Seeded deterministic PRNG (mulberry32) |

Additional modules:
- `src/engine/ai/enemyBrain.ts` -- Enemy steering with flocking behaviors (alignment, cohesion, separation, evasion)
- `src/engine/ai/playerGovernor.ts` -- GOAP autonomous play AI
- `src/engine/audio/audioBridge.ts` -- Typed event bus decoupling engine from audio
- `src/engine/audio/ambienceManager.ts` -- Environmental audio management

## Simulation Systems

Called each frame by `updateGameWorld(dt)` in this order:

1. **Yuka AI update** -- `yukaManager.update(dt)` moves vehicles along paths
2. **Wave State** -- Build timer countdown, enemy spawning from queue, wave completion detection (`waveSystem`)
3. **Buildings** -- Resource generation (lumber/mine), turret targeting + firing, unit spawning (`buildingSystem`)
4. **Logistics** -- ResourceCart movement along track paths, delivery to sinks (`logisticsSystem`)
5. **Units** -- Poison/regen ticks, Yuka position sync, combat targeting, attack execution (`combatSystem`)
6. **Projectiles** -- Move toward target, apply damage/effects on impact (`projectileSystem`)
7. **VFX** -- Floating text rise/fade, particles physics, world effect lifetime (`vfxSystem`)
8. **Codex Discovery** -- Scan for new entity types to record (`codexSystem`)

### AI & Pathfinding

- Enemy units use Yuka `FollowPathBehavior` along the road spline with offset distance 1.5
- Allied units use reversed road path to intercept enemies
- All non-wall units have `SeparationBehavior` (weight 2.0) for collision avoidance
- Units follow continuous coordinate movement, NOT grid-snapping

#### Enemy Flocking Behaviors (from initial-release)

Initial-release `EnemyBrain.ts` implemented richer enemy movement via Yuka steering behaviors:

| Behavior | Weight | Purpose |
|----------|-------:|---------|
| AlignmentBehavior | 0.5 | Enemies move in the same direction as nearby allies |
| CohesionBehavior | 0.5 | Enemies cluster together into groups |
| SeparationBehavior | 1.0 | Prevents overlap (highest priority) |
| EvadeBehavior | 0.4 | Dodge allied ranged attacks |

Enemies also used per-lane path offsets for multi-lane roads, creating wider attack fronts.

#### GOAP Player Governor (from initial-release)

Initial-release implemented an autonomous player AI (`PlayerGovernorBrain.ts`) using Yuka's GOAP (Goal-Oriented Action Planning). This AI could play the game without human input:

- **Goals:** AttackGoal, MoveToSanctuaryGoal, BuildStructureGoal, RepairGoal, SmiteGoal, StartWaveGoal
- **Think evaluators** scored each goal's desirability based on game state (e.g., BuildStructureGoal scores higher when gold is abundant and wave pressure is low)
- **Use case:** Testing, demo mode, balance validation, and eventual "auto-play" feature

## Command Queue

UI dispatches commands via `queueWorldCommand()`. Processed once per frame by `processCommands()`:

```typescript
type WorldCommand =
  | { type: 'build'; buildingType; position }
  | { type: 'upgrade'; entityId; branch: 'spawn' | 'stats' }
  | { type: 'sellBuilding'; entityId }
  | { type: 'startWave' }
  | { type: 'castSpell'; spellId }
  | { type: 'toggleGameSpeed' }
  | { type: 'selectEntity'; entityId }
  | { type: 'setTargeting'; entityId; targeting }
  | { type: 'draftRelic'; relicId }
  | { type: 'setPlacementPreview'; buildingType; preview }
```

## Run Lifecycle

```
createRunWorld(options)    -- Initialize ECS world, generate road, set starting resources
  |
stepRunWorld(dt)           -- Called each frame from Arena's useFrame
  |                          processCommands() -> updateGameWorld(dt)
  |
serializeActiveRun()       -- Snapshot ECS state to ActiveRunSnapshotV1
  |
hydrateRunWorld(snapshot)  -- Restore ECS world from saved snapshot
  |
disposeRunWorld()          -- Reset ECS world on unmount
```

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime authority | Koota ECS | Zustand was considered but rejected -- ECS provides trait-based queries and avoids React state churn for 60+ entities updating per frame |
| AI framework | Yuka | Provides `FollowPathBehavior` and `SeparationBehavior` out of the box; GOAP (Goal-Oriented Action Planning) considered for future complex unit AI |
| State bridge | Command queue | UI cannot mutate ECS directly; `queueWorldCommand()` decouples UI event timing from simulation frame timing |
| Save format | JSON snapshot | Full ECS state serialized as single JSON blob rather than decomposed SQL rows -- simpler, versioned, and avoids schema coupling |
| Engine structure | Decomposed subsystems | Orchestration in `GameEngine.ts`; logic in 9 pure-function modules under `src/engine/systems/`. Each system is independently testable. |
| Game config | 23 JSON data files | All balance parameters externalized to `src/data/*.json`. Enables balance iteration without code changes, swappable test configs, and clean data/logic separation. |

### Audio Bridge Pattern

Audio is separated into three decoupled layers:
1. **SoundManager** (`src/engine/SoundManager.ts`) — Low-level Tone.js synthesis (oscillators, envelopes, effects)
2. **AudioBridge** (`src/engine/audio/audioBridge.ts`) — Typed event bus translating game events to audio commands
3. **AmbienceManager** (`src/engine/audio/ambienceManager.ts`) — Environmental audio (wind, forest, biome-specific loops)

The simulation layer never imports audio directly — it emits typed events that the bridge translates to SoundManager calls.

### Road Template System (from initial-release)

Initial-release implemented pre-designed road templates (`src/engine/roads/templates.ts`) with 3 layouts:
- **Template 1:** Simple S-curve with 2 lanes
- **Template 2:** U-turn with 3 lanes, creating natural kill zones
- **Template 3:** Complex winding path with 4 lanes

Each template defined tile-level placement with lane offsets, enabling wider enemy fronts and more strategic placement decisions. feat/poc-reset uses procedural CatmullRom spline generation instead, which is more varied but less strategically designed.

## Completed Work (formerly Planned)

- [x] Decompose `GameEngine.ts` into 9 subsystem modules
- [x] Replace `Math.random()` with seeded PRNG (mulberry32 in `rng.ts`)
- [x] GOAP PlayerGovernorBrain for autonomous play (`playerGovernor.ts`)
- [x] Data-driven JSON configs (23 files in `src/data/`)
- [x] Audio bridge pattern (`audioBridge.ts` + `ambienceManager.ts`)
- [x] Enemy flocking behaviors (alignment, cohesion, separation, evasion in `enemyBrain.ts`)
- [x] Telemetry interface (`telemetry.ts`)

## Planned Work

- [ ] Add reduced-FX path (skip particles/floating text when setting enabled)
- [ ] GOAP for advanced unit AI -- clerics dynamically plan heal routes, knights prioritize boss targets
- [ ] Road template system: curated multi-lane layouts alongside procedural generation

## Testing Expectations

The repo must maintain automated checks for:
- Multi-wave engine progression
- Save/hydrate parity (serialize → deserialize → re-serialize must produce identical output)
- Reward finalization exactly once (no double-banking)
- Long-run entity cleanup (no memory leaks over 50+ waves)
