# ⚔️ GrailGuard

A medieval tower-defense game where you build walls, train knights, and defend a sacred Sanctuary from waves of orcs and goblins.

Built with **Expo** + **React Three Fiber** + **Yuka AI**.

## 🎮 Gameplay

- Place **walls**, **huts**, **ranges**, **temples**, and **keeps** on a 22×22 grid
- Each building spawns allied units (militia, archers, clerics, knights)
- Enemy waves of goblins, orcs, trolls, and bosses attack from the map edges
- Defend your **Sanctuary** — if its HP reaches 0, you lose
- Use the **AI Governor** to auto-play, or take manual control

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start the web dev server
pnpm web

# Or start with Expo (all platforms)
pnpm start
```

Open [http://localhost:8085](http://localhost:8085) in your browser.
## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests (headed Chrome)
pnpm test:e2e

# Type checking
pnpm typecheck

# Linting (Biome)
pnpm lint
```

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 55 + expo-router |
| 3D Rendering | React Three Fiber + @react-three/drei |
| AI | Yuka (GOAP, steering behaviors) |
| State | Zustand |
| Language | TypeScript 5.9 |
| Linting | Biome |
| Testing | Jest + Playwright |
| CI/CD | GitHub Actions → GitHub Pages |
| Package Manager | pnpm |

## 📂 Project Structure

```
src/
├── app/              # Expo Router pages
│   ├── index.tsx     # Main menu
│   └── game.tsx      # Game screen
├── assets/models/    # CC0 .glb 3D models
├── components/3d/    # React Three Fiber components
│   └── Entities/     # BuildingMesh, UnitMesh
├── engine/           # Game logic
│   ├── ai/           # Yuka AI (enemy brains, governor)
│   ├── constants.ts  # Types, stats, costs
│   ├── combatLogic.ts
│   └── mapGenerator.ts
├── store/            # Zustand state management
└── utils/
```

## 📖 Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture & design decisions |
| [DESIGN.md](docs/DESIGN.md) | Game design document (units, economy, AI) |
| [Roadmap](docs/plans/roadmap.md) | Feature roadmap & phased plan |
| [Asset Pipeline](docs/plans/asset-pipeline.md) | 3D asset loading strategy |
| [CLAUDE.md](CLAUDE.md) | AI agent coding instructions |
| [AGENTS.md](AGENTS.md) | Agent & asset documentation |

## 🎨 Assets

All 3D models are **CC0-licensed** low-poly assets from:
- **[Kenney](https://kenney.nl)** — Castle Kit, Tower Defense Kit
- **[Quaternius](https://quaternius.com)** — Animated characters, fantasy monsters

## 📜 License

Private project — part of the `arcade-cabinet` monorepo.