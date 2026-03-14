---
title: "Grailguard Active Context"
domain: status
audience: all-agents
reads-before: [projectbrief.md, systemPatterns.md, techContext.md]
last-updated: 2026-03-14
status: active
summary: "Current work focus, recent changes, active decisions, and next steps"
---

# Active Context

## Current Branch

`feat/production-release` -- Production release preparation. Migrated from Expo/React Native to Capacitor + Vite + React web-first architecture.

## Recent Changes (This Branch)

### Architecture Migration (Expo -> Capacitor + Vite)
1. **Vite 8 build system** -- Replaced Metro bundler and Expo SDK with Vite for fast HMR and optimized production builds
2. **React 19 + react-router-dom** -- Replaced Expo Router with standard web routing
3. **sql.js (WASM) persistence** -- Replaced expo-sqlite with sql.js; runs identically on web and inside Capacitor native shells
4. **Tailwind CSS + DaisyUI** -- Replaced NativeWind with standard Tailwind CSS and DaisyUI component library
5. **Radix UI components** -- Replaced RN Primitives with Radix UI (dialog, popover, progress, toolbar, tooltip)
6. **Vitest 4** -- Replaced Jest with Vitest (497 tests, 39 suites)
7. **Capacitor 8** -- Native wrapper for iOS/Android deployment from the web build

### Engine Decomposition
8. **9 subsystem modules** -- Extracted from GameEngine.ts into `src/engine/systems/` (wave, combat, building, logistics, projectile, spell, vfx, codex, biome)
9. **Seeded PRNG** -- Replaced Math.random() with deterministic mulberry32 PRNG (`src/engine/systems/rng.ts`)
10. **Audio bridge pattern** -- Decoupled engine from audio via typed event bus (`src/engine/audio/audioBridge.ts` + `ambienceManager.ts`)
11. **GOAP player governor** -- Autonomous play AI (`src/engine/ai/playerGovernor.ts`)
12. **Enemy flocking** -- Alignment, cohesion, separation, evasion behaviors (`src/engine/ai/enemyBrain.ts`)

### Data-Driven Configuration
13. **23 JSON config files** -- All balance/tuning data externalized to `src/data/` (buildings, units, waves, combat, spells, relics, doctrines, biomes, lighting, viewport presets, road templates, etc.)

### Rendering Enhancements
14. **PBR terrain** -- Tiled grass textures with physically-based materials
15. **HDRI environment sky** -- drei `<Environment>` for sky rendering
16. **Depth fog** -- Green-tinted fog fading distant terrain
17. **InstancedMesh particle pool** -- Pre-allocated pool for combat VFX
18. **InstancedMesh terrain grid** -- Single draw call for terrain tiles
19. **Day/night cycle** -- Dynamic lighting system
20. **Sanctuary model** -- Elaborate grail structure with towers

### UX & Polish
21. **Radial context menu** -- Replaced toolbar with diegetic radial menu at click position (framer-motion spring animations, context-aware items)
22. **Biome system** -- 4 biomes with visual and gameplay modifiers
23. **Touch gesture controls** -- Camera pan and pinch zoom
24. **Tutorial system** -- Onboarding flow for new players
25. **Debug overlay** -- Development-time performance/state panel
26. **Comprehensive accessibility improvements**

### Documentation & Quality
27. **Comprehensive documentation overhaul** -- 18 docs organized into 4 domain directories
28. **JSDoc coverage** -- All source files documented
29. **Three-tier agent pointer chain** -- CLAUDE.md -> AGENTS.md -> docs/
30. **Biome lint auto-fix** -- Clean lint across 64 files

## Active Decisions

- **Web-first architecture** -- Standard web app wrapped by Capacitor for native; no React Native
- **Wave cap at 20** -- Victory condition; may expand in future
- **No Zustand** -- All runtime state in ECS; DB repos handle persistence
- **Snapshot serialization** -- Active runs saved as versioned JSON blobs, not decomposed tables
- **Grid snapping** -- Buildings snap to 5-unit grid for clean placement
- **Radial menu replaces Toychest** -- Context-aware building at click position

## Next Steps

See `progress.md` for detailed status. Key priorities:

1. **Capacitor Native Builds** -- Verify iOS/Android builds via Capacitor
2. **Balance Tuning** -- Wave budgets, building costs, upgrade scaling curves
3. **Visual Polish** -- Building/unit model variety, animation polish
4. **Content Expansion** -- Additional biomes, enemy types, buildings beyond wave 20
5. **LOD System** -- Distant buildings/units for performance
