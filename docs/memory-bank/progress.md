---
title: "Grailguard Progress"
domain: status
audience: all-agents
reads-before: [projectbrief.md, activeContext.md]
last-updated: 2026-03-14
status: active
summary: "Implementation status, what works, what's left, known issues"
---

# Progress

## What Works

### Engine & Simulation
- [x] Koota ECS world with traits for all entity types
- [x] Build/Defend phase loop with wave progression
- [x] Wave budget formula: `B(W) = floor(50 * 1.15^W + 2W^2)`
- [x] Build timer formula: `T(W) = 30 + 10 * ln(W)`
- [x] Enemy spawning from budget-allocated queue
- [x] Boss waves every 5th wave
- [x] Enemy affixes (armored, swift, regenerating, ranged, vampiric, explosive)
- [x] Allied unit spawning from buildings
- [x] Melee and ranged combat with projectile system
- [x] Healer units (clerics) targeting wounded allies
- [x] Yuka AI pathfinding (enemies follow road, allies seek/intercept)
- [x] Placement validation (road distance rules, overlap check, grid snapping)
- [x] Turret targeting modes (first, strongest, weakest)
- [x] Spell system with 7 spells and faith resource
- [x] Relic draft system (every 5 waves)
- [x] Doctrine passive bonuses affecting gameplay
- [x] Resource economy (gold, wood, ore, gem, faith)
- [x] Factorio logistics (mines -> tracks -> sinks via BFS pathfinding)
- [x] Minecart track placement and resource cart entities
- [x] Royal Mint (ore -> gold conversion)
- [x] Gold Vault (passive gold generation)
- [x] Building upgrades (spawn rate + stat scaling, max level 5)
- [x] Codex auto-discovery system
- [x] Floating text, particles, world effects (smite, boss_spawn)
- [x] Camera shake on impacts
- [x] Victory at wave 20 with bonus coins

### Persistence
- [x] sql.js (WASM) schema with 8 tables via Drizzle ORM
- [x] Player profile (coins, highest wave, lifetime stats)
- [x] Settings persistence (speed, FX, audio, haptics, camera)
- [x] Building and spell unlock system with purchase transactions
- [x] Doctrine node persistence
- [x] Codex entry persistence
- [x] Active run save/resume via JSON snapshots
- [x] Run history recording
- [x] Seed data bootstrap

### Rendering
- [x] React Three Fiber 3D scene with orthographic camera
- [x] GLB model loading for all buildings and units
- [x] Per-entity mesh components (BuildingMesh, UnitMesh, ProjectileMesh, etc.)
- [x] Resource cart visualization
- [x] World effect visualization (ground circles)
- [x] Road rendering via TubeGeometry on CatmullRom spline
- [x] Terrain plane with grass/ground materials
- [x] Procedural tree and rock scenery placement
- [x] Screen-to-world raycasting for placement
- [x] HUD overlay with radial context menu, stats, spell bar, wave info
- [x] Animated resource counters (pulse + color flash on value change)
- [x] Wave complete reward overlay (gold bonus, interest, early-start breakdown)
- [x] BannerOverlay with framer-motion slide-down/fade-up animations
- [x] ScreenFlash component for boss/spell dramatic effects
- [x] Relic draft card selection animation (glow, scale, fade)
- [x] Building upgrade visual scaling (1.0x to 1.4x based on level)
- [x] Building upgrade particle burst + audio feedback
- [x] Boss entrance: camera shake 12, screen flash 0.35, skull-prefixed banner
- [x] Radial menu: red cost text for unaffordable items

### Audio
- [x] Tone.js procedural synthesis engine
- [x] Ambient noise (pink/brown based on biome)
- [x] Phase-adaptive BGM (build=80bpm calm, defend=120bpm intense)
- [x] SFX for UI clicks, building, combat, game over

### UI Screens
- [x] Main menu with profile, treasury, market, settings access
- [x] Game screen with full HUD integration
- [x] Codex screen (discovered entries)
- [x] Doctrine skill tree screen
- [x] Settings screen

## What's Left to Build

### Immediate (next session)
- [ ] Capacitor iOS/Android build verification
- [ ] LOD system for distant buildings/units
- [ ] Balance tuning pass (wave budgets, building costs, upgrade scaling)
- [ ] Content expansion (additional biomes, enemy types beyond wave 20)

### Future
- [ ] App store builds via Capacitor
- [ ] Multiplayer exploration (if demand exists)

## Test Coverage (current)

933 tests across 48 suites covering:
- **Engine subsystems:** waveSystem, combatSystem, buildingSystem, logisticsSystem, projectileSystem, vfxSystem, spellSystem, codexSystem (116 tests)
- **Data configs:** All 12 JSON config files validated (101 tests)
- **DB repos:** profileRepo, unlockRepo, runRepo, settingsRepo, doctrineRepo, codexRepo, bootstrapRepo (130 tests)
- **Meta service:** bankRunRewards, settings, unlocks, run lifecycle (30 tests)
- **DB persistence pipeline:** afterWrite calls persistDatabase + notifyDbChange, meta write functions trigger full pipeline (6 tests)
- **AI:** enemyBrain flocking, playerGovernor GOAP, biomeSystem (44 tests)
- **Integration:** gameEngine wave progression, serialize/hydrate, GOAP auto-play, finalizeRun persistence, victory detection, biome modifier application (6 tests)
- **UI:** RadialMenu (10), HUD (37), Tutorial (23) component tests with full mock isolation (70 tests)
- **Scenarios:** 6 comprehensive scenario suites (367 tests)
  - waveScenarios: enemy progression, boss variants, budget scaling, build timer, wave labels, difficulty modifiers
  - combatScenarios: all affixes, boss AoE, healer targeting, wall priority, siege targeting, rare drops
  - buildingScenarios: placement rules, upgrade costs, sell values, spawn rates, stat multipliers, affordability
  - spellScenarios: all 7 spells (damage, AoE, faith cost, cooldown), eligibility, cooldown decay
  - biomeScenarios: all 4 biomes with modifier verification and cross-biome comparison
  - logisticsScenarios: BFS pathfinding, cart movement, delivery amounts, mint routing, edge cases
- **E2E framework:** Playwright specs (gameFlow with build-defend cycle + leave flow, metaScreens) + Maestro ready

## Architecture Notes

- **Web-first with Capacitor native wrapper** -- Vite builds a standard web app; Capacitor wraps it for iOS/Android
- **sql.js (WASM) persistence** -- Replaced expo-sqlite; runs identically on web and Capacitor native shells
- **Engine decomposed** -- GameEngine.ts is now an orchestration layer; logic extracted to 9 subsystem modules under `src/engine/systems/`
- **23 JSON data configs** -- Fully data-driven balance and configuration under `src/data/`
- **Audio bridge pattern** -- Engine emits events via typed bus; audioBridge + ambienceManager handle synthesis
