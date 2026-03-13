---
title: "Technical Architecture (Legacy)"
domain: architecture
audience: all-agents
reads-before: []
last-updated: 2026-03-13
status: legacy
summary: "LEGACY -- Original architecture doc. Superseded by docs/architecture/engine.md, persistence.md, rendering.md"
---

# Grailguard Technical Architecture (Legacy)

> **Note:** This is the original architecture doc kept for reference. The authoritative architecture docs are now in `docs/architecture/`.

Grailguard uses a strict split:

- `expo-sqlite` + `drizzle-orm` for all durable application data
- `koota` ECS for all live run state and simulation
- React Native UI as a projection layer over DB and ECS state
- React Three Fiber for rendering only

There is no Zustand runtime authority, and GOAP/AI behavior is implemented with the `yuka` library within the simulation layer.

## 1. Durable State: SQLite + Drizzle

The database owns all persistent state:

- player profile and treasury
- settings
- unlocks
- doctrines
- codex discoveries
- content version state
- run history
- active run snapshot

Rules:

- UI components must not perform multi-step persistence workflows inline.
- Use DB repo/service functions for purchases, reward banking, run save/load, and settings writes.
- Active run persistence is stored as a versioned JSON snapshot plus summary columns. Do not decompose ECS entities into many SQL tables.

## 2. Runtime State: Koota ECS

The ECS world owns all live run data:

- session state
- wave state
- timers and cooldowns
- buildings and walls
- allied and enemy units
- particles, floating text, world effects
- placement preview and selection state when it affects the scene

Rules:

- React components do not own simulation truth.
- UI triggers engine commands and reads selectors or traits.
- Simulation runs through engine APIs such as run creation, stepping, serialization, hydration, checkpointing, and finalization.

## 3. Rendering Rules

2D UI:

- Use React Native primitives and RN Primitives components.
- No DOM APIs, no CSS/HTML overlays, no browser-only drag/drop behavior.

3D scene:

- Use React Three Fiber and Drei.
- Per-frame updates must happen inside `useFrame` with refs, not React state churn.
- Repeated scenery and dense effects should use instancing where volume justifies it.
- Assets should be preloaded before gameplay begins.

## 4. Performance Rules

- Keep high-frequency world updates inside ECS and `useFrame`.
- Do not mirror unit transforms into React state.
- Cap transient effect counts and provide a reduced-FX path in settings.
- Preserve deterministic save/load behavior so long-run failures are reproducible.

## 5. Run Lifecycle

Fresh run:

- load settings
- create ECS world
- seed session state
- begin build phase

Resume run:

- load active run snapshot from SQLite
- hydrate ECS world
- continue from saved phase/timers/entities

Run end:

- finalize summary from ECS
- bank rewards and record run history through DB repos
- clear active run

## 6. Testing Expectations

The repo must maintain automated checks for:

- multi-wave engine progression
- save/hydrate parity
- reward finalization exactly once
- long-run entity cleanup behavior

No future architecture change should reintroduce hidden state ownership across UI, DB, and simulation.
