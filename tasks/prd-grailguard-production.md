# PRD: Grailguard Production Release

## Introduction

Grailguard is a hybrid tower-defense / auto-battler / factory-logistics game built with Expo SDK 55, React Three Fiber, Koota ECS, Yuka AI, and expo-sqlite. The current implementation is a working monolithic prototype (~2200 LOC `GameEngine.ts`) with hardcoded tunables scattered throughout the codebase. This PRD covers ALL remaining work to reach production quality: engine decomposition into testable modules, extraction of all hardcoded values to JSON configs (data flow: JSON > Koota > SQLite), comprehensive TDD test coverage, rendering optimizations, new content, UI polish, CI/CD, and GitHub Pages deployment.

All work must follow these principles:
- **Test-driven:** Write tests FIRST, then implementation
- **Document-backed:** Update relevant docs/ and memory-bank/ files alongside code changes
- **Modular subpackages:** Components in `.tsx`, logic in `.ts`, clean separation
- **Data-driven:** All tunables in JSON config files, imported statically via Metro, never hardcoded in logic files
- **Data flow:** `JSON configs > Koota ECS traits > SQLite persistence`

## Goals

- Decompose `GameEngine.ts` into focused, testable subsystem modules under `src/engine/systems/`
- Extract ALL hardcoded numeric values, formulas, and tunables to JSON config files under `src/data/`
- Achieve >80% unit test coverage across all engine subsystems and DB repos
- Enable expo-sqlite on web via COEP/COOP headers and COI service worker (DONE)
- Deploy to GitHub Pages via CI/CD pipeline with automated testing gates
- Add touch gesture controls, tutorial flow, and mobile haptics
- Implement rendering optimizations (InstancedMesh, particle pooling, day/night cycle)
- Add content (new enemies, biomes, difficulty tiers, road templates, rare drops)
- Implement GOAP player governor for demo/testing and enemy flocking behaviors
- Decouple audio via event bus pattern

## User Stories

---

### INFRASTRUCTURE

---

### US-001: Web Platform Configuration
**Description:** As a developer, I want expo-sqlite to work on web with SharedArrayBuffer support so that the game runs identically in browser and on native.

**Acceptance Criteria:**
- [x] `metro.config.js` adds `.wasm` to `assetExts` and removes from `sourceExts`
- [x] `metro.config.js` sets COEP/COOP headers via `server.enhanceMiddleware`
- [x] `metro.config.js` includes tslib CJS resolver for Tone.js ESM compatibility
- [x] `app.json` configures `expo-router` plugin with COEP/COOP headers
- [x] `babel.config.js` enables `unstable_transformImportMeta: true`
- [x] `src/app/+html.tsx` created with ScrollViewStyleReset + COI service worker script tag
- [x] `public/coi-serviceworker.js` installed (v0.1.7)
- [x] Typecheck passes

**Status:** COMPLETE

---

