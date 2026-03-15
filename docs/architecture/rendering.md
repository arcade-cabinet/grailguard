---
title: "Rendering Architecture"
domain: architecture
audience: rendering-agents
reads-before: [../memory-bank/systemPatterns.md]
last-updated: 2026-03-14
status: stable
summary: "R3F scene structure, entity mesh components, camera, terrain, and performance rules"
---

# Rendering Architecture

The 3D scene is rendered with React Three Fiber and drei on web (Vite build). All rendering code lives in `src/components/3d/`.

## Scene Structure (`Arena.tsx`)

```
<Canvas> (orthographic camera, 45deg tilt)
  ├── CameraController (orthographic diorama, zoom 22-80)
  ├── DayNightCycle (dynamic lighting)
  ├── Environment (HDRI sky via drei <Environment>)
  ├── Fog (green-tinted depth fog, near 60, far 200)
  ├── Terrain
  │   ├── TerrainGrid (InstancedMesh tiled terrain)
  │   ├── Road (TubeGeometry on CatmullRom spline)
  │   └── Scenery (procedural InstancedMesh trees + rocks)
  ├── Sanctuary (Holy Grail at road end)
  ├── Entity Meshes
  │   ├── <BuildingMesh /> per Building entity
  │   ├── <UnitMesh /> per Unit entity
  │   ├── <ProjectileMesh /> per Projectile entity
  │   ├── <ResourceCartMesh /> per ResourceCart entity
  │   └── <WorldEffectMesh /> per WorldEffect entity
  ├── ParticlePool (InstancedMesh particle system)
  ├── GestureOverlay (touch pan/pinch zoom)
  └── Placement Preview (ghost mesh during drag)
```

## Entity Mesh Components (`Entities/`)

Each entity type has a dedicated mesh component:

| Component | Entity | Model Source |
|-----------|--------|-------------|
| `BuildingMesh.tsx` | Building | GLB from `modelPaths.ts` |
| `UnitMesh.tsx` | Unit | GLB per unit type |
| `ProjectileMesh.tsx` | Projectile | Simple sphere geometry |
| `ResourceCartMesh.tsx` | ResourceCart | Conveyor GLB |
| `WorldEffectMesh.tsx` | WorldEffect | Ring/circle geometry |

## Terrain & Environment

- **TerrainGrid** (`TerrainGrid.tsx`) -- InstancedMesh-based terrain tiles, rendering the entire terrain in a single draw call with per-tile color variation
- **PBR materials** -- Tiled grass textures with physically-based rendering via drei `useTexture`
- **HDRI sky** -- drei `<Environment>` component for environment mapping and sky rendering
- **Depth fog** -- Green-tinted fog (`#5a7247`, near 60, far 200) to fade distant terrain
- **Day/night cycle** (`DayNightCycle.tsx`) -- Dynamic lighting transitions

## Particle & VFX System

**ParticlePool** (`ParticlePool.tsx`) uses pre-allocated InstancedMesh slots for particle rendering:
- Avoids GC pressure during combat by reusing particle slots
- Velocity: random spread (XZ), upward (Y)
- Gravity: downward deceleration
- Lifetime: ~1 second, scale decays linearly to 0
- Particle counts vary by event (combat hit ~5, death ~20, boss death ~50)

Floating damage/heal numbers rise at 5 units/sec for 1 second with opacity fade.

## Asset Registry (`modelPaths.ts`)

Maps building/unit types to GLB file paths under `assets/models/`. All models are preloaded via `useGLTF.preload()` before gameplay begins.

## Performance Rules

1. **Never use `useState` for per-frame data.** Position, rotation, scale must be mutated via `useRef` inside `useFrame`.
2. **Use InstancedMesh** for particles (ParticlePool), scenery (TerrainGrid), and any repeated geometry with >10 instances.
3. **Preload all GLBs** before the game screen mounts.
4. **Cap transient effects** -- limit particle count, floating text lifetime.

## Camera

- Orthographic projection (no perspective distortion)
- Fixed tilt angle (~45 degrees) for isometric diorama feel
- Base position: (0, 100, 70) -- approximately 35 degree elevation angle
- Zoom range: 22 (close) to 80 (far)
- Camera shake driven by `session.cameraShake` (decays exponentially)
- Camera shake: random offset, exponential damping 0.9x per frame, lerp smoothing factor 0.1
- Touch gesture support: pan and pinch zoom via `GestureOverlay.tsx`

### Sanctuary Model

`Sanctuary.tsx` renders an elaborate sanctuary structure:
- 4 corner towers with conical roofs
- Rotating grail at center (continuous Y rotation)
- Corner torches with flickering point lights
- Health-based visual degradation (color shifts as HP decreases)

### Viewport Presets

Viewport presets (configured in `src/data/viewportPresets.json`) define named camera configurations:
- **Overview:** Wide zoom for build phase (full map visible)
- **Action:** Tighter zoom during defend phase (focused on combat)
- **Cinematic:** Smooth transitions for boss spawn events

## Raycasting

- `projectScreenPointToGround(x, y)` -- converts screen coordinates to ground plane intersection
- `projectWorldPointToScreen(worldPos, viewport)` -- projects 3D position to screen coordinates (for HUD tooltips over buildings)

## Planned Work

- [ ] LOD system for distant buildings/units
- [ ] Additional biome-specific terrain materials
- [ ] Particle bounce physics (y-bounce with dampening)
