# GrailGuard — Asset Pipeline Plan

> **Last updated**: 2026-03-10

## Problem Statement

The game needs to load `.glb` 3D models at runtime. In a standard web project (Vite, Webpack), files in `public/` are served as static assets. However, **Expo uses Metro**, which does not serve `public/` as a static directory in dev mode. This causes `useGLTF('/assets/models/wall.glb')` to return 404.

## Asset Sources

All assets are CC0-licensed, sourced from the global asset server at `/Volumes/home/assets/3DLowPoly/`:

### Buildings
| Model | Source Path | License |
|---|---|---|
| `wall.glb` | `Environment/Medieval/Castle Kit/wall.glb` | CC0 (Kenney) |
| `hut.glb` | `GameKits/TowerDefense/Tower Defense Kit/tower-square-bottom-b.glb` | CC0 (Kenney) |
| `range.glb` | `GameKits/TowerDefense/Tower Defense Kit/weapon-ballista.glb` | CC0 (Kenney) |
| `sanctuary.glb` | `GameKits/TowerDefense/Tower Defense Kit/tower-round-base.glb` | CC0 (Kenney) |

### Characters
| Model | Source Path | License |
|---|---|---|
| `knight.glb` | `Characters/Animated/Knight Character Animated - Jul 2018/KnightCharacter.glb` | CC0 (Quaternius) |
| `orc.glb` | `Characters/Fantasy/Ultimate Monsters - Oct 2022/Big/Orc.glb` | CC0 (Quaternius) |

## Current Pipeline

```
/Volumes/home/assets/3DLowPoly/  (global asset server)
         │
         ├── cp ──→  src/assets/models/*.glb  (committed to repo)
         │
         └── require() ──→  Metro resolves as asset
                              │
                              └──→  useGLTF(resolvedUri)  (R3F loads the model)
```

### What Works
- ✅ Files are committed at `src/assets/models/` (6 models, ~1.2 MB total)
- ✅ Metro config has `.glb` in `assetExts`
- ✅ `BuildingMesh.tsx` and `UnitMesh.tsx` use `require()` to reference models

### What Doesn't Work Yet
- ❌ `useGLTF(require(...))` — `require()` returns a **number** (Metro asset ID), not a URL string
- ❌ `useGLTF` expects an HTTP-fetchable URL string

## Proposed Solutions

### Option A: `expo-asset` Bridge (Recommended)

Use Expo's `Asset` API to convert the Metro asset ID into a downloadable `localUri`:

```typescript
import { Asset } from 'expo-asset';
import { useGLTF } from '@react-three/drei';
import { useState, useEffect } from 'react';

// Preload and resolve the URI
function useAssetGLTF(moduleId: number) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    const asset = Asset.fromModule(moduleId);
    asset.downloadAsync().then(() => {
      setUri(asset.localUri ?? asset.uri);
    });
  }, [moduleId]);

  return uri ? useGLTF(uri) : null;
}
```

**Pros**: Works on both web and native. Uses Expo's official asset pipeline.
**Cons**: Async loading adds a frame or two of latency; need Suspense boundary.

### Option B: Custom Metro Middleware

Add static file serving middleware to Metro config:

```javascript
// metro.config.js
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url.startsWith('/assets/models/')) {
        // Serve from public/ directory
        const filePath = path.join(__dirname, 'public', req.url);
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'model/gltf-binary');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }
      return middleware(req, res, next);
    };
  },
};
```

**Pros**: Zero changes to component code; `useGLTF('/assets/models/wall.glb')` just works.
**Cons**: Non-standard Metro config; may need maintenance across Expo SDK upgrades.

### Option C: Self-Hosted Asset Server

Run a simple Express server alongside Metro that serves `public/`:

```bash
npx serve public/ --cors -l 3001
```

Then point `useGLTF` to `http://localhost:3001/assets/models/wall.glb`.

**Pros**: Dead simple; separation of concerns.
**Cons**: Extra process to manage; CORS setup; doesn't work in production without CDN.

## Scale Standard (from Project Rules)

Per the user's established project scale standard:
- **1 Unit = 1 Meter** (Havok Physics standard)
- **World Grid Size**: 2.0 Units
- **Environment Assets**: Native Scale (1.0)
- **Character Assets**: 0.5 Scale (corrects ~4m raw height to ~2m heroic scale)

