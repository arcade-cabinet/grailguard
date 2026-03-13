# Grailguard

A 2.5D auto-battler tower defense game where you defend the Holy Grail by placing spawner buildings, turrets, and resource logistics along a winding road. Built with Expo SDK 55, React Three Fiber, and Koota ECS.

## Features

- **Auto-Battler TD** -- Place buildings that spawn units to fight autonomously
- **Factorio-Style Logistics** -- Mine resources, build conveyor tracks, route materials to processing buildings
- **15 Building Types** -- Spawners, turrets, resource producers, and infrastructure
- **Meta-Progression** -- Earn coins to permanently unlock buildings, spells, and doctrine bonuses
- **Spell System** -- Cast 7 different spells using faith resource
- **Relic Drafts** -- Choose run-specific power-ups every 5 waves
- **Save/Resume** -- Full ECS snapshot serialization for mid-run persistence
- **Cross-Platform** -- Web, iOS, and Android from a single Expo codebase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 |
| 3D | React Three Fiber 9 + drei 10 |
| ECS | Koota 0.6 |
| AI | Yuka 0.7 |
| Audio | Tone.js 15 |
| Database | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 |
| Language | TypeScript 5.9 |

## Quick Start

```bash
pnpm install
pnpm web        # Web dev server
pnpm ios        # iOS simulator
pnpm android    # Android emulator
pnpm test       # Run tests
```

## Project Structure

```
src/
├── app/            # Expo Router screens (menu, game, codex, doctrine, settings)
├── components/
│   ├── 3d/         # R3F scene and entity mesh components
│   └── ui/         # React Native HUD overlay
├── engine/         # Game simulation (ECS world, constants, map generator, audio)
├── db/             # SQLite persistence (schema, repos, migrations)
└── __tests__/      # Jest test suites
```

## Documentation

See `docs/` for comprehensive documentation:
- `AGENTS.md` -- AI agent navigation guide
- `memory-bank/` -- Project context and status
- `architecture/` -- Technical deep dives
- `game-design/` -- Game mechanics and balance data
- `guides/` -- Developer setup and conventions
