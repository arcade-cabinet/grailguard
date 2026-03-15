---
title: "React Native Filament Migration Analysis"
domain: architecture
audience: all-agents
reads-before: [rendering.md, native-first-proposal.md]
last-updated: 2026-03-14
status: analysis
summary: "Comprehensive gap analysis: R3F vs Filament — 12/14 files rewrite, orthographic camera blocker"
---

# React Native Filament Migration Analysis

## Verdict: Filament is NOT viable for Grailguard

Filament requires rewriting **12 of 14 rendering files** with a **hard blocker** on orthographic camera support. The WebGPU + Three.js path (Option B) preserves 100% of existing rendering code.

## Hard Blockers

| Blocker | Impact | Workaround |
|---------|--------|-----------|
| **Orthographic camera** | Filament is perspective-only. Grailguard's isometric diorama look requires parallel projection. | Fake with very long focal length — produces visible distortion on edges |
| **Per-instance color** | `InstancedMesh.setColorAt()` used in 5 places (terrain, trees, rocks, particles). Filament has no equivalent. | Custom `.mat` shader with per-instance vertex attribute — significant engineering |
| **Primitive geometry** | 21 runtime geometry constructions (Box, Sphere, Cone, Cylinder, Plane, Ring, Dodecahedron, Tube). Filament requires GLB for everything. | Create 8+ GLB primitives in Blender, rewrite TubeGeometry as vertex buffer |
| **MeshBasicMaterial inline** | ~10 configurations across 8 files for UI overlays. Filament requires pre-compiled `.mat` shader files. | Write 10+ `.mat` files |
| **ECS in useFrame** | All 12 entity components read ECS traits in `useFrame` (JS thread). Filament render callbacks are worklets (native thread) — no JS object access. | Two-stage pipeline: JS reads ECS → shared values → worklet reads shared values |

## Migration Scope

| Phase | Files | Difficulty | Estimated LOC |
|-------|-------|-----------|--------------|
| Prerequisites (assets) | — | 3-4 days | 10+ .mat files, 8+ GLBs, 4 IBL .ktx |
| Scene skeleton | Arena.tsx + 2 new files | Hard | +400 |
| Static scene | TerrainGrid, scenery, road | Rewrite | ~450 |
| Camera system | CameraController, raycasting | Rewrite | ~280 |
| Lighting | DayNightCycle, Sanctuary torches | Hard | ~190 |
| Entity meshes | 6 files in Entities/ | Hard x6 | ~530 |
| Sanctuary | Sanctuary.tsx | Rewrite | ~150 |
| Particle pool | ParticlePool.tsx | Rewrite | ~300 |
| **Total** | **12 files rewritten** | **4-6 weeks** | **~2300 LOC** |

## What Does NOT Change (zero R3F dependency)

- All `src/engine/` (ECS, 9 subsystem modules, AI, audio)
- All `src/db/` (SQLite repos, schema, migrations)
- All `src/data/*.json` (21 config files)
- All `src/app/*.tsx` screens (index, game, codex, doctrine, settings, history)
- `src/components/ui/` (HUD, Tutorial, DebugOverlay)
- `src/i18n/`, haptics, telemetry
- All 486 tests

## Why Option B (WebGPU + Three.js) Wins

| Gap | Filament | WebGPU + Three.js |
|-----|----------|-------------------|
| Orthographic camera | **Blocking** | Zero change |
| Per-instance color | Hard (custom material) | Zero change |
| Primitive geometry | Hard (21 GLBs) | Zero change |
| Unlit materials | Hard (10+ .mat files) | Zero change |
| useFrame pattern | Rewrite (worklet architecture) | Zero change |
| ECS integration | Architectural (two-stage pipeline) | Zero change |
| Raycasting | Hard (manual unproject) | Zero change |
| Files changed | 12/14 rewrites | ~1/14 (Canvas prop) |
| Calendar time | 4-6 weeks | 1-2 days |

## What Filament Would Gain Us

If the blockers were resolved:
- Metal on iOS / Vulkan on Android (vs deprecated OpenGL ES)
- Separate render thread (60fps independent of JS)
- Full PBR with IBL and cascaded shadows
- Contact shadows
- Production-proven (millions of users via Margelo)

## Recommendation

**Do NOT migrate to Filament.** The orthographic camera blocker alone is disqualifying. Continue with R3F + expo-gl for now. Revisit when:
1. Filament adds orthographic camera support, OR
2. react-native-webgpu stabilizes for R3F integration (Option B), OR
3. The game's visual identity changes to not require isometric projection

## Sources

- [react-native-filament GitHub](https://github.com/margelo/react-native-filament)
- [Filament Camera Guide — perspective only](https://margelo.github.io/react-native-filament/docs/guides/camera)
- [Filament Instancing — no per-instance color](https://margelo.github.io/react-native-filament/docs/guides/instancing)
