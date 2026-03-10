# GrailGuard — Project Roadmap

> **Last updated**: 2026-03-10

## Overview

GrailGuard is a medieval tower-defense game built with **Expo + React Three Fiber** (web) and **react-native-filament** (native). The player (or an AI Governor) constructs walls, huts, and ranges to defend a Sanctuary from waves of enemies. AI is driven by **Yuka** (GOAP + steering behaviors).

---

## Current State (What's Done)

| Area | Status | Notes |
| --- | --- | --- |
| CI/CD | ✅ Done | GitHub Actions v4, Expo → GitHub Pages via `actions/deploy-pages` |
| Asset Loading | ✅ Done | Custom Metro middleware serves `public/` as static files; `useGLTF` with URL strings |
| PBR Visual Upgrade | ✅ Done | HDRI skybox (AmbientCG CC0), Grass001/Gravel017 PBR textures, IBL environment lighting |
| CC0 3D Models | ✅ Done | 6 `.glb` files in `public/assets/models/` + `Textures/colormap.png` |
| CC0 2D Materials | ✅ Done | Grass001, Gravel017, Bricks021, Planks012 PBR sets + 3 HDRI skyboxes |
| Yuka AI — Enemies | ✅ Done | `EnemyVehicle` with Separation, Alignment, Cohesion steering |
| Yuka AI — Governor | ✅ Done | `PlayerGovernorBrain` with weighted GOAP (Walls, Huts, Ranges) |
| E2E Testing (Playwright) | ✅ Done | Headed Chrome, WebGL flags, headed screenshots |
| Documentation | ✅ Done | README, CLAUDE.md, AGENTS.md, ARCHITECTURE.md, DESIGN.md, roadmap, asset-pipeline |
| `import.meta` / Zustand Fix | ✅ Done | Disabled `unstable_enablePackageExports`, added babel transform |

---

## Remaining Work

### Phase 1 — Git LFS Setup (Blocker for Push)

> **Priority**: 🔴 Critical — binary assets won't push without LFS.

**Problem**: `public/assets/` contains binary files (`.glb`, `.jpg`, `.png`) that exceed GitHub's file size recommendations. Git LFS must be configured before pushing.

**Steps**:
1. Create `.gitattributes` tracking `*.glb`, `*.jpg`, `*.png`, `*.exr` with LFS
2. Run `git lfs install` and `git lfs track`
3. Update `.github/workflows/*.yml` to include `lfs: true` in checkout steps
4. Commit and push

**Files**:
- `.gitattributes` — LFS tracking rules
- `.github/workflows/*.yml` — add `lfs: true` to `actions/checkout`

---

### Phase 2 — Renderer Unification (Decision Pending)

> **Priority**: 🟡 Medium — R3F works on web, but the project standard specifies BabylonJS for web.

**Current State**: The game uses React Three Fiber directly. The user's global rules mention a `GameView3D` platform split where:
- **Native** → `react-native-filament`
- **Web** → BabylonJS

**Decision needed**: Keep R3F (simpler, working now) or migrate to BabylonJS?

If keeping R3F: Document the deviation from the project standard.

---

### Phase 3 — Audio Integration

> **Priority**: 🟢 Low — polish feature

**Goal**: AI actions trigger audio feedback via **Tone.js**.

| Event | Sound |
| --- | --- |
| Governor places a building | Construction synth (percussive) |
| Wave starts | War horn (FM synth sweep) |
| Wave ends | Victory chime |
| Enemy reaches Sanctuary | Impact drum + HP-loss thud |
| Smite ability used | Lightning crack |

**Files to create/modify**:
- `src/engine/audio/SoundManager.ts` — synth definitions
- `src/engine/audio/AmbienceManager.ts` — ambient loops
- `src/engine/ai/Goals.ts` — trigger `SoundManager` on goal completion

---

### Phase 4 — Deepening AI

> **Priority**: 🟡 Medium — gameplay quality

**Governor Brain Improvements**:
- Factor in `wave` number for threat assessment
- Track gold income rate from Huts to decide economy > defense
- Add a "Repair" goal for damaged buildings
- Implement a "Rally" goal that triggers Smite on enemy clusters

