---
title: "Getting Started"
domain: guides
audience: developers
reads-before: [../memory-bank/techContext.md]
last-updated: 2026-03-13
status: stable
summary: "Dev setup, commands, testing, and contribution guidelines"
---

# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 10+
- iOS Simulator (Xcode) or Android Emulator for mobile testing
- A modern browser for web development

## Setup

```bash
git clone <repo-url>
cd grailguard
pnpm install
```

## Development

```bash
pnpm start          # Expo dev server (choose platform)
pnpm web            # Web dev server directly
pnpm ios            # iOS simulator
pnpm android        # Android emulator
```

## Testing

```bash
pnpm test           # Run Jest test suite
pnpm test:coverage  # Jest with coverage report
```

Test files live in `src/__tests__/` organized by domain:
- `engine/gameEngine.test.ts` -- ECS simulation tests
- `db/metaService.test.ts` -- Persistence service tests
- `app/metaScreens.test.tsx` -- Screen component tests
- `e2e/goapPlayer.test.ts` -- AI behavior tests

## Code Quality

```bash
pnpm lint           # Biome lint check
pnpm lint:fix       # Auto-fix lint issues
pnpm format         # Biome format
pnpm typecheck      # TypeScript type-check (tsc --noEmit)
```

## Database

```bash
pnpm db:generate    # Generate Drizzle ORM migrations
```

Schema is defined in `src/db/schema.ts`. Migrations run automatically on app start via `DatabaseProvider.tsx`.

## Key Conventions

1. **pnpm only** -- Never use npm or yarn
2. **Biome only** -- Never use ESLint or Prettier
3. **No DOM APIs** -- React Native environment, use RN primitives
4. **No `useState` for animation** -- Use `useFrame` + `useRef` for per-frame updates
5. **Engine logic in `src/engine/`** -- Never put game logic in React components
6. **DB access via `src/db/`** -- Never query SQLite directly from UI components
7. **Named exports** -- Prefer named exports over `export default`
