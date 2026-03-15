# AGENTS.md -- Grailguard Multi-Agent Guide

**Purpose:** Guide any AI agent (Claude Code, Cursor, Cline, Windsurf, Gemini, or custom) to effectively contribute to Grailguard. This is the entry point -- read this first, then follow pointers below.

## Quick Start for Agents

1. **Read this file** -- project identity, hard rules, architecture summary
2. **Read `docs/memory-bank/activeContext.md`** -- current work focus and recent changes
3. **Read `docs/memory-bank/progress.md`** -- what's built, what's left
4. **Navigate to domain docs via `docs/AGENTS.md`** -- find the right doc for your task

## Project Identity

**Grailguard** is a 2.5D auto-battler tower defense game. Players defend a Holy Grail by placing spawner buildings and turrets along a procedurally generated winding road. Features Factorio-style resource logistics with minecart tracks.

- **Stack:** Vite 8 + React 19 + React Three Fiber + Koota ECS + Yuka AI + sql.js/Drizzle + Capacitor 8
- **Targets:** Web, iOS, Android from a single web-first codebase
- **Goal:** 60 FPS, web-first with Capacitor native wrapper

## Architecture Summary

```
Rendering (Vite + React + R3F)       <-- projection layer, never owns state
    |
Simulation (Koota ECS + Yuka AI)     <-- runtime authority for all live game data
    |
Persistence (sql.js + Drizzle ORM)   <-- durable state (profile, unlocks, saves)
    |
Native (Capacitor 8)                 <-- wraps web build for iOS/Android
```

- **UI dispatches commands** via `queueWorldCommand()`, never mutates ECS directly
- **ECS traits** own all runtime state (session, buildings, units, particles, etc.)
- **DB repos** handle all persistence (profile, settings, unlocks, active run snapshots)
- **React components** read ECS traits and render; per-frame updates use `useFrame` + refs

## Hard Rules (Non-Negotiable)

1. **No React state for per-frame data.** Use `useFrame` + `useRef` for position/rotation.
2. **Engine logic in `src/engine/`.** Never put simulation code in React components.
3. **DB access via `src/db/`.** Never query sql.js directly from UI.
4. **No Zustand.** ECS is the runtime authority.
5. **pnpm only.** Never npm or yarn.
6. **Biome only.** Never ESLint or Prettier.
7. **Preload all GLBs** via `useGLTF.preload()` before gameplay.
8. **Use InstancedMesh** for high-volume repeated geometry.

## Documentation System

```
AGENTS.md (this file)            -- Entry point, project rules
    |
    v
docs/AGENTS.md                   -- Documentation navigation guide
    |
    ├── docs/memory-bank/        -- Persistent project context (Cline Memory Bank)
    │   ├── AGENTS.md            -- Memory bank read/write protocols
    │   ├── projectbrief.md      -- Foundation, vision, scope
    │   ├── productContext.md    -- Why, audience, UX goals
    │   ├── systemPatterns.md    -- Architecture, data flow, patterns
    │   ├── techContext.md       -- Tech stack, structure, commands
    │   ├── activeContext.md     -- Current focus, recent changes
    │   └── progress.md          -- What works, what's left
    │
    ├── docs/architecture/       -- Technical deep dives
    │   ├── engine.md            -- ECS, simulation systems, game loop
    │   ├── persistence.md       -- SQLite, Drizzle, snapshots
    │   └── rendering.md         -- R3F scene, meshes, camera
    │
    ├── docs/game-design/        -- Game mechanics
    │   ├── combat.md            -- Units, stats, affixes, wave pacing
    │   ├── buildings.md         -- Buildings, economy, logistics
    │   └── spells-relics-doctrines.md
    │
    ├── docs/design/            -- Brand & UX design
    │   └── brand-and-ux.md     -- Visual identity, metaphors, component patterns
    │
    └── docs/guides/             -- Developer guides
        └── getting-started.md   -- Setup, commands, conventions
```

## Memory Bank Protocol

Every agent's context resets between sessions. The Memory Bank is the only persistent link.

**On session start (MANDATORY):**
1. Read `docs/memory-bank/activeContext.md` and `progress.md`
2. Read `docs/memory-bank/systemPatterns.md` and `techContext.md` for architecture
3. Read domain-specific docs via `docs/AGENTS.md` navigation guide

**On session end (MANDATORY):**
1. Update `activeContext.md` with accomplishments and next steps
2. Update `progress.md` if implementation status changed
3. Update other memory bank files only if architecture or scope changed

## Source Code Map

```
src/
├── main.tsx            # Vite entry point
├── app/                # Route components (index, game, codex, doctrine, settings, history)
├── components/
│   ├── 3d/             # R3F scene (Arena, camera, terrain, entities, particles)
│   └── ui/             # HUD overlay, radial menu, debug overlay, tutorial
├── engine/
│   ├── GameEngine.ts   # Koota ECS world + orchestration layer
│   ├── constants.ts    # Type definitions
│   ├── mapGenerator.ts # Seeded procedural road generation
│   ├── selectors.ts    # ECS query helpers for UI
│   ├── SoundManager.ts # Tone.js procedural audio
│   ├── systems/        # 9 decomposed subsystem modules + seeded PRNG
│   ├── ai/             # Enemy brain + GOAP player governor
│   └── audio/          # Audio bridge + ambience manager
├── data/               # 23 JSON config files (balance, units, buildings, etc.)
├── db/
│   ├── schema.ts       # Drizzle table definitions (8 tables)
│   ├── meta.ts         # Service facade (hooks + async ops)
│   ├── repos/          # Per-domain repository functions
│   └── migrations.ts   # Schema migration runner
└── __tests__/          # Vitest test suites
```
