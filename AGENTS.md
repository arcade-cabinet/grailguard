# AGENTS.md — Agent & Asset Documentation

## Repository Purpose

GrailGuard is a medieval tower-defense game in the `arcade-cabinet` monorepo. It is a standalone Expo application that renders 3D gameplay using React Three Fiber on web and react-native-filament on native (planned).

## For AI Agents

If you are an AI coding agent working on this project, read `CLAUDE.md` for detailed instructions on the tech stack, patterns, and rules.

## Asset Pipeline

### Source — 3D Models

All 3D assets are CC0-licensed low-poly models sourced from the global asset server:

```text
/Volumes/home/assets/3DLowPoly/
├── Characters/
│   ├── Animated/         # Quaternius animated characters
│   └── Fantasy/          # Quaternius fantasy creatures
├── Environment/
│   └── Medieval/         # Kenney castle kits, medieval buildings
└── GameKits/
    └── TowerDefense/     # Kenney tower defense kit
```

### Source — PBR Textures & HDRIs

PBR materials, HDRIs, and terrain textures from AmbientCG (CC0):

```text
/Volumes/home/assets/2DPhotorealistic/
├── HDRI/1K/              # 382 environment HDRIs (EXR + tonemapped JPG)
│   ├── DayEnvironmentHDRI*/    # 101 daytime environments
│   ├── EveningSkyHDRI*/        # 41 evening sky pairs (A/B)
│   ├── NightSkyHDRI*/          # 16 night skies
│   └── MorningSkyHDRI*/        # 9 morning sky pairs
├── MATERIAL/1K-JPG/      # PBR material sets (Color, NormalGL, Roughness, Metalness, Displacement)
│   ├── Grass001-008/     # 8 grass variants
│   ├── Gravel001-032/    # 32 gravel/path variants
│   ├── Bricks001-030/    # 30+ brick variants
│   └── Planks001-020/    # 20 wood plank variants
└── TERRAIN/              # 5 terrain heightmaps with OBJ meshes
```

### Current Assets

#### 3D Models (in `public/assets/models/`)

| File | Description | Origin | License |
| --- | --- | --- | --- |
| `wall.glb` | Castle wall segment | Castle Kit (Kenney) | CC0 |
| `hut.glb` | Square tower base | Tower Defense Kit (Kenney) | CC0 |
| `range.glb` | Ballista weapon | Tower Defense Kit (Kenney) | CC0 |
| `sanctuary.glb` | Round tower base | Tower Defense Kit (Kenney) | CC0 |
| `knight.glb` | Animated knight character | Knight Character (Quaternius) | CC0 |
| `orc.glb` | Animated orc monster | Ultimate Monsters (Quaternius) | CC0 |
| `Textures/colormap.png` | Shared Kenney color atlas | Tower Defense Kit (Kenney) | CC0 |

#### PBR Materials (in `public/assets/materials/`)

| Material | Maps | Usage |
| --- | --- | --- |
| `Grass001/` | Color, NormalGL, Roughness | Ground terrain tiles |
| `Gravel017/` | Color, NormalGL, Roughness | Path tiles, scenery objects |
| `Bricks021/` | Color, NormalGL, Roughness | Wall/barricade textures (future) |
| `Planks012/` | Color, NormalGL, Roughness | Wood building textures (future) |

#### HDRI Skyboxes (in `public/assets/hdri/`)

| File | Original | Usage |
| --- | --- | --- |
| `day.jpg` | DayEnvironmentHDRI001 | Default skybox + IBL environment |
| `evening.jpg` | EveningSkyHDRI010A | Sunset/dusk phases (future) |
| `night.jpg` | NightSkyHDRI003 | Night wave phases (future) |

### Adding New Assets

1. Browse the asset server at `/Volumes/home/assets/`
2. Copy the file to `public/assets/models/`, `public/assets/materials/`, or `public/assets/hdri/`
3. Add the URL string to the relevant component's `MODEL_URLS` or `useTexture()` call
4. **Do NOT use `require()`.** Metro middleware serves `public/` as static files via URL
5. Set appropriate scale based on the project scale standard:
   - Environment assets: Native Scale (1.0)
   - Character assets: 0.5 Scale

### Serving Static Assets

Metro does not natively serve a `public/` directory. A custom middleware in `metro.config.js` intercepts `/assets/*` requests and serves files from `public/` with correct MIME types.

### Conversion Pipeline

If source assets are in `.fbx` format, convert using:

```bash
python scripts/bpy/convert_fbx_to_glb.py input.fbx output.glb
```

This preserves vertex colors and applies the correct scale.

## Project Standards

### Scale Standard

- **1 Unit = 1 Meter**
- **Grid Cell Size**: 2.5 units
- **Grid Dimensions**: 22×22 cells
- **Total World Size**: 55×55 units

### Code Quality

- Linter: Biome (run `pnpm lint`)
- Types: Strict TypeScript, no `any`
- State: Zustand with imperative reads in render loops
- AI: Yuka GOAP for strategic decisions, steering behaviors for movement

### Testing

- Unit tests: Jest (`pnpm test`)
- E2E tests: Playwright with headed Chrome + WebGL flags (`pnpm test:e2e`)

### Binary Assets

- **Git LFS** required for `.glb`, `.jpg`, `.png` files in `public/assets/`
- GitHub Actions workflows must include `lfs: true` in checkout steps

## Documentation Map

| Document | Location | Purpose |
| --- | --- | --- |
| README.md | `/` | Quick start & overview |
| CLAUDE.md | `/` | AI agent coding instructions |
| AGENTS.md | `/` | This file — asset & agent docs |
| ARCHITECTURE.md | `/docs/` | System architecture |
| DESIGN.md | `/docs/` | Game design document |
| roadmap.md | `/docs/plans/` | Feature roadmap & phases |
| asset-pipeline.md | `/docs/plans/` | Asset loading strategy |