Current scale values in code:
| Model | Scale | Notes |
|---|---|---|
| `wall.glb` | 0.5 | Fits within one grid cell |
| `hut.glb` | 0.4 | Slightly smaller to leave visual padding |
| `range.glb` | 0.4 | Ballista fits naturally |
| `sanctuary.glb` | 0.6 | Larger for visual importance |
| `knight.glb` | 0.4 | Heroic character scale |
| `orc.glb` | 0.45 | Slightly bigger than player units |

These may need adjustment once models actually render and can be visually compared against the grid.

## 2DPhotorealistic Assets (AmbientCG — CC0)

Located at `/Volumes/home/assets/2DPhotorealistic/`. All CC0 licensed.

### HDRIs (Sky & Environment Lighting)

**382 HDRIs** available at `HDRI/1K/`. Each folder contains:
- `*_1K_HDR.exr` — for image-based lighting (IBL) in R3F `<Environment>` component
- `*_1K_TONEMAPPED.jpg` — for skybox background (lighter weight)

| Category | Count | Best For GrailGuard |
| --- | --- | --- |
| DayEnvironmentHDRI | 101 | ✅ Main gameplay sky |
| DaySkyHDRI | 61×2 (A/B) | ✅ Clear sky variants |
| EveningEnvironmentHDRI | 6 | ✅ Dramatic sunset battles |
| EveningSkyHDRI | 41×2 (A/B) | ✅ Golden hour |
| MorningSkyHDRI | 9×2 (A/B) | ✅ Dawn defense waves |
| NightEnvironmentHDRI | 10 | ⭐ Night wave phases |
| NightSkyHDRI | 16 | ⭐ Night wave phases |
| IndoorEnvironmentHDRI | 22 | ❌ Not relevant |

**Recommended picks:**
- `DayEnvironmentHDRI001` — standard outdoor daylight
- `EveningSkyHDRI010A` — golden hour medieval sunset
- `NightSkyHDRI003` — moonlit night for advanced wave phases

### PBR Materials (Terrain & Ground Textures)

Located at `MATERIAL/1K-JPG/<MaterialName>/`. Each folder contains:
`*_Color.jpg`, `*_NormalGL.jpg`, `*_Roughness.jpg`, `*_Metalness.jpg`, `*_Displacement.jpg`

**Use `NormalGL` (OpenGL convention) — this is correct for Three.js / R3F.**

| Material Type | Count | Usage in GrailGuard |
| --- | --- | --- |
| Grass (001–008) | 8 | ✅ Grass terrain tiles |
| Gravel (001–032) | 32 | ✅ Path/road tiles |
| Bricks (001–030+) | 30+ | ✅ Wall building texture |
| Planks (001–020) | 20 | ✅ Hut/Range building texture |
| Ground (various) | many | ✅ Dirt path variants |
| Rock (various) | many | ✅ Mountain/cliff scenery |
| Sand (various) | many | Possible desert variant |

### Terrain Heightmaps

Located at `TERRAIN/Terrain001-005/`. Each has:
- `*_1K.obj`, `*_2K.obj`, `*_4K.obj` — pre-generated terrain meshes
- `*_2K.exr`, `*_4K.exr`, `*_8K.exr` — displacement heightmaps
- `2K-JPG/` subfolder — PBR material set for the terrain

### How to Use in R3F

```typescript
// HDRI sky + lighting
import { Environment } from '@react-three/drei';
<Environment files="/assets/hdri/DayEnvironmentHDRI001_1K_TONEMAPPED.jpg" background />

// PBR terrain material
import { useTexture } from '@react-three/drei';
const [color, normal, roughness] = useTexture([
  '/assets/materials/Grass001_Color.jpg',
  '/assets/materials/Grass001_NormalGL.jpg',
  '/assets/materials/Grass001_Roughness.jpg',
]);
```

## Future Assets to Add

From the global asset server, these additional packs could enhance the game:

| Category | Pack | Potential Use |
|---|---|---|
| Environment | `Castle Kit` (Kenney) | More wall variants, gates, towers |
| Environment | `Retro Medieval Kit` (Kenney) | Fortified walls, fences |
| Characters | `RPG Characters` (Quaternius) | Wizard, Warrior, Ranger, Cleric variants |
| Characters | `KayKit Adventurers` | Alternative hero models |
| Props | `Tower Defense Kit` (Kenney) | Crystals, trees, rocks for environment detail |
| Weapons | `Tower Defense Kit` (Kenney) | Catapult, cannon, turret for Range upgrades |
