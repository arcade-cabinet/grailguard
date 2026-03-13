---
title: "Game Engine Architecture"
domain: architecture
audience: engine-agents
reads-before: [../memory-bank/systemPatterns.md]
last-updated: 2026-03-13
status: stable
summary: "ECS world structure, trait definitions, simulation systems, and game loop"
---

# Game Engine Architecture

`src/engine/GameEngine.ts` is the simulation core. It owns all live game state via Koota ECS traits and runs all game systems each frame.

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

## Simulation Systems

Called each frame by `updateGameWorld(dt)` in this order:

1. **Yuka AI update** -- `yukaManager.update(dt)` moves vehicles along paths
2. **Wave State** -- Build timer countdown, enemy spawning from queue, wave completion detection
3. **Buildings** -- Resource generation (lumber/mine), turret targeting + firing, unit spawning
4. **Logistics** -- ResourceCart movement along track paths, delivery to sinks
5. **Units** -- Poison/regen ticks, Yuka position sync, combat targeting, attack execution
6. **Projectiles** -- Move toward target, apply damage/effects on impact
7. **Floating Text** -- Rise and fade
8. **Particles** -- Physics simulation (gravity, drag)
9. **World Effects** -- Lifetime countdown
10. **Codex Discovery** -- Scan for new entity types to record

### AI & Pathfinding

- Enemy units use Yuka `FollowPathBehavior` along the road spline with offset distance 1.5
- Allied units use reversed road path to intercept enemies
- All non-wall units have `SeparationBehavior` (weight 2.0) for collision avoidance
- Units follow continuous coordinate movement, NOT grid-snapping

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
| State bridge | Command queue | UI cannot mutate ECS directly; `queueWorldCommand()` prevents React-bridge congestion (60 FPS * N entities would overwhelm the RN bridge) |
| Save format | JSON snapshot | Full ECS state serialized as single JSON blob rather than decomposed SQL rows -- simpler, versioned, and avoids schema coupling |

## Planned Work

- [ ] Decompose `GameEngine.ts` into subsystem modules (combat, logistics, wave, etc.)
- [ ] Replace `Math.random()` calls with seeded PRNG for deterministic replay
- [ ] Add reduced-FX path (skip particles/floating text when setting enabled)
- [ ] GOAP (Goal-Oriented Action Planning) for advanced unit AI -- clerics dynamically plan heal routes, knights prioritize boss targets
- [ ] Seeded PRNG for deterministic replay (enables competitive replays, debugging, bug reproduction)

## Testing Expectations

The repo must maintain automated checks for:
- Multi-wave engine progression
- Save/hydrate parity (serialize → deserialize → re-serialize must produce identical output)
- Reward finalization exactly once (no double-banking)
- Long-run entity cleanup (no memory leaks over 50+ waves)
