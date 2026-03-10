# CLAUDE.md — AI Agent Instructions for GrailGuard

## Project Overview

GrailGuard is a medieval tower-defense game built with Expo (React Native) + React Three Fiber (web) + Yuka AI. The player builds structures to defend a Sanctuary from enemy waves.

## Tech Stack

- **Runtime**: Expo SDK 55 + expo-router
- **3D (Web)**: React Three Fiber 9 + @react-three/drei 10
- **State**: Zustand 4
- **AI**: Yuka 0.7 (GOAP + steering behaviors)
- **Language**: TypeScript 5.9
- **Linting**: Biome (NOT ESLint)
- **Package Manager**: pnpm 10
- **Testing**: Jest (unit), Playwright (E2E)
- **CI/CD**: GitHub Actions → GitHub Pages
- **Binary Assets**: Git LFS for `.glb`, `.jpg`, `.png` in `public/assets/`

## Critical Rules

1. **No `any` casts.** Use strict types. Prefer `unknown` + type guards over `any`.
2. **Data-driven config.** Game constants live in `src/engine/constants.ts`. Never hardcode unit stats or costs in components.
3. **Imperative rendering.** Units update position via `useFrame` + `getState()`, NOT React state. This is intentional for performance.
4. **CC0 assets only.** All `.glb` models must be CC0-licensed. Source from the global asset server at `/Volumes/home/assets/3DLowPoly/`.
5. **Biome, not ESLint.** Run `pnpm lint` to check, `pnpm lint:fix` to auto-fix.
6. **Static assets go in `public/assets/`.** Metro middleware serves this directory. Do NOT use `require()` for `.glb` — use URL strings.
7. **Metro bundler quirks:**
   - `unstable_enablePackageExports` is `false` (forces Zustand CJS resolution)
   - `.glb` is registered in `assetExts`
   - Custom middleware in `metro.config.js` serves `public/` as static files
   - `babel-plugin-transform-import-meta` handles `import.meta` in dependencies

## Directory Structure

```text
grailguard/
├── src/
│   ├── app/              # Expo Router pages (index.tsx, game.tsx)
│   ├── assets/models/    # Source CC0 .glb models (kept as backup)
│   ├── components/3d/    # React Three Fiber components
│   │   └── Entities/     # BuildingMesh.tsx, UnitMesh.tsx
│   ├── engine/           # Game logic (constants, combat, map generation)
│   │   └── ai/           # Yuka AI (EnemyBrain, PlayerGovernorBrain, Goals)
│   ├── store/            # Zustand store (useGameStore.ts)
│   └── utils/            # Shared utilities
├── public/
│   └── assets/
│       ├── models/       # CC0 .glb models served via Metro middleware
│       │   └── Textures/ # Shared texture atlas (colormap.png)
│       ├── materials/    # AmbientCG PBR texture sets (Grass001, Gravel017, etc.)
│       └── hdri/         # AmbientCG HDRI skyboxes (day.jpg, evening.jpg, night.jpg)
├── e2e/                  # Playwright E2E tests
├── docs/                 # Project documentation
│   ├── plans/            # Roadmaps & feature plans
│   ├── ARCHITECTURE.md   # System architecture
│   └── DESIGN.md         # Game design document
├── .github/workflows/    # CI/CD
├── metro.config.js       # Metro config + static file middleware
├── playwright.config.js  # Playwright config
└── package.json
```

## Common Commands

```bash
pnpm start              # Start Expo dev server
pnpm web                # Start web-only dev server
pnpm lint               # Run Biome linter
pnpm typecheck          # Run TypeScript compiler check
pnpm test               # Run Jest unit tests
pnpm test:e2e           # Run Playwright E2E tests
```

## Key Patterns

### Loading 3D Models (via Metro static middleware)

```typescript
import { useGLTF } from '@react-three/drei';

// URL strings — NOT require()! Metro middleware serves public/assets/
const MODEL_URLS: Record<string, string> = {
  wall: '/assets/models/wall.glb',
  hut: '/assets/models/hut.glb',
};

// Preload at module scope
for (const url of Object.values(MODEL_URLS)) {
  useGLTF.preload(url);
}

// Inside component
const { scene } = useGLTF(MODEL_URLS[modelName] ?? MODEL_URLS.wall);
const clone = scene.clone(); // Always clone for multiple instances
```

### Loading PBR Textures

```typescript
import { useTexture } from '@react-three/drei';

const [color, normal, roughness] = useTexture([
  '/assets/materials/Grass001/Color.jpg',
  '/assets/materials/Grass001/NormalGL.jpg',
  '/assets/materials/Grass001/Roughness.jpg',
]);

// Configure tiling
color.wrapS = color.wrapT = THREE.RepeatWrapping;
color.repeat.set(2, 2);
```

### HDRI Skybox + IBL

```typescript
import { useTexture } from '@react-three/drei';

const hdri = useTexture('/assets/hdri/day.jpg');
hdri.mapping = THREE.EquirectangularReflectionMapping;
scene.background = hdri;
scene.environment = hdri; // IBL for all PBR materials
```

### Reading State in useFrame (No Re-renders)

```typescript
useFrame(() => {
  const snap = useGameStore.getState().units[entityId];
  if (!snap) return;
  meshRef.current.position.set(snap.position.x, 0, snap.position.z);
});
```

### Yuka AI Goal Pattern

```typescript
class BuildEvaluator extends GoalEvaluator {
  calculateDesirability(brain) {
    const gold = useGameStore.getState().gold;
    return gold >= cost ? weight : 0;
  }
}
```

## Known Issues

- Metro does not natively serve `public/` — custom middleware in `metro.config.js` handles this.
- `waitForLoadState('networkidle')` in Playwright can timeout if assets 404.
- `useNativeDriver` warnings on web are expected and harmless.
- Git LFS must be set up before pushing binary assets (`.glb`, `.jpg`, `.png`).

## When Adding New Features

1. Define new types/constants in `src/engine/constants.ts`
2. Add state + actions to `src/store/useGameStore.ts`
3. Build 3D components in `src/components/3d/`
4. Add AI logic in `src/engine/ai/`
5. Place static assets in `public/assets/` (models, textures, HDRIs)
6. Write Jest tests in `src/__tests__/`
7. Update E2E tests in `e2e/`
