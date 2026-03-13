# CLAUDE.md -- Grailguard

**You MUST read `AGENTS.md` (this directory) at the start of every session.** It contains cross-agent rules, architecture conventions, and pointers to the full documentation system.

## Claude-Specific Configuration

### Mandatory Session Start

1. Read root `AGENTS.md` for project rules and conventions
2. Read `docs/memory-bank/activeContext.md` and `docs/memory-bank/progress.md`
3. Scan `docs/AGENTS.md` for doc navigation if working in an unfamiliar domain

### Hard Rules

| Rule | Details |
|------|---------|
| No DOM APIs | This is React Native. Never use `document.*`, `window.*`, or HTML elements |
| No `useState` for animation | Use `useFrame` + `useRef` for per-frame position/rotation/scale |
| Engine logic in `src/engine/` | Never put simulation logic in React components |
| DB access via `src/db/` | Never query SQLite directly from UI code |
| pnpm only | Never npm or yarn |
| Biome only | Never ESLint or Prettier |
| Named exports | Prefer named over `export default` |

### Tech Stack Quick Reference

| Layer | Tech |
|-------|------|
| Framework | Expo SDK 55 |
| 3D | React Three Fiber 9 + drei 10 |
| ECS | Koota 0.6 |
| AI | Yuka 0.7 |
| Audio | Tone.js 15 |
| DB | expo-sqlite + drizzle-orm |
| Styling | NativeWind 4 + Tailwind 3 |
| Testing | Jest 29 + Playwright |

### Common Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Expo dev server
pnpm web              # Web dev server
pnpm test             # Run tests
pnpm lint             # Biome lint
pnpm typecheck        # TypeScript check
pnpm db:generate      # Drizzle migrations
```