**Enemy AI Improvements**:
- Add `EvadeBehavior` to dodge Range projectiles
- Boss enemies target Huts (economic sabotage)
- Troll enemies ignore walls and path toward Sanctuary

---

### Phase 5 — E2E Verification

> **Priority**: 🟡 Medium — proves the game works end-to-end

**Needed Improvements**:
- Add visual regression: compare screenshots against baseline
- Add a "full playthrough" test: AI builds → wave spawns → combat → wave ends
- Capture WebGL canvas screenshots (not just DOM snapshots)

---

## Architecture Diagram

```text
┌─────────────────────────────────────────────────┐
│                   Expo Router                    │
│              src/app/game.tsx                     │
├─────────────────────────────────────────────────┤
│            React Three Fiber Canvas              │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐ │
│  │Environment│ │  MapGrid  │ │   Sanctuary    │ │
│  │(HDRI sky) │ │(PBR grass)│ │                │ │
│  └───────────┘ └───────────┘ └────────────────┘ │
│  ┌───────────────┐ ┌──────────────────────────┐ │
│  │BuildingMesh   │ │      UnitMesh            │ │
│  │(useGLTF URLs) │ │ (useGLTF: knight/orc)    │ │
│  └───────────────┘ └──────────────────────────┘ │
│  ┌───────────────┐ ┌──────────────────────────┐ │
│  │CombatController│ │  GovernorController     │ │
│  │(Yuka sync)    │ │ (PlayerGovernorBrain)    │ │
│  └───────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────┤
│               Zustand Store                      │
│         src/store/useGameStore.ts                 │
├─────────────────────────────────────────────────┤
│              Engine Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │constants │ │combatLogic│ │  mapGenerator   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────┐   │
│  │            Yuka AI                        │   │
│  │  EntityManager │ EnemyBrain │ Goals       │   │
│  │  PlayerGovernorBrain                      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Asset Inventory

### 3D Models (CC0, GLB)

All sourced from `/Volumes/home/assets/3DLowPoly/`.

| File | Source Pack | Purpose | Size |
| --- | --- | --- | --- |
| `wall.glb` | Castle Kit (Kenney) | Wall building | 16 KB |
| `hut.glb` | Tower Defense Kit (Kenney) | Hut / economy building | 35 KB |
| `range.glb` | Tower Defense Kit (Kenney) | Ballista / range tower | 58 KB |
| `sanctuary.glb` | Tower Defense Kit (Kenney) | Temple & Keep buildings | 37 KB |
| `knight.glb` | Knight Character (Quaternius) | Player units | 401 KB |
| `orc.glb` | Ultimate Monsters (Quaternius) | Enemy units | 711 KB |
| `colormap.png` | Tower Defense Kit (Kenney) | Shared texture atlas | ~50 KB |

### PBR Materials (CC0, AmbientCG)

All sourced from `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/`.

| Material | Maps | Usage |
| --- | --- | --- |
| Grass001 | Color, NormalGL, Roughness | Terrain ground tiles |
| Gravel017 | Color, NormalGL, Roughness | Path tiles, scenery |
| Bricks021 | Color, NormalGL, Roughness | Wall/barricade textures (future) |
| Planks012 | Color, NormalGL, Roughness | Hut/range wood textures (future) |

### HDRI Skyboxes (CC0, AmbientCG)

Sourced from `/Volumes/home/assets/2DPhotorealistic/HDRI/1K/`.

| File | Original | Usage |
| --- | --- | --- |
| `day.jpg` | DayEnvironmentHDRI001 | Default skybox + IBL |
| `evening.jpg` | EveningSkyHDRI010A | Dusk/sunset phases (future) |
| `night.jpg` | NightSkyHDRI003 | Night wave phases (future) |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Expo SDK + expo-router |
| 3D (Web) | React Three Fiber + @react-three/drei |
| 3D (Native) | react-native-filament (planned) |
| AI | Yuka (GOAP, Steering, Entity Management) |
| State | Zustand |
| Audio | Tone.js (planned) |
| Styling | NativeWind (Tailwind for RN) |
| CI/CD | GitHub Actions v4 → GitHub Pages |
| E2E Testing | Playwright (headed Chrome, WebGL) |
| Linting | Biome |
| Package Manager | pnpm |
| Binary Assets | Git LFS (pending setup) |
