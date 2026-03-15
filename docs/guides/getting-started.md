---
title: "Getting Started"
domain: guides
audience: developers
reads-before: [../memory-bank/techContext.md]
last-updated: 2026-03-14
status: stable
summary: "Dev setup, commands, testing, and contribution guidelines"
---

# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 10+
- A modern browser for web development
- Xcode (for iOS builds via Capacitor)
- Android Studio (for Android builds via Capacitor)

## Setup

```bash
git clone <repo-url>
cd grailguard
pnpm install
```

## Development

```bash
pnpm dev             # Vite dev server (web)
pnpm build           # Production build (typecheck + vite build)
pnpm preview         # Preview production build locally
```

### Native (Capacitor)

After building for web (`pnpm build`), sync and open in native IDEs:

```bash
npx cap sync
npx cap open ios     # Open in Xcode
npx cap open android # Open in Android Studio
```

## Testing

```bash
pnpm test            # Run Vitest test suite
pnpm test:watch      # Vitest in watch mode
pnpm test:coverage   # Vitest with coverage report
pnpm test:e2e        # Run Playwright end-to-end tests
pnpm test:e2e:ui     # Playwright with interactive UI
```

Test files live in `src/__tests__/` organized by domain:
- `engine/gameEngine.test.ts` -- ECS simulation tests
- `db/metaService.test.ts` -- Persistence service tests
- `app/metaScreens.test.tsx` -- Screen component tests
- `e2e/goapPlayer.test.ts` -- AI behavior tests
- `scenarios/waveScenarios.test.ts` -- Wave balance tests

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

Schema is defined in `src/db/schema.ts`. The database uses sql.js (a WebAssembly SQLite build) with Drizzle ORM. Migrations run automatically on app start via `DatabaseProvider.tsx`.

## Key Conventions

1. **pnpm only** -- Never use npm or yarn
2. **Biome only** -- Never use ESLint or Prettier
3. **No DOM APIs in engine code** -- Engine logic is framework-agnostic
4. **No `useState` for animation** -- Use `useFrame` + `useRef` for per-frame updates
5. **Engine logic in `src/engine/`** -- Never put game logic in React components
6. **DB access via `src/db/`** -- Never query sql.js directly from UI components
7. **Named exports** -- Prefer named exports over `export default`
