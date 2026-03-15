---
title: "Grailguard Tech Context"
domain: technology
audience: all-agents
reads-before: [projectbrief.md]
last-updated: 2026-03-14
status: stable
summary: "Tech stack, dependencies, dev setup, tooling, and constraints"
---

# Tech Context

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite | 8.0 |
| Framework | React + react-router-dom | 19.2 / 7.13 |
| 3D Rendering | React Three Fiber + drei | 9.5 / 10.7 |
| ECS | Koota | 0.6 |
| AI/Pathfinding | Yuka | 0.7 |
| Audio | Tone.js | 15.1 |
| Database | sql.js (WASM) + drizzle-orm | 1.14 / 0.45 |
| UI Components | Radix UI (dialog, popover, progress, toolbar, tooltip) | 1.x |
| Styling | Tailwind CSS + DaisyUI | 3.4 / 5.5 |
| Animation | Framer Motion | 12.36 |
| Language | TypeScript (strict) | 5.9 |
| Lint/Format | Biome | 2.4 |
| Testing | Vitest | 4.1 |
| Native | Capacitor (iOS + Android) | 8.2 |
| Package Manager | pnpm | 10.32 |
| 3D Format | GLB (embedded textures) | -- |

## Project Structure

```
grailguard/
├── src/
│   ├── main.tsx                    # Vite entry point
│   ├── global.css                  # Tailwind base styles
│   ├── app/                        # Route components (index, game, codex, doctrine, settings, history)
│   ├── components/
│   │   ├── 3d/                     # R3F scene components
│   │   │   ├── Arena.tsx           # Main 3D scene (PBR terrain, HDRI sky, fog, entities)
│   │   │   ├── CameraController.tsx # Orthographic camera rig
│   │   │   ├── DayNightCycle.tsx   # Lighting cycle
│   │   │   ├── Sanctuary.tsx       # Holy Grail model
│   │   │   ├── TerrainGrid.tsx     # InstancedMesh terrain tiles
│   │   │   ├── ParticlePool.tsx    # InstancedMesh particle system
│   │   │   ├── GestureOverlay.tsx  # Touch gesture handling
│   │   │   ├── Entities/           # Per-entity-type mesh components
│   │   │   └── modelPaths.ts       # GLB asset path registry
│   │   └── ui/
│   │       ├── HUD.tsx             # In-game overlay (stats, spells, wave info)
│   │       ├── RadialMenu.tsx      # Context-aware radial building menu
│   │       ├── DebugOverlay.tsx    # Development debug panel
│   │       └── Tutorial.tsx        # Onboarding tutorial
│   ├── engine/
│   │   ├── GameEngine.ts           # ECS world, traits, orchestration layer
│   │   ├── constants.ts            # Type definitions
│   │   ├── mapGenerator.ts         # Seeded procedural road generation
│   │   ├── selectors.ts            # ECS query helpers for UI
│   │   ├── SoundManager.ts         # Tone.js procedural audio engine
│   │   ├── haptics.ts              # Haptic feedback
│   │   ├── telemetry.ts            # Runtime performance metrics
│   │   ├── systems/                # Decomposed engine subsystems
│   │   │   ├── waveSystem.ts       # Wave spawning + progression
│   │   │   ├── combatSystem.ts     # Melee/ranged combat
│   │   │   ├── buildingSystem.ts   # Building logic + turrets
│   │   │   ├── logisticsSystem.ts  # Minecart track routing
│   │   │   ├── projectileSystem.ts # Projectile movement + impact
│   │   │   ├── spellSystem.ts      # Spell casting + cooldowns
│   │   │   ├── vfxSystem.ts        # Particles + floating text
│   │   │   ├── codexSystem.ts      # Auto-discovery encyclopedia
│   │   │   ├── biomeSystem.ts      # Biome modifiers
│   │   │   └── rng.ts              # Seeded deterministic PRNG
│   │   ├── ai/                     # AI modules
│   │   │   ├── enemyBrain.ts       # Enemy steering + flocking
│   │   │   └── playerGovernor.ts   # GOAP autonomous play
│   │   └── audio/                  # Audio modules
│   │       ├── audioBridge.ts      # Event bus (engine -> audio)
│   │       └── ambienceManager.ts  # Environmental audio
│   ├── data/                       # 23 JSON config files (balance, units, buildings, etc.)
│   ├── db/
│   │   ├── schema.ts               # Drizzle table definitions
│   │   ├── client.ts               # sql.js connection
│   │   ├── meta.ts                 # Service facade (React hooks + async ops)
│   │   ├── migrations.ts           # Schema migration runner
│   │   ├── DatabaseProvider.tsx     # React context for DB initialization
│   │   └── repos/                  # Repository functions per domain
│   ├── i18n/                       # Internationalization
│   └── __tests__/                  # Vitest test suites
├── assets/
│   ├── models/             # GLB character/building models
│   └── materials/          # PBR texture sets (Grass001, Ground001)
├── docs/                   # Documentation
├── vite.config.ts          # Vite build configuration
├── vitest.config.ts        # Vitest test configuration
├── capacitor.config.ts     # Capacitor native wrapper config
├── tailwind.config.*       # Tailwind CSS configuration
└── drizzle.config.ts       # Drizzle Kit configuration
```

## Common Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Vite dev server (port 5173)
pnpm build                # TypeScript check + Vite production build
pnpm preview              # Preview production build
pnpm test                 # Run Vitest tests
pnpm test:watch           # Vitest in watch mode
pnpm test:coverage        # Vitest with coverage
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm format               # Biome format
pnpm typecheck            # TypeScript type-check
pnpm db:generate          # Generate Drizzle migrations
```

## Key Constraints

1. **No Zustand** -- ECS is the runtime authority, not a state management library
2. **60 FPS target** -- Per-frame work must stay inside `useFrame`/ECS, never React state
3. **GLBs only** -- All 3D assets are GLB with embedded textures
4. **pnpm only** -- No npm or yarn
5. **Biome only** -- No ESLint or Prettier
6. **Engine logic in `src/engine/`** -- Never put simulation code in React components
7. **DB access via `src/db/`** -- Never query sql.js directly from UI code