### US-002: CI Pipeline Hardening
**Description:** As a developer, I want the CI pipeline to run lint, typecheck, and unit tests with coverage gates so that regressions are caught before merge.

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` runs `biome ci .`, `tsc --noEmit`, `jest --ci --coverage`
- [ ] CI fails if coverage drops below 80% on engine/ and db/ directories
- [ ] Coverage report uploaded as artifact
- [ ] E2E job runs Playwright against web export (continue-on-error until stable)
- [ ] All steps use pinned action versions with SHA hashes
- [ ] Typecheck passes

---

### US-003: CD Pipeline — GitHub Pages Deployment
**Description:** As a developer, I want every push to main to auto-deploy the web build to GitHub Pages so that the game is always playable at the project URL.

**Acceptance Criteria:**
- [ ] `.github/workflows/cd.yml` runs `expo export -p web` and deploys `dist/` to gh-pages
- [ ] Deployment only triggers after CI passes (needs workflow)
- [ ] `coi-serviceworker.js` is present in the exported `dist/` directory
- [ ] Base path configured correctly for GitHub Pages subdirectory hosting
- [ ] Game loads and runs in browser after deployment
- [ ] Typecheck passes

---

### CONFIGURATION — DATA-DRIVEN JSON CONFIGS

---

### US-010: Game Config — Wave & Pacing Parameters
**Description:** As a game designer, I want all wave pacing parameters in a JSON file so that I can tune difficulty without touching code.

**Acceptance Criteria:**
- [ ] Create `src/data/waveConfig.json` with: `waveBudgetBase`, `waveBudgetMultiplier`, `waveBudgetQuadratic`, `buildTimerBase`, `buildTimerLogCoeff`, `bossWaveInterval`, `victoryWave`, `spawnInterval`, `affixStartWave`, `affixChance`, `earlyStartBonusRate`, `waveCompletionBonusBase`, `waveCompletionBonusPerWave`, `interestRate`, `grailDamageNormal`, `grailDamageBoss`
- [ ] Values match current hardcoded values exactly (regression-safe)
- [ ] Engine imports via `import waveConfig from '../data/waveConfig.json'`
- [ ] Metro resolves JSON imports statically at build time
- [ ] All references to these magic numbers removed from `GameEngine.ts`
- [ ] Tests written FIRST asserting config values produce identical behavior
- [ ] Typecheck passes

---

### US-011: Game Config — Unit Stats
**Description:** As a game designer, I want all unit stat blocks in a JSON file so that balance changes don't require TypeScript changes.

**Acceptance Criteria:**
- [ ] Create `src/data/unitConfig.json` with all fields from current `UNITS` record in `constants.ts`
- [ ] Includes per-wave scaling multiplier formula coefficients
- [ ] `constants.ts` imports and re-exports typed `UNITS` from JSON
- [ ] Existing `UnitConfig` interface preserved as the TypeScript overlay
- [ ] Tests written FIRST verifying JSON-loaded stats match current hardcoded values
- [ ] Typecheck passes

---

### US-012: Game Config — Building Stats
**Description:** As a game designer, I want all building configs in a JSON file so that costs, spawn times, and turret stats are data-driven.

**Acceptance Criteria:**
- [ ] Create `src/data/buildingConfig.json` with all fields from current `BUILDINGS` record
- [ ] Includes upgrade cost formula coefficients (`upgradeCostMultiplier: 1.5`)
- [ ] `constants.ts` imports and re-exports typed `BUILDINGS` from JSON
- [ ] Existing `BuildingConfig` interface preserved as TypeScript overlay
- [ ] Tests written FIRST verifying JSON-loaded configs match current hardcoded values
- [ ] Typecheck passes

---

### US-013: Game Config — Spell Stats
**Description:** As a game designer, I want spell costs, cooldowns, and effect values in a JSON file.

**Acceptance Criteria:**
- [ ] Create `src/data/spellConfig.json` with: spell IDs, faith costs, cooldowns, damage/heal values, AoE radii, durations, unlock costs
- [ ] All spell-related magic numbers removed from `GameEngine.ts`
- [ ] Engine reads spell configs via static import
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-014: Game Config — Relic & Doctrine Data
**Description:** As a game designer, I want relic effects and doctrine node data in JSON files.

**Acceptance Criteria:**
- [ ] Create `src/data/relicConfig.json` with relic IDs, names, descriptions, effect types, effect values
- [ ] Create `src/data/doctrineConfig.json` with node IDs, names, max levels, effects per level, costs
- [ ] All relic/doctrine magic numbers removed from engine code
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-015: Game Config — Combat Mechanics
**Description:** As a game designer, I want combat formula coefficients in a JSON config.

**Acceptance Criteria:**
- [ ] Create `src/data/combatConfig.json` with: `meleeSearchRange`, `rangedSearchRange`, `wallPriorityRange`, `poisonDamageRate`, `poisonDecayRate`, `freezeDecayRate`, `slowDuration`, `bossAoeRadius`, `vampiricHealPercent`, `armoredDamageReduction`, `swiftSpeedMultiplier`, `explosiveAoeDamage`, `explosiveAoeRadius`, `healerTargetMode`, `sellValuePercent`
- [ ] All combat magic numbers removed from `GameEngine.ts`
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-016: Game Config — Rendering & VFX Parameters
**Description:** As a developer, I want rendering tunables in a JSON config so particle counts, camera settings, and VFX values are adjustable.

**Acceptance Criteria:**
- [ ] Create `src/data/renderConfig.json` with: camera position, zoom range, shake parameters, particle sizes/velocities/gravity/lifetime, floating text speed/lifetime, world effect durations, scenery density
- [ ] All rendering magic numbers removed from Arena.tsx and entity mesh components
- [ ] Tests written FIRST (config structure validation)
- [ ] Typecheck passes

---

### US-017: Game Config — Economy & Logistics
**Description:** As a game designer, I want economy tunables (starting resources, cart speed, resource amounts) in JSON.

**Acceptance Criteria:**
- [ ] Create `src/data/economyConfig.json` with: starting gold/wood/ore/gem/faith, starting health, faith regen formula, cart speed, resource delivery amounts, track costs, resource building output amounts/rates, kill reward values, victory coin formula, defeat coin formula
- [ ] All economy magic numbers removed from engine code
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-018: Game Config — Map Generation
**Description:** As a developer, I want map generation parameters in a JSON config.

**Acceptance Criteria:**
- [ ] Create `src/data/mapConfig.json` with: map size, road sample count, placement grid size, wall road distance, spawner road distance, road spline point count, Yuka path point count, scenery scatter parameters
- [ ] All map generation magic numbers removed from `mapGenerator.ts` and `GameEngine.ts`
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### ENGINE DECOMPOSITION

---

### US-020: Extract Wave System Module
**Description:** As a developer, I want wave spawning and pacing logic in its own module so it can be tested in isolation.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/waveSystem.ts` with pure functions: `calculateWaveBudget(wave)`, `calculateBuildTimer(wave)`, `allocateWaveBudget(budget, wave)`, `updateWaveState(dt, session, waveState)`, `checkWaveCompletion(units)`
- [ ] All functions import from `waveConfig.json`
- [ ] Functions are pure (no side effects, no global state mutation)
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/waveSystem.test.ts`
- [ ] Tests cover: budget formula accuracy, boss scheduling, affix assignment, enemy unlock progression, wave completion detection
- [ ] Typecheck passes
- [ ] Update `docs/architecture/engine.md` with new module

---

### US-021: Extract Combat System Module
**Description:** As a developer, I want combat logic (targeting, damage, healing, status effects) in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/combatSystem.ts` with pure functions: `findTarget(unit, enemies, allies)`, `calculateDamage(attacker, defender)`, `applyStatusEffects(unit, dt)`, `processHealing(healer, allies)`, `processBossAoe(boss, allies)`, `processVampiricHeal(attacker, damage)`, `processExplosiveDeath(unit, allies)`
- [ ] All functions import from `combatConfig.json`
- [ ] Functions are pure — take entity data in, return mutation descriptors out
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/combatSystem.test.ts`
- [ ] Tests cover: target selection priorities, damage with armor, vampiric healing, explosive death AoE, healer targeting, boss AoE radius
- [ ] Typecheck passes
- [ ] Update docs

---

### US-022: Extract Building System Module
**Description:** As a developer, I want building placement, spawning, upgrading, and selling logic in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/buildingSystem.ts` with pure functions: `validatePlacement(type, position, roadSamples, existingBuildings)`, `calculateUpgradeCost(building, branch)`, `calculateSellValue(building)`, `updateBuildingTimers(buildings, dt, session)`, `spawnUnitFromBuilding(building, config, session)`
- [ ] All functions import from `buildingConfig.json`
- [ ] Functions are pure
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/buildingSystem.test.ts`
- [ ] Tests cover: placement validation (road distance, overlap, grid snap), upgrade cost scaling (1.5x exponential), sell value (50%), spawn timer with upgrade multiplier
- [ ] Typecheck passes
- [ ] Update docs

---

### US-023: Extract Logistics System Module
**Description:** As a developer, I want resource cart spawning, BFS pathfinding, and delivery logic in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/logisticsSystem.ts` with pure functions: `findTrackPath(source, sink, tracks)`, `updateCarts(carts, dt, session)`, `deliverResource(cart, session)`, `spawnResourceCart(building, tracks, sinks)`
- [ ] All functions import from `economyConfig.json`
- [ ] Functions are pure
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/logisticsSystem.test.ts`
- [ ] Tests cover: BFS pathfinding, cart movement, resource delivery amounts, "No Track!" error case
- [ ] Typecheck passes
- [ ] Update docs

---

### US-024: Extract Projectile System Module
**Description:** As a developer, I want projectile movement and impact logic in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/projectileSystem.ts` with pure functions: `updateProjectiles(projectiles, targets, dt)`, `processImpact(projectile, target)`, `spawnProjectile(source, target, config)`
- [ ] Functions are pure
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/projectileSystem.test.ts`
- [ ] Tests cover: tracking movement, damage application, splash radius, heal projectiles, poison projectiles, slow projectiles
- [ ] Typecheck passes
- [ ] Update docs

---

### US-025: Extract VFX System Module
**Description:** As a developer, I want particle physics, floating text, and world effect logic in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/vfxSystem.ts` with pure functions: `updateParticles(particles, dt)`, `updateFloatingText(texts, dt)`, `updateWorldEffects(effects, dt)`, `spawnParticleBurst(position, color, count, intensity)`
- [ ] All functions import from `renderConfig.json`
- [ ] Functions are pure
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/vfxSystem.test.ts`
- [ ] Tests cover: gravity, drag, lifetime decay, particle burst count, floating text rise speed
- [ ] Typecheck passes

---

### US-026: Extract Spell System Module
**Description:** As a developer, I want spell casting, cooldowns, and effect application in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/spellSystem.ts` with pure functions: `canCastSpell(spellId, session)`, `castSpell(spellId, session, units, buildings)`, `updateSpellCooldowns(session, dt)`, `getSpellConfig(spellId)`
- [ ] All functions import from `spellConfig.json`
- [ ] Functions are pure
- [ ] `GameEngine.ts` delegates to these functions
- [ ] Tests written FIRST in `src/__tests__/engine/systems/spellSystem.test.ts`
- [ ] Tests cover: faith cost deduction, cooldown enforcement, each spell's effect (smite, holy_nova, earthquake, etc.), doctrine modifiers
- [ ] Typecheck passes

