---
title: "Grailguard Progress"
domain: status
audience: all-agents
reads-before: [projectbrief.md, activeContext.md]
last-updated: 2026-03-13
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
- [x] SQLite schema with 8 tables via Drizzle ORM
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
- [x] HUD overlay with toychest, stats, spell bar, wave info

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
- [ ] Verify iOS UI rendering with NativeWind on default port 8081
- [ ] Verify WebGPU Canvas rendering on native device
- [ ] Migrate expo-sqlite to op-sqlite (JSI, no WASM)
- [ ] Add react-native-rapier for physics (replace Yuka collision)
- [ ] Migrate UI animations to Reanimated worklets (reactnativereusables.com patterns)
- [ ] Port Playwright E2E tests to Maestro flows

### Future
- [ ] App store builds via EAS
- [ ] LOD system for distant buildings/units
- [ ] Multiplayer exploration (if demand exists)

## Test Coverage (current)

486 tests across 38 suites covering:
- **Engine subsystems:** waveSystem, combatSystem, buildingSystem, logisticsSystem, projectileSystem, vfxSystem, spellSystem, codexSystem (116 tests)
- **Data configs:** All 12 JSON config files validated (101 tests)
- **DB repos:** profileRepo, unlockRepo, runRepo, settingsRepo, doctrineRepo, codexRepo, bootstrapRepo (130 tests)
- **Meta service:** bankRunRewards, settings, unlocks, run lifecycle (30 tests)
- **AI:** enemyBrain flocking, playerGovernor GOAP, biomeSystem (44 tests)
- **Integration:** gameEngine wave progression, serialize/hydrate, GOAP auto-play (3 tests)
- **E2E framework:** Playwright specs (gameFlow, metaScreens) + Maestro ready

## Known Issues

- GameEngine.ts still 2000 LOC (down from 2473) — orchestration layer, logic extracted to pure modules
- iOS dev client connectivity fails on non-default port (8082) — works on 8081
- WebGPU rendering not yet visually confirmed on iOS (port conflict blocked testing)
- expo-sqlite web requires COEP/COOP — plan to migrate to op-sqlite (JSI) eliminates this
