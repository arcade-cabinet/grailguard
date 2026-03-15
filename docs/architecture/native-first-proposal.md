---
title: "Native-First Architecture Proposal"
domain: architecture
audience: all-agents
reads-before: [../memory-bank/systemPatterns.md, engine.md, rendering.md]
last-updated: 2026-03-14
status: proposal
summary: "Analysis of dropping web support in favor of native-only rendering via Filament or WebGPU"
---

# Native-First Architecture Proposal

## Problem Statement

Web support introduces significant complexity with diminishing returns:

1. **expo-sqlite web requires SharedArrayBuffer** which needs COEP/COOP headers. These can't be set on static hosts (GitHub Pages), requiring a COI service worker hack that only works on second page load.
2. **expo-sqlite web is alpha** — the Expo team explicitly marks it unstable.
3. **Three.js on web runs through WebGL** with React Native Web shims. On native, it runs through expo-gl's deprecated OpenGL ES framework (iOS).
4. **NativeWind web rendering** has different code paths than native, creating divergent bugs.
5. **Metro web bundling** adds complexity (wasm handling, COEP middleware, tslib CJS resolver).

## Proposal: Drop Web, Go Native-Only

Remove web target entirely. Focus on iOS + Android with native GPU rendering.

## Option A: React Native Filament (Recommended)

**What:** Google's Filament engine wrapped for React Native by Margelo.

| Aspect | Current (R3F/Three.js) | Filament |
|--------|----------------------|----------|
| iOS rendering | OpenGL ES (deprecated) | Metal (current) |
| Android rendering | OpenGL ES | Vulkan or OpenGL ES |
| Render thread | JS thread | Separate native thread |
| PBR materials | Partial (Three.js) | Full (physically-based) |
| Shadows | Basic shadow maps | Dynamic cascaded shadows |
| Performance | 30-40 FPS with 50+ entities | 60 FPS target achievable |
| Model format | GLB (Three.js GLTFLoader) | GLB (Filament loader) |
| Production usage | Demo/hobby projects | Million-user apps (Margelo) |

**Migration path:**
1. Replace `@react-three/fiber` + `three` + `@react-three/drei` with `react-native-filament`
2. Rewrite `Arena.tsx` and entity mesh components to use Filament scene graph
3. Keep all engine logic (ECS, systems, configs) — rendering is the only layer that changes
4. GLB models work as-is (Filament loads GLB natively)

**Effort:** High (full rendering layer rewrite) but engine/DB/UI layers untouched.

**Source:** [margelo/react-native-filament](https://github.com/margelo/react-native-filament)

## Option B: React Native WebGPU + Three.js

**What:** Three.js running on React Native WebGPU (Metal/Vulkan), not WebGL.

| Aspect | Current (R3F/expo-gl) | R3F + RN WebGPU |
|--------|----------------------|-----------------|
| iOS rendering | OpenGL ES (deprecated) | Metal via WebGPU |
| Android rendering | OpenGL ES | Vulkan via WebGPU |
| Render thread | JS thread | Reanimated worklet thread |
| Code reuse | — | ~90% of current R3F code |
| Maturity | Stable but deprecated path | Experimental |

**Migration path:**
1. Replace `expo-gl` with `react-native-webgpu`
2. Existing R3F/drei code mostly works unchanged
3. Move render loop to Reanimated worklet thread for 60 FPS

**Effort:** Low-medium (swap GL backend, adapt thread model).

**Source:** Shopify WebGPU research, Three.js RN WebGPU examples.

## Option C: Keep Web, Fix Issues

**What:** Continue supporting web with workarounds.

**Required fixes:**
- COI service worker for production (done)
- Accept expo-sqlite web alpha instability
- Maintain COEP/COOP header configuration
- Test on web separately from native
- Accept WebGL rendering limitations

**Effort:** Low (already mostly working) but ongoing maintenance burden.

## What Dropping Web Removes

| Removed | Impact |
|---------|--------|
| `src/app/+html.tsx` | Web root HTML template |
| `public/coi-serviceworker.js` | SharedArrayBuffer hack |
| Metro COEP/COOP middleware | metro.config.js simplification |
| `app.json` expo-router headers | Plugin config simplification |
| `babel.config.js` unstable_transformImportMeta | Web-only babel flag |
| Playwright E2E tests | Replace with Maestro flows |
| GitHub Pages CD pipeline | Replace with EAS builds |
| `expo export -p web` | No longer needed |

## What Dropping Web Keeps

Everything else — ECS engine, DB layer, all game logic, all configs, HUD, screens, i18n, accessibility, haptics, telemetry. The rendering layer is the only thing that touches the GPU.

## Decision: Option B — React Native WebGPU + Three.js (CHOSEN)

Filament requires a full rendering layer rewrite with a different scene graph API.
WebGPU keeps our existing R3F/Three.js code with ~90% reuse while getting Metal/Vulkan.

### Migration Checklist

1. **Install:** `pnpm add react-native-wgpu` (requires RN 0.81+, we have 0.83)
2. **Remove:** `expo-gl` dependency (deprecated OpenGL ES path)
3. **Metro config:** Add resolver to map `three` → `three/webgpu` build
   ```js
   config.resolver.resolveRequest = (context, moduleName, platform) => {
     if (moduleName === 'three') {
       return context.resolveRequest(context, 'three/webgpu', platform);
     }
     return context.resolveRequest(context, moduleName, platform);
   };
   ```
4. **Patch R3F:** Use `patch-package` to change `@react-three/fiber/package.json` — resolve the WebGPU entry instead of the React Native bundle
5. **Canvas swap:** R3F Canvas gets an async `gl` prop factory that creates `WebGPURenderer`
6. **Expo prebuild:** Required (no Expo Go support) — already required for expo-sqlite
7. **Remove web hacks:** Delete `+html.tsx`, `coi-serviceworker.js`, metro COEP middleware, app.json header plugin
8. **Optional:** Move render loop to Reanimated worklet thread for guaranteed 60fps

### What Changes in Code

| File | Change |
|------|--------|
| `metro.config.js` | Add `three` → `three/webgpu` resolver, remove COEP/COOP middleware |
| `package.json` | Add `react-native-wgpu`, remove `expo-gl` |
| `src/components/3d/Arena.tsx` | Canvas prop change for WebGPU renderer |
| `src/app/+html.tsx` | Delete (web-only) |
| `public/coi-serviceworker.js` | Delete (web-only) |
| `app.json` | Remove expo-router COEP/COOP headers plugin |
| `.github/workflows/cd.yml` | Remove web export, add EAS build instead |

### What Does NOT Change

Everything else: all 9 engine subsystem modules, all 21 JSON configs, all DB repos, all screens, HUD, i18n, accessibility, haptics, telemetry, tutorial, tests. The rendering components (entity meshes, particle pool, terrain grid, sanctuary, etc.) keep their R3F/drei APIs — Three.js's WebGPU renderer is API-compatible with the WebGL renderer.

### Production Validation

- Three.js r171+ (Sept 2025): WebGPU production-ready with zero-config imports
- React Native WebGPU shipped at Expo 2025 Osaka (million-particle installation)
- Margelo uses it in production apps with millions of users

## Sources

- [react-native-filament (GitHub)](https://github.com/margelo/react-native-filament)
- [React Native Filament Documentation](https://margelo.github.io/react-native-filament/)
- [expo-sqlite Web Setup (Expo Docs)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [Best SQLite Solutions for React Native 2026](https://vibe.forem.com/eira-wexford/best-sqlite-solutions-for-react-native-app-development-in-2026-3b5l)
