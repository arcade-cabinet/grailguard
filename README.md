# Grailguard

A 2.5D auto-battler tower defense game where you defend the Holy Grail by placing spawner buildings, turrets, and resource logistics along a winding road. Built with Vite, React Three Fiber, Koota ECS, and Capacitor for cross-platform deployment.

## Features

- **Auto-Battler TD** -- Place buildings that spawn units to fight autonomously
- **Factorio-Style Logistics** -- Mine resources, build conveyor tracks, route materials to processing buildings
- **15 Building Types** -- Spawners, turrets, resource producers, and infrastructure
- **Meta-Progression** -- Earn coins to permanently unlock buildings, spells, and doctrine bonuses
- **Spell System** -- Cast 7 different spells using faith resource
- **Relic Drafts** -- Choose run-specific power-ups every 5 waves
- **Save/Resume** -- Full ECS snapshot serialization for mid-run persistence
- **Cross-Platform** -- Web, iOS, and Android from a single Vite + Capacitor codebase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 8 |
| UI | React 19 |
| 3D | React Three Fiber 9 + drei 10 |
| ECS | Koota 0.6 |
| AI | Yuka 0.7 |
| Audio | Tone.js 15 |
| Database | sql.js + drizzle-orm |
| Styling | Tailwind CSS 3 + daisyUI |
| Native | Capacitor 8 (iOS, Android) |
| Testing | Vitest 4 + Playwright |
| Language | TypeScript 5.9 |

## Quick Start

```bash
pnpm install
pnpm dev            # Vite dev server
pnpm build          # Production build (typecheck + vite build)
pnpm test           # Run Vitest test suite
pnpm test:e2e       # Run Playwright end-to-end tests
pnpm lint           # Biome lint check
pnpm typecheck      # TypeScript type-check (tsc --noEmit)
```

## Project Structure

```
src/
├── main.tsx            # Vite entry point
├── app/                # Route components (index, game, codex, doctrine, settings, history)
├── components/
│   ├── 3d/             # R3F scene and entity mesh components
│   └── ui/             # HUD overlay, radial menu, debug overlay, tutorial
├── engine/             # Game simulation (ECS world, systems, AI, audio)
├── data/               # JSON config files (balance, units, buildings, etc.)
├── db/                 # sql.js persistence (schema, repos, migrations)
├── i18n/               # Localization strings
└── __tests__/          # Vitest test suites
```

## Documentation

See `docs/` for comprehensive documentation:
- `AGENTS.md` -- AI agent navigation guide
- `memory-bank/` -- Project context and status
- `architecture/` -- Technical deep dives
- `game-design/` -- Game mechanics and balance data
- `guides/` -- Developer setup and conventions
