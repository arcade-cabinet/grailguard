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
| No `useState` for animation | Use `useFrame` + `useRef` for per-frame position/rotation/scale |
| Engine logic in `src/engine/` | Never put simulation logic in React components |
| DB access via `src/db/` | Never query sql.js directly from UI code |
| pnpm only | Never npm or yarn |
| Biome only | Never ESLint or Prettier |
| Named exports | Prefer named over `export default` |

### Tech Stack Quick Reference

| Layer | Tech |
|-------|------|
| Build | Vite 8 + TypeScript |
| Framework | React 19 + react-router-dom |
| 3D | React Three Fiber 9 + drei 10 |
| ECS | Koota 0.6 |
| AI | Yuka 0.7 |
| Audio | Tone.js 15 |
| DB | sql.js (WASM) + drizzle-orm |
| Styling | Tailwind CSS 3 + DaisyUI |
| Testing | Vitest 4 |
| Native | Capacitor 8 (web-dir: dist) |

### Common Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Vite dev server (port 5173)
pnpm build            # TypeScript check + production build
pnpm preview          # Preview production build
pnpm test             # Run tests (Vitest)
pnpm test:watch       # Run tests in watch mode
pnpm lint             # Biome lint
pnpm typecheck        # TypeScript check
pnpm db:generate      # Drizzle migrations
```
