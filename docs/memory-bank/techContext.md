---
title: "Grailguard Tech Context"
domain: technology
audience: all-agents
reads-before: [projectbrief.md]
last-updated: 2026-03-13
status: stable
summary: "Tech stack, dependencies, dev setup, tooling, and constraints"
---

# Tech Context

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo SDK | 55 |
| Runtime | React + React Native | 19.2 / 0.83 |
| 3D Rendering | React Three Fiber + drei | 9.5 / 10.7 |
| ECS | Koota | 0.6 |
| AI/Pathfinding | Yuka | 0.7 |
| Audio | Tone.js | 15.1 |
| Database | expo-sqlite + drizzle-orm | 55.0 / 0.45 |
| UI Components | RN Primitives (popover, progress, toolbar, tooltip) | 1.x |
| Styling | NativeWind + Tailwind CSS | 4.2 / 3.4 |
| Language | TypeScript (strict) | 5.9 |
| Lint/Format | Biome | 2.4 |
| Testing | Jest + Playwright | 29.7 / 1.58 |
| Package Manager | pnpm | 10.32 |
| 3D Format | GLB (embedded textures) | -- |

## Project Structure

```
grailguard/
├── app/                    # Expo Router entry points (re-exports from src/app/)
├── src/
│   ├── app/                # Screen components (index, game, codex, doctrine, settings)
│   ├── components/
│   │   ├── 3d/             # R3F scene components
│   │   │   ├── Arena.tsx           # Main 3D scene (camera, terrain, entities)
│   │   │   ├── Entities/           # Per-entity-type mesh components
│   │   │   └── modelPaths.ts       # GLB asset path registry
│   │   └── ui/
│   │       └── HUD.tsx             # In-game overlay (toychest, stats, spells)
│   ├── engine/
│   │   ├── GameEngine.ts           # ECS world, traits, simulation systems (~2200 LOC)
│   │   ├── constants.ts            # Type definitions + data dictionaries (buildings, units)
│   │   ├── mapGenerator.ts         # Seeded procedural road generation
│   │   ├── selectors.ts            # ECS query helpers for UI
│   │   └── SoundManager.ts         # Tone.js procedural audio engine
│   ├── db/
│   │   ├── schema.ts               # Drizzle table definitions
│   │   ├── client.ts               # SQLite connection
│   │   ├── meta.ts                 # Service facade (React hooks + async ops)
│   │   ├── migrations.ts           # Schema migration runner
│   │   ├── DatabaseProvider.tsx     # React context for DB initialization
│   │   └── repos/                  # Repository functions per domain
│   └── __tests__/                  # Jest test suites
├── assets/
│   ├── models/             # GLB character/building models
│   └── materials/          # PBR texture sets (Grass001, Ground001)
├── docs/                   # Documentation (this directory)
├── e2e/                    # Playwright E2E tests (planned)
└── drizzle.config.ts       # Drizzle Kit configuration
```

## Common Commands

```bash
pnpm install              # Install dependencies
pnpm start                # Expo dev server
pnpm web                  # Web dev server
pnpm ios                  # iOS simulator
pnpm android              # Android emulator
pnpm test                 # Run Jest tests
pnpm test:coverage        # Jest with coverage
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm format               # Biome format
pnpm typecheck            # TypeScript type-check
pnpm db:generate          # Generate Drizzle migrations
```

## Key Constraints

1. **No DOM APIs** -- React Native environment, no `document.*` or `window.*`
2. **No Zustand** -- ECS is the runtime authority, not a state management library
3. **60 FPS target** -- Per-frame work must stay inside `useFrame`/ECS, never React state
4. **GLBs only** -- All 3D assets are GLB with embedded textures
5. **pnpm only** -- No npm or yarn
6. **Biome only** -- No ESLint or Prettier
