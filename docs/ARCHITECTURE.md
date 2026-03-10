# GrailGuard — Architecture

## High-Level Overview

GrailGuard is a medieval tower-defense game built as a cross-platform Expo application. The architecture is layered into four main tiers: **Presentation**, **State**, **Engine/Systems**, and **AI/ECS**.

```text
┌──────────────────────────────────────────────────────────────┐
│                      PRESENTATION                             │
│  Expo Router (src/app/)                                       │
│  ├── index.tsx           Main menu                            │
│  └── game.tsx            Game screen (R3F Canvas + HUD)       │
│                                                               │
│  React Components (src/components/)                           │
│  ├── ui/                 UI overlays, HUD, Menus, Modals      │
│  └── 3d/                 React Three Fiber Components         │
│      ├── game/           Composition (GameScene, Interactions)│
│      ├── Entities/       BuildingMesh, UnitMesh, ECSRenderer  │
│      ├── Environment.tsx HDRI skybox (CC0) + day/night cycle  │
│      └── MapGrid.tsx     PBR terrain (Grass001 + Gravel017)   │
├──────────────────────────────────────────────────────────────┤
│                         STATE                                 │
│  Zustand & Context (src/store/)                               │
│  ├── useGameStore.ts     Volatile game loop (HP, Gold, Units) │
│  └── useMetaStore.ts     Persistent save (Unlocks, Coins)     │
├──────────────────────────────────────────────────────────────┤
│                     ENGINE & SYSTEMS                          │
│  Logic & ECS (src/engine/)                                    │
│  ├── systems/            Pure data-driven simulators          │
│  │   ├── CombatSystem    Damage, targeting, rewards           │
│  │   └── BuildingSystem  Spawners, level stats, timers        │
│  ├── ecs/                Koota Data-Oriented Design           │
│  │   ├── world.ts        Koota instance                       │
│  │   └── traits.ts       Tags: Position, Health, CombatStats  │
│  ├── audio/              Tone.js audio orchestration          │
│  │   ├── SoundManager    Spells, hits, kills, UI              │
│  │   ├── AmbienceManager Adaptive loop layers                 │
│  │   └── AudioBridge     Game state -> Audio listener bounds  │
│  └── data/               Static configuration (gameConfig.json)│
├──────────────────────────────────────────────────────────────┤
│                          AI                                   │
│  Yuka (src/engine/ai/)                                        │
│  ├── EntityManager.ts    Yuka singleton                       │
│  ├── EnemyBrain.ts       Enemy vehicle & steering (Evade)     │
│  ├── Goals.ts            GOAP goals + evaluators              │
│  └── PlayerGovernorBrain AI auto-player with weighted GOAP    │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

```text
User Input (tap grid / HUD)
  │
  ▼
Zustand Store (placeBuilding / castSpell)
  │
  ├──▶ R3F Canvas Render (GameScene)
  │      └── React syncs meshes to current unitIds array.
  │
  ├──▶ useFrame Controllers (CombatController, BuildingController)
  │      ├── Read from `useGameStore.getState()`
  │      ├── Execute `stepCombatSimulation` & `stepBuildingSimulation`
  │      └── Write back via atomic `batchSetUnits()`
  │
  └──▶ Yuka AI Update (Governor / Steering)
         └── Drives autonomous enemy motion and AI Governor actions
```

## Key Design Decisions

### 1. Pure System Decompositions
Controllers (like `CombatController` and `BuildingController`) act purely as React-to-Engine bridges. The actual game logic lives in decoupled TypeScript files in `src/engine/systems/`. This allows rigorous Jest unit testing of combat, logic, and spawning without mocking React Three Fiber contexts.

### 2. Koota Entity Component System (ECS)
We migrated toward a data-driven ECS architecture using `koota` to track complex components like `Weapon` ranges and `Scenery`. This ensures memory is tightly packed and avoids the typical React reconciliation thrash for entities.

### 3. Static Configuration via JSON
All magic numbers (costs, base damage, max HP, attack ranges, wave scaling factors) are decoupled from logic files and stored in `src/data/gameConfig.json`. This acts as the single source of truth for game balance and UI (e.g., the marketplace) while retaining tight TypeScript types.

### 4. PBR Materials & Instanced Props
Terrain tiles use real AmbientCG CC0 PBR textures (Color, NormalGL, Roughness) mapped to `THREE.MeshStandardMaterial`. Heavy visuals like particle effects and unit drop items (coins, stars) are executed through pooled `InstancedMesh` components (`ParticleSystem.tsx`) to achieve stable 60 FPS under load. 

### 5. Tone.js Audio Engine
Procedural game audio is managed purely via Synthesis and Audio Context logic in `src/engine/audio/` without reliance on heavy static `.mp3` files (except for specific ambient noise layers). `SoundManager.ts` dynamically patches envelopes for impacts, kills, and spells based on action severity. 

### 6. Automated Testing Standards
Changes to pure functions, constants, math utilities, and `systems/` are rigorously vetted using Jest test suites inside `src/__tests__/`. Visual rendering regressions are guarded by Playwright End-to-End snapshot checking in `e2e/`.

## Platform Targets

| Platform | Renderer | Status |
| --- | --- | --- |
| Web (Chrome/Firefox) | React Three Fiber | ✅ Working |
| iOS (native) | react-native-filament (planned) | 🔲 Not started |
| Android (native) | react-native-filament (planned) | 🔲 Not started |
