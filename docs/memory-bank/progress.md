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

### High Priority
- [ ] Expanded test coverage (engine systems, DB repos, edge cases)
- [ ] Touch gesture controls for mobile (pan, pinch-zoom)
- [ ] InstancedMesh optimization for particles and scenery
- [ ] Building sell/refund during build phase
- [ ] Tutorial / onboarding flow for new players

### Medium Priority
- [ ] Additional biomes (desert-wastes, frost-peaks, etc.)
- [ ] Day/night cycle with visual atmosphere changes
- [ ] More enemy types and boss variants
- [ ] Difficulty tiers (pilgrim, crusader, inquisitor)
- [ ] Leaderboards or run comparison
- [ ] Haptic feedback integration

### Low Priority
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] GitHub Pages web deployment
- [ ] App store builds (EAS)
- [ ] Accessibility improvements
- [ ] Localization

## Known Issues

- `GameEngine.ts` is ~2200 LOC -- candidate for decomposition into subsystem modules
- `Math.random()` used in some combat/particle code -- should be seeded for determinism
- No reduced-FX path implemented yet despite settings toggle existing
- Playwright E2E tests removed in this branch (need rewrite for new architecture)