---

### US-027: Extract Codex Discovery Module
**Description:** As a developer, I want codex discovery logic in its own module.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/codexSystem.ts` with pure function: `discoverNewEntities(entities, discoveredSet)`
- [ ] `GameEngine.ts` delegates to this function
- [ ] Tests written FIRST in `src/__tests__/engine/systems/codexSystem.test.ts`
- [ ] Tests cover: new entity discovery, duplicate prevention, all unit/building types discoverable
- [ ] Typecheck passes

---

### US-028: Seeded PRNG Module
**Description:** As a developer, I want a seeded pseudorandom number generator so that all randomness is deterministic and replayable.

**Acceptance Criteria:**
- [ ] Create `src/engine/systems/rng.ts` with: `createRng(seed)` returning `{ next(): number, nextInt(min, max): number, nextFloat(min, max): number, fork(label): Rng }`
- [ ] Uses a well-known algorithm (e.g., mulberry32 or xoshiro128)
- [ ] Replace ALL `Math.random()` calls in engine with seeded RNG calls
- [ ] `GameSession.seed` drives the RNG on world creation
- [ ] Tests written FIRST in `src/__tests__/engine/systems/rng.test.ts`
- [ ] Tests cover: deterministic sequences for same seed, different sequences for different seeds, fork independence
- [ ] Typecheck passes

---

### US-029: Slim GameEngine Orchestrator
**Description:** As a developer, I want `GameEngine.ts` reduced to an orchestrator that imports and calls subsystem modules.

**Acceptance Criteria:**
- [ ] `GameEngine.ts` contains ONLY: trait definitions, world lifecycle (create/step/serialize/hydrate/dispose), command processing, and system orchestration
- [ ] All game logic delegated to `src/engine/systems/*.ts` modules
- [ ] `GameEngine.ts` is under 600 LOC
- [ ] All existing tests still pass
- [ ] No behavioral changes — same game, cleaner code
- [ ] Typecheck passes
- [ ] Update `docs/architecture/engine.md` and `docs/memory-bank/systemPatterns.md`

---

### TESTING

---

### US-030: DB Repository Test Suite
**Description:** As a developer, I want comprehensive tests for all database repository modules.

**Acceptance Criteria:**
- [ ] Create test files for each repo: `profileRepo.test.ts`, `unlockRepo.test.ts`, `runRepo.test.ts`, `settingsRepo.test.ts`, `doctrineRepo.test.ts`, `codexRepo.test.ts`, `bootstrapRepo.test.ts`
- [ ] Tests use in-memory SQLite (`:memory:`) with schema migrations applied
- [ ] Tests cover: CRUD operations, edge cases (duplicate inserts, missing records), transaction atomicity
- [ ] `profileRepo` tests: coin balance updates, highest wave tracking, lifetime stats
- [ ] `runRepo` tests: snapshot save/load, run history recording, active run lifecycle
- [ ] `unlockRepo` tests: purchase transactions, unlock cost validation, spell vs building unlocks
- [ ] >90% coverage on `src/db/repos/`
- [ ] Typecheck passes

---

### US-031: Meta Service Test Suite
**Description:** As a developer, I want tests for the database service facade (`meta.ts`).

**Acceptance Criteria:**
- [ ] Expand `src/__tests__/db/metaService.test.ts` with: profile operations, settings CRUD, unlock flow, doctrine purchase, codex recording, run save/resume/finalize lifecycle
- [ ] Tests use in-memory SQLite
- [ ] Tests verify the React hooks return expected data shapes
- [ ] >85% coverage on `src/db/meta.ts`
- [ ] Typecheck passes

---

### US-032: Playwright E2E Test Suite
**Description:** As a developer, I want E2E tests that verify the game loads and core flows work in a real browser.

**Acceptance Criteria:**
- [ ] Create `e2e/gameFlow.spec.ts` covering: app loads, main menu renders, start run, build phase shows toychest, place a building, start wave, enemies spawn, wave completes
- [ ] Create `e2e/metaScreens.spec.ts` covering: navigate to codex, doctrine, settings screens; settings persist across reload
- [ ] Tests run against `expo export -p web` static build
- [ ] CI workflow runs Playwright against the export
- [ ] Playwright config uses `webServer` to serve the export directory
- [ ] Typecheck passes

---

### AI & PATHFINDING

---

### US-040: Enemy Flocking Behaviors
**Description:** As a player, I want enemies to move in realistic groups with alignment, cohesion, and evasion so that combat feels dynamic.

**Acceptance Criteria:**
- [ ] Create `src/engine/ai/enemyBrain.ts` with configurable Yuka steering behaviors
- [ ] Create `src/data/aiConfig.json` with: `alignmentWeight: 0.5`, `cohesionWeight: 0.5`, `separationWeight: 1.0`, `evasionWeight: 0.4`, `laneOffsetRange`
- [ ] Enemies use AlignmentBehavior + CohesionBehavior + SeparationBehavior + EvadeBehavior
- [ ] Enemy vehicles respect lane offsets for multi-lane roads
- [ ] `GameEngine.ts` delegates enemy vehicle setup to this module
- [ ] Tests written FIRST in `src/__tests__/engine/ai/enemyBrain.test.ts`
- [ ] Typecheck passes
- [ ] Update `docs/architecture/engine.md`

---

### US-041: Enemy Siege Targeting
**Description:** As a player, I want different enemy types to target different buildings so that I must protect high-value structures strategically.

**Acceptance Criteria:**
- [ ] Create `src/data/siegeTargeting.json` with per-enemy-type building target priorities (orc→hut/range, troll→range/temple/keep, boss→keep)
- [ ] Create targeting logic in `src/engine/systems/combatSystem.ts`: `selectSiegeTarget(enemyType, buildings)`
- [ ] Enemies switch from unit combat to siege when no enemy units in range and buildings exist
- [ ] Tests written FIRST
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md`

---

### US-042: GOAP Player Governor
**Description:** As a developer, I want an autonomous AI governor that plays the game for demo mode, balance testing, and eventual auto-play.

**Acceptance Criteria:**
- [ ] Create `src/engine/ai/playerGovernor.ts` using Yuka GOAP framework
- [ ] Implement goal evaluators: `BuildStructureGoal`, `StartWaveGoal`, `RepairGoal`, `SmiteGoal`
- [ ] Each goal has a `calculateDesirability(session)` scoring function
- [ ] Governor emits `WorldCommand` objects (same as player input)
- [ ] Create `src/data/governorConfig.json` with desirability weights and thresholds
- [ ] GOAP planner selects highest-desirability action each tick
- [ ] Tests written FIRST in `src/__tests__/engine/ai/playerGovernor.test.ts`
- [ ] Tests cover: goal scoring under various game states, action selection priority
- [ ] Typecheck passes
- [ ] Update `docs/architecture/engine.md`

---

### US-043: Wave Director with Enemy Unlock Progression
**Description:** As a game designer, I want enemies to unlock progressively by wave so that early game is approachable.

**Acceptance Criteria:**
- [ ] Create `src/data/enemyProgression.json` with: `goblin: { unlockWave: 1 }`, `orc: { unlockWave: 3 }`, `troll: { unlockWave: 6 }`, `boss: { unlockWave: 5 }`
- [ ] Wave budget allocation only considers unlocked enemy types
- [ ] Wave labels assigned based on budget thresholds: "Scout Party", "Raiding Force", "War Host"
- [ ] `waveSystem.ts` consumes this config
- [ ] Tests written FIRST
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md`

---

### RENDERING

---

### US-050: InstancedMesh Particle System
**Description:** As a developer, I want particles rendered via a pre-allocated InstancedMesh pool so that combat doesn't cause GC pressure.

**Acceptance Criteria:**
- [ ] Create `src/components/3d/ParticlePool.tsx` with pre-allocated 500-slot InstancedMesh
- [ ] Pool supports 4 types: hit sparks, death burst, heal glow, boss explosion
- [ ] Particle bounce physics: on ground hit (y ≤ 0), velocity.y negated with 0.5x dampening
- [ ] Replace current individual Particle entity mesh spawning
- [ ] Pool stats (active/total) readable for telemetry
- [ ] Import render parameters from `renderConfig.json`
- [ ] No visual regression — same particle colors, sizes, and behaviors
- [ ] Typecheck passes
- [ ] Update `docs/architecture/rendering.md`

---

### US-051: InstancedMesh Terrain Grid
**Description:** As a developer, I want terrain rendered as an InstancedMesh grid instead of a flat plane for better visual variety and performance.

**Acceptance Criteria:**
- [ ] Create `src/components/3d/TerrainGrid.tsx` using InstancedMesh for terrain tiles
- [ ] Per-tile color variation (multiple grass shades)
- [ ] Grid dimensions from `mapConfig.json`
- [ ] Single draw call for entire terrain
- [ ] Replaces current ground plane in `Arena.tsx`
- [ ] Typecheck passes
- [ ] Update `docs/architecture/rendering.md`

---

### US-052: InstancedMesh Scenery
**Description:** As a developer, I want procedural scenery (trees, rocks) rendered via InstancedMesh instead of individual meshes.

**Acceptance Criteria:**
- [ ] Modify scenery generation in `Arena.tsx` to use InstancedMesh
- [ ] One InstancedMesh per scenery type (tree, rock, bush)
- [ ] Scatter parameters from `mapConfig.json`
- [ ] Reduces draw calls from O(n) to O(types)
- [ ] Typecheck passes

---

### US-053: Day/Night Cycle
**Description:** As a player, I want a day/night lighting cycle so that the game atmosphere changes over time.

**Acceptance Criteria:**
- [ ] Create `src/components/3d/DayNightCycle.tsx` component
- [ ] Create `src/data/lightingConfig.json` with: time-of-day presets (dawn, day, dusk, night), transition durations, ambient/directional light colors and intensities per preset
- [ ] Cycle advances per wave (e.g., day→dusk→night→dawn across 4 waves)
- [ ] Smooth color/intensity interpolation between presets
- [ ] Optional: HDRI environment map swapping per preset
- [ ] Typecheck passes
- [ ] Update `docs/architecture/rendering.md`

---

### US-054: Elaborate Sanctuary Model
**Description:** As a player, I want a visually impressive sanctuary at the road end with towers, rotating grail, and health-based degradation.

**Acceptance Criteria:**
- [ ] Create `src/components/3d/Sanctuary.tsx` with: 4 corner towers with conical roofs, rotating grail at center (continuous Y rotation), corner torches with flickering point lights
- [ ] Health-based visual degradation: color shifts and damage effects as HP decreases
- [ ] GLB model or procedural geometry (developer's choice)
- [ ] Replaces current simple sanctuary mesh
- [ ] Typecheck passes
- [ ] Update `docs/architecture/rendering.md`

---

### US-055: Viewport Camera Presets
**Description:** As a player, I want the camera to automatically adjust between build and defend phases for optimal viewing.

**Acceptance Criteria:**
- [ ] Create `src/data/viewportPresets.json` with named camera configs: `overview` (wide zoom for build), `action` (tight zoom for defend), `cinematic` (boss spawn transitions)
- [ ] Create `src/components/3d/CameraController.tsx` (logic extracted from Arena.tsx)
- [ ] Smooth camera transitions between presets on phase change
- [ ] Transition duration configurable in JSON
- [ ] Typecheck passes

---

### US-056: Reduced-FX Path
**Description:** As a player on a low-end device, I want to disable particles and floating text so the game runs smoothly.

**Acceptance Criteria:**
- [ ] Read `reducedFx` setting from settings repo
- [ ] When enabled: skip particle spawning, skip floating text, skip camera shake, skip world effects
- [ ] No performance cost for checking the flag (early return, not conditional rendering)
- [ ] Settings screen toggle already exists — wire it to actual behavior
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### UI / UX

---

### US-060: Touch Gesture Controls
**Description:** As a mobile player, I want pan and pinch-zoom gestures so that I can navigate the 3D arena on touchscreen.

**Acceptance Criteria:**
- [ ] Implement pan gesture (two-finger drag) to move camera
- [ ] Implement pinch-zoom gesture to change camera zoom level
- [ ] Respect zoom bounds from `renderConfig.json`
- [ ] Gestures work alongside tap-to-place building flow
- [ ] No conflict with Toychest scroll gesture
- [ ] Uses `react-native-gesture-handler` (already installed)
- [ ] Typecheck passes

---

### US-061: Tutorial / Onboarding Flow
**Description:** As a new player, I want a guided tutorial on my first run so that I understand building placement, wave starting, and resource management.

**Acceptance Criteria:**
- [ ] Create `src/components/ui/Tutorial.tsx` with step-by-step overlay
- [ ] Tutorial steps: (1) Place a wall on the road, (2) Place a militia hut, (3) Start the wave, (4) Explain gold rewards, (5) Place a lumber camp and track
- [ ] Tutorial state persisted in settings repo (`tutorialComplete: boolean`)
- [ ] Tutorial skippable at any point
- [ ] Highlights relevant UI elements with a spotlight mask
- [ ] Typecheck passes
- [ ] Update `docs/memory-bank/productContext.md`

---

### US-062: Building Sell/Refund UI
**Description:** As a player, I want to sell buildings during build phase to recover resources and adjust my strategy.

**Acceptance Criteria:**
- [ ] "Sell" button visible on building selection panel during build phase
- [ ] Shows refund amount before confirming (50% of gold cost, 50% of wood cost)
- [ ] Confirmation dialog prevents accidental sales
- [ ] Gold and wood refunded to session resources
- [ ] Building entity removed from world
- [ ] Works for both buildings and walls (walls refund wood only)
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-063: Haptic Feedback Integration
**Description:** As a mobile player, I want haptic feedback on key actions for satisfying tactile response.

**Acceptance Criteria:**
- [ ] Create `src/engine/haptics.ts` with: `impactLight()`, `impactMedium()`, `impactHeavy()`, `notificationSuccess()`, `notificationWarning()`
- [ ] Trigger haptics on: building placement, wave start, boss spawn, spell cast, game over
- [ ] Haptics respect settings toggle (`hapticsEnabled`)
- [ ] No-op on web platform
- [ ] Uses `expo-haptics` package (add as dependency)
- [ ] Typecheck passes

---

### US-064: Wave Announcement Labels
**Description:** As a player, I want to see wave names ("Scout Party", "War Host") announced at wave start for atmosphere.

**Acceptance Criteria:**
- [ ] Create `src/data/waveLabels.json` with budget-threshold-to-label mappings
- [ ] Banner displays wave label alongside wave number at defend phase start
- [ ] Labels driven by wave budget (e.g., <100 = "Scout Party", 100-300 = "Raiding Force", 300+ = "War Host")
- [ ] Banner uses existing `triggerBanner()` system
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### AUDIO

---

### US-070: Audio Event Bus
**Description:** As a developer, I want the simulation to emit audio events rather than calling SoundManager directly so that audio is decoupled from the engine.

**Acceptance Criteria:**
- [ ] Create `src/engine/audio/audioBridge.ts` with typed event emitter
- [ ] Event types: `combat_hit`, `unit_death`, `building_placed`, `building_sold`, `wave_start`, `wave_complete`, `boss_spawn`, `spell_cast`, `game_over`, `ui_click`
- [ ] `SoundManager.ts` subscribes to bridge events
- [ ] All direct `soundManager.*` calls in `GameEngine.ts` replaced with event emissions
- [ ] Engine has zero imports from SoundManager
- [ ] Tests written FIRST (verify events emitted for each game action)
- [ ] Typecheck passes
- [ ] Update `docs/architecture/engine.md`

---

### US-071: Ambience Manager
**Description:** As a player, I want ambient audio (wind, forest, biome-specific loops) that changes with the environment.

**Acceptance Criteria:**
- [ ] Create `src/engine/audio/ambienceManager.ts` with biome-specific ambient layers
- [ ] Create `src/data/ambienceConfig.json` with per-biome audio parameters
- [ ] Ambience transitions smoothly between biomes
- [ ] Ambience subscribes to audio bridge events
- [ ] Typecheck passes

---

### CONTENT

---

### US-080: Additional Enemy Types
**Description:** As a player, I want new enemy types (flying, shield-bearer, summoner) for greater combat variety.

**Acceptance Criteria:**
- [ ] Add to `src/data/unitConfig.json`: `flying` (ignores walls, high speed, low HP), `shieldBearer` (front-facing 75% damage reduction, flanking negates), `summoner` (periodically spawns goblin minions)
- [ ] Update `UnitType` in `constants.ts`
- [ ] Implement unique behaviors in `combatSystem.ts`
- [ ] Add GLB models or distinctive mesh colors
- [ ] Add to enemy progression config (unlock at later waves)
- [ ] Tests written FIRST
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md`

---

### US-081: Boss Ability Variants
**Description:** As a player, I want different boss types per boss wave for strategic variety.

**Acceptance Criteria:**
- [ ] Create `src/data/bossConfig.json` with boss variants: `Warlord` (AoE slam), `Necromancer` (summons minions on death), `Dragon` (ranged fire breath), `Siege Engine` (targets buildings exclusively)
- [ ] Boss variant selected based on wave number (wave 5→Warlord, 10→Necromancer, etc.)
- [ ] Each variant has unique combat behavior implemented in `combatSystem.ts`
- [ ] Tests written FIRST
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md`

---

### US-082: Biome System
**Description:** As a player, I want multiple biome types that affect terrain visuals and gameplay modifiers.

**Acceptance Criteria:**
- [ ] Create `src/data/biomeConfig.json` with biome definitions: `kings-road` (default), `desert-wastes` (reduced faith regen, +gold from kills), `frost-peaks` (enemies start slowed, reduced build timer), `shadow-marsh` (enemies have +20% HP, +rare drops)
- [ ] Each biome defines: terrain color palette, ambient audio key, gameplay modifiers, scenery types
- [ ] Biome selected at run start (random or player choice)
- [ ] Terrain and lighting reflect biome
- [ ] Tests written FIRST for gameplay modifiers
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md` and `docs/architecture/rendering.md`

---

### US-083: Difficulty Tiers
**Description:** As a player, I want difficulty tiers so I can challenge myself for better rewards.

**Acceptance Criteria:**
- [ ] Create `src/data/difficultyConfig.json` with tiers: `pilgrim` (0.8x enemy stats, normal rewards), `crusader` (1.0x, 1.5x coin reward), `inquisitor` (1.3x enemy stats, 2x coin reward, affixes from wave 3)
- [ ] Difficulty selected at run start
- [ ] Difficulty multiplier applied to enemy stats at spawn
- [ ] Coin reward multiplier applied at run end
- [ ] Difficulty stored in `GameSession` and run history
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-084: Rare Item Drops
**Description:** As a player, I want rare items to drop from defeated enemies for micro-reward satisfaction.

**Acceptance Criteria:**
- [ ] Create `src/data/dropConfig.json` with: `potion` (5% chance, heals nearest ally for 50% max HP), `star` (3% chance, grants 10 bonus gold)
- [ ] Drops spawn as collectible entities near the death position
- [ ] Auto-collected after 1 second with particle burst effect
- [ ] Drop chances modifiable by relics
- [ ] Tests written FIRST
- [ ] Typecheck passes
- [ ] Update `docs/game-design/combat.md`

---

### US-085: Road Template System
**Description:** As a developer, I want pre-designed road templates alongside procedural generation for curated strategic layouts.

**Acceptance Criteria:**
- [ ] Create `src/data/roadTemplates.json` with 3 templates: simple S-curve (2 lanes), U-turn kill zone (3 lanes), winding path (4 lanes)
- [ ] Each template defines waypoints and lane offsets
- [ ] Map generator can use template OR procedural generation (selected randomly or by biome)
- [ ] Templates create natural kill zones for strategic placement
- [ ] Tests written FIRST
- [ ] Typecheck passes

---

### US-086: Upgrade Cost Formula
**Description:** As a game designer, I want building upgrade costs to follow an explicit exponential formula for balanced progression.

**Acceptance Criteria:**
- [ ] Implement in `buildingSystem.ts`: `upgradeCost(baseCost, level) = baseCost * 1.5^(level - 1)`
- [ ] Formula coefficient (1.5) loaded from `buildingConfig.json`
- [ ] Applies to both gold and wood costs
- [ ] Max level 5 enforced
- [ ] Tests written FIRST verifying cost at each level
- [ ] Typecheck passes
- [ ] Update `docs/game-design/buildings.md`

---

### TELEMETRY & OBSERVABILITY

---

### US-090: Runtime Telemetry Interface
**Description:** As a developer, I want runtime performance metrics exposed for debugging and optimization.

**Acceptance Criteria:**
- [ ] Create `src/engine/telemetry.ts` exporting `GrailguardTelemetry` interface: `fps`, `entityCount`, `activeParticles`, `activeProjectiles`, `activeUnits`, `memoryUsageMB`, `frameTimeMs`
- [ ] Telemetry singleton updated each frame in `stepRunWorld()`
- [ ] Optional debug overlay component (`src/components/ui/DebugOverlay.tsx`) toggled via settings
- [ ] Telemetry disabled in production builds (tree-shaken)
- [ ] Typecheck passes

---

### ACCESSIBILITY & POLISH

---

### US-095: Leaderboard / Run History Comparison
**Description:** As a player, I want to see my run history with stats so I can track improvement.

**Acceptance Criteria:**
- [ ] Create `src/app/history.tsx` screen showing past runs
- [ ] Display: date, waves survived, biome, difficulty, coins earned, total kills, duration
- [ ] Sort by date (newest first)
- [ ] Reads from `runHistory` table via `runRepo`
- [ ] Accessible from main menu
- [ ] Typecheck passes

---

### US-096: Accessibility Improvements
**Description:** As a player with disabilities, I want the UI to be accessible via screen readers and high contrast.

**Acceptance Criteria:**
- [ ] All TouchableOpacity elements have `accessibilityLabel` and `accessibilityRole`
- [ ] High-contrast mode option in settings (increases text contrast, adds outlines to UI elements)
- [ ] Screen reader announces: phase changes, wave number, gold balance, building placement success/failure
- [ ] Typecheck passes

---

### US-097: Localization Support
**Description:** As a non-English speaker, I want UI text to be translatable.

**Acceptance Criteria:**
- [ ] Create `src/i18n/` with `en.json` containing all UI strings
- [ ] Create `src/i18n/index.ts` with `t(key)` translation function
- [ ] All hardcoded UI strings in screens and HUD replaced with `t()` calls
- [ ] Settings screen includes language selector (initially English only, structure ready for more)
- [ ] Typecheck passes

---

## Functional Requirements

- FR-1: All game tunables must be defined in JSON files under `src/data/` and imported statically
- FR-2: `GameEngine.ts` must delegate all game logic to subsystem modules under `src/engine/systems/`
- FR-3: `GameEngine.ts` must be under 600 LOC after decomposition
- FR-4: All subsystem modules must export pure functions (no side effects, no global mutation)
- FR-5: All `Math.random()` calls must be replaced with seeded PRNG
- FR-6: Unit tests must be written before implementation (TDD)
- FR-7: Unit test coverage must exceed 80% on `src/engine/` and `src/db/`
- FR-8: expo-sqlite must work on web via COEP/COOP headers and COI service worker
- FR-9: GitHub Pages deployment must work via CI/CD on every push to main
- FR-10: Data flow must follow: JSON config files → Koota ECS traits → SQLite persistence
- FR-11: Components (`.tsx`) must contain only rendering logic; game logic lives in `.ts` files
- FR-12: All new features must have corresponding documentation updates in `docs/`

## Non-Goals

- No multiplayer or network play
- No native app store submission (EAS builds are CI-only for testing)
- No microtransactions or real-money economy
- No procedural level generation beyond road templates and biome parameters
- No 3D model creation — use existing GLB assets or simple geometry
- No social features (friends, guilds, chat)
- No server-side components — fully client-side game

## Technical Considerations

- **Metro JSON imports:** Metro supports static `import config from './config.json'` — JSON files are resolved at build time with no runtime cost
- **Koota ECS constraints:** Traits are defined at module level, not dynamically. Subsystem modules must receive trait data as function arguments rather than importing `gameWorld` directly (pure function pattern)
- **expo-sqlite web:** Requires SharedArrayBuffer (COEP/COOP) — already configured via COI service worker and metro middleware
- **Yuka AI:** GOAP framework available in Yuka 0.7 — `Think`, `Goal`, `GoalEvaluator` classes
- **Three.js InstancedMesh:** Maximum ~65535 instances per mesh. Particle pool of 500 is well within limits
- **GitHub Pages:** Static hosting only — no server-side headers possible, hence the service worker approach
- **tslib ESM/CJS mismatch:** Already resolved via metro resolver redirect (Tone.js dependency)
- **NativeWind:** CSS-in-JS via Tailwind — no DOM dependency, works on both web and native

## Success Metrics

- `GameEngine.ts` reduced from ~2200 LOC to <600 LOC
- All subsystem modules have >80% test coverage
- Zero `Math.random()` calls in engine code (all seeded)
- Zero hardcoded magic numbers in engine code (all from JSON configs)
- Game loads and runs on GitHub Pages with expo-sqlite working
- CI pipeline catches regressions before merge
- Touch gestures work on iOS and Android
- Tutorial completion rate >90% for new players (tracked via codex completion)

## Open Questions

- Should biome selection be random per run or player-chosen?
- Should the GOAP governor be a visible "auto-play" toggle or hidden developer tool?
- Should road templates be weighted by biome or purely random?
- What is the target frame budget for the particle pool on low-end mobile?
- Should rare drops be visible to the player before collection (floating item) or instant?
