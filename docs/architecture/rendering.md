---
title: "Rendering Architecture"
domain: architecture
audience: rendering-agents
reads-before: [../memory-bank/systemPatterns.md]
last-updated: 2026-03-13
status: stable
summary: "R3F scene structure, entity mesh components, camera, terrain, and performance rules"
---

# Rendering Architecture

The 3D scene is rendered with React Three Fiber and drei. All rendering code lives in `src/components/3d/`.

## Scene Structure (`Arena.tsx`)

```
<Canvas> (orthographic camera, 45deg tilt)
  ├── Camera Controller (orthographic diorama, zoom 22-80)
  ├── Lighting (ambient + directional)
  ├── Terrain
  │   ├── Ground plane (200x200, grass material)
  │   ├── Road (TubeGeometry on CatmullRom spline)
  │   └── Scenery (procedural trees + rocks)
  ├── Sanctuary (Holy Grail at road end)
  ├── Entity Meshes
  │   ├── <BuildingMesh /> per Building entity
  │   ├── <UnitMesh /> per Unit entity
  │   ├── <ProjectileMesh /> per Projectile entity
  │   ├── <ParticleMesh /> per Particle entity
  │   ├── <ResourceCartMesh /> per ResourceCart entity
  │   └── <WorldEffectMesh /> per WorldEffect entity
  └── Placement Preview (ghost mesh during drag)
```

## Entity Mesh Components (`Entities/`)

Each entity type has a dedicated mesh component:

| Component | Entity | Model Source |
|-----------|--------|-------------|
| `BuildingMesh.tsx` | Building | GLB from `modelPaths.ts` |
| `UnitMesh.tsx` | Unit | GLB per unit type |
| `ProjectileMesh.tsx` | Projectile | Simple sphere geometry |
| `ParticleMesh.tsx` | Particle | Small sphere, physics-driven |
| `ResourceCartMesh.tsx` | ResourceCart | Conveyor GLB |
| `WorldEffectMesh.tsx` | WorldEffect | Ring/circle geometry |

## Asset Registry (`modelPaths.ts`)

Maps building/unit types to GLB file paths under `public/assets/models/`. All models are preloaded via `useGLTF.preload()` before gameplay begins.

## Performance Rules

1. **Never use `useState` for per-frame data.** Position, rotation, scale must be mutated via `useRef` inside `useFrame`.
2. **Use InstancedMesh** for particles, scenery, and any repeated geometry with >10 instances. Below that threshold, individual meshes are more efficient due to draw-call vs instance-data transfer tradeoff.
3. **Preload all GLBs** before the game screen mounts.
4. **Cap transient effects** -- limit particle count, floating text lifetime.
5. **No DOM overlays** -- all 2D UI uses React Native View/Text/TouchableOpacity.

## Camera

- Orthographic projection (no perspective distortion)
- Fixed tilt angle (~45 degrees) for isometric diorama feel
- Base position: (0, 100, 70) -- approximately 35° elevation angle
- Zoom range: 22 (close) to 80 (far)
- Camera shake driven by `session.cameraShake` (decays exponentially)
- Camera shake: random offset ±5 units, exponential damping 0.9x per frame, lerp smoothing factor 0.1

### Particle & VFX System

Particles are spawned as 0.3-unit cubes with `MeshBasicMaterial` (unlit). Physics:
- Velocity: random ±7.5 units/sec (XZ), 5-20 units/sec upward (Y)
- Gravity: 30 units/s² downward
- Lifetime: ~1 second, scale decays linearly to 0
- Particle counts vary by event (e.g. combat hit ~5, death ~20, boss death ~50)

Floating damage/heal numbers rise at 5 units/sec for 1 second with opacity fade.

## Raycasting

- `projectScreenPointToGround(x, y)` -- converts screen coordinates to ground plane intersection
- `projectWorldPointToScreen(worldPos, viewport)` -- projects 3D position to screen coordinates (for HUD tooltips over buildings)

## Planned Work

- [ ] InstancedMesh for particles (currently individual meshes)
- [ ] LOD system for distant buildings/units
- [ ] Day/night cycle lighting
- [ ] Biome-specific terrain materials
