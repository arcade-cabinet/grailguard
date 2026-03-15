/**
 * @module modelPaths
 *
 * Central registry of GLB asset paths for all building and unit types,
 * tower detail models, environment scatter models, castle structures,
 * plus PBR texture and HDRI preloads. Paths are URL strings served from
 * the public/ directory via Vite. All models and textures are eagerly
 * preloaded at module evaluation time.
 *
 * All paths are prefixed with `import.meta.env.BASE_URL` so they resolve
 * correctly when the app is deployed under a sub-path (e.g. GitHub Pages
 * at `/grailguard/`).
 */
import { useGLTF, useTexture } from '@react-three/drei';

/** Vite base URL -- includes trailing slash (e.g. "/" or "/grailguard/"). */
const BASE = import.meta.env.BASE_URL;

/**
 * Map from `BuildingType` keys to their resolved GLB asset paths.
 * Some building types share the same underlying model (e.g. `sentry`,
 * `obelisk`, and `catapult` all use `tower.glb`).
 */
export const BUILDING_MODEL_PATHS = {
  wall: `${BASE}assets/models/wall.glb`,
  hut: `${BASE}assets/models/hut.glb`,
  range: `${BASE}assets/models/range.glb`,
  temple: `${BASE}assets/models/temple.glb`,
  keep: `${BASE}assets/models/keep.glb`,
  sentry: `${BASE}assets/models/tower.glb`,
  obelisk: `${BASE}assets/models/tower.glb`,
  lumber: `${BASE}assets/models/hut.glb`,
  mine_ore: `${BASE}assets/models/mine_ore.glb`,
  mine_gem: `${BASE}assets/models/mine_gem.glb`,
  track: `${BASE}assets/models/conveyor.glb`,
  mint: `${BASE}assets/models/keep.glb`,
  catapult: `${BASE}assets/models/tower.glb`,
  sorcerer: `${BASE}assets/models/keep.glb`,
  vault: `${BASE}assets/models/temple.glb`,
} as const;

/**
 * Map from turret/tower `BuildingType` keys to unique KayKit TD tower GLBs.
 * Each building type that renders a tower now has a visually distinct model
 * instead of sharing the same generic `tower.glb`.
 */
export const TOWER_DETAIL_PATHS: Record<string, string> = {
  hut: `${BASE}assets/models/towers/tower-square-build-a.glb`,
  range: `${BASE}assets/models/towers/tower-square-build-c.glb`,
  sentry: `${BASE}assets/models/towers/tower-round-build-a.glb`,
  obelisk: `${BASE}assets/models/towers/tower-round-crystals.glb`,
  catapult: `${BASE}assets/models/towers/tower-square-build-e.glb`,
  sorcerer: `${BASE}assets/models/towers/tower-round-build-d.glb`,
} as const;

/**
 * Environment scatter detail models from the KayKit TD Kit.
 * Provides varied trees, rocks, crystals, and dirt patches for
 * richer terrain scatter than the original single tree/boulder.
 */
export const DETAIL_MODEL_PATHS = {
  treeSmall: `${BASE}assets/models/details/detail-tree.glb`,
  treeLarge: `${BASE}assets/models/details/detail-tree-large.glb`,
  rocksSmall: `${BASE}assets/models/details/detail-rocks.glb`,
  rocksLarge: `${BASE}assets/models/details/detail-rocks-large.glb`,
  crystalSmall: `${BASE}assets/models/details/detail-crystal.glb`,
  crystalLarge: `${BASE}assets/models/details/detail-crystal-large.glb`,
  dirtSmall: `${BASE}assets/models/details/detail-dirt.glb`,
  dirtLarge: `${BASE}assets/models/details/detail-dirt-large.glb`,
} as const;

/**
 * Castle Kit models for sanctuary area, walls, gates, and decorative props.
 */
export const CASTLE_MODEL_PATHS = {
  wallCorner: `${BASE}assets/models/castle/wall-corner.glb`,
  wallDoorway: `${BASE}assets/models/castle/wall-doorway.glb`,
  gate: `${BASE}assets/models/castle/gate.glb`,
  flagPennant: `${BASE}assets/models/castle/flag-pennant.glb`,
  flagBannerLong: `${BASE}assets/models/castle/flag-banner-long.glb`,
  towerBase: `${BASE}assets/models/castle/tower-base.glb`,
  rocksLarge: `${BASE}assets/models/castle/rocks-large.glb`,
  siegeBallista: `${BASE}assets/models/castle/siege-ballista.glb`,
} as const;

/**
 * Road tile models from the KayKit TD Kit for potential road rendering.
 */
export const TILE_MODEL_PATHS = {
  straight: `${BASE}assets/models/tiles/tile-straight.glb`,
  corner: `${BASE}assets/models/tiles/tile-corner.glb`,
} as const;

/** Map from `UnitType` keys to their resolved GLB asset paths. */
export const UNIT_MODEL_PATHS = {
  wall: `${BASE}assets/models/wall.glb`,
  militia: `${BASE}assets/models/militia.glb`,
  archer: `${BASE}assets/models/archer.glb`,
  cleric: `${BASE}assets/models/cleric.glb`,
  knight: `${BASE}assets/models/knight.glb`,
  goblin: `${BASE}assets/models/goblin.glb`,
  orc: `${BASE}assets/models/orc.glb`,
  troll: `${BASE}assets/models/troll.glb`,
  boss: `${BASE}assets/models/boss.glb`,
  flying: `${BASE}assets/models/goblin.glb`,
  shieldBearer: `${BASE}assets/models/orc.glb`,
  summoner: `${BASE}assets/models/troll.glb`,
} as const;

const ALL_MODEL_PATHS = [
  ...new Set([
    ...Object.values(BUILDING_MODEL_PATHS),
    ...Object.values(TOWER_DETAIL_PATHS),
    ...Object.values(DETAIL_MODEL_PATHS),
    ...Object.values(CASTLE_MODEL_PATHS),
    ...Object.values(TILE_MODEL_PATHS),
    ...Object.values(UNIT_MODEL_PATHS),
  ]),
  `${BASE}assets/models/tree.glb`,
  `${BASE}assets/models/rock.glb`,
  `${BASE}assets/models/boulder.glb`,
];

/** PBR texture paths for terrain, road, and ground materials. */
export const PBR_TEXTURE_PATHS = {
  grass: {
    map: `${BASE}assets/pbr/grass/Grass004_1K-JPG_Color.jpg`,
    normalMap: `${BASE}assets/pbr/grass/Grass004_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${BASE}assets/pbr/grass/Grass004_1K-JPG_Roughness.jpg`,
    aoMap: `${BASE}assets/pbr/grass/Grass004_1K-JPG_AmbientOcclusion.jpg`,
    displacementMap: `${BASE}assets/pbr/grass/Grass004_1K-JPG_Displacement.jpg`,
  },
  road: {
    map: `${BASE}assets/pbr/road/PavingStones003_1K-JPG_Color.jpg`,
    normalMap: `${BASE}assets/pbr/road/PavingStones003_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${BASE}assets/pbr/road/PavingStones003_1K-JPG_Roughness.jpg`,
    displacementMap: `${BASE}assets/pbr/road/PavingStones003_1K-JPG_Displacement.jpg`,
  },
} as const;

/**
 * Per-biome PBR terrain texture paths. Each biome can override the default
 * grass terrain with biome-specific ground textures.
 */
export const BIOME_TERRAIN_PATHS = {
  'kings-road': PBR_TEXTURE_PATHS.grass,
  'desert-wastes': {
    map: `${BASE}assets/pbr/desert/Ground005_1K-JPG_Color.jpg`,
    normalMap: `${BASE}assets/pbr/desert/Ground005_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${BASE}assets/pbr/desert/Ground005_1K-JPG_Roughness.jpg`,
    aoMap: `${BASE}assets/pbr/desert/Ground005_1K-JPG_AmbientOcclusion.jpg`,
    displacementMap: `${BASE}assets/pbr/desert/Ground005_1K-JPG_Displacement.jpg`,
  },
  'frost-peaks': {
    map: `${BASE}assets/pbr/snow/Snow003_1K-JPG_Color.jpg`,
    normalMap: `${BASE}assets/pbr/snow/Snow003_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${BASE}assets/pbr/snow/Snow003_1K-JPG_Roughness.jpg`,
    displacementMap: `${BASE}assets/pbr/snow/Snow003_1K-JPG_Displacement.jpg`,
  },
  'shadow-marsh': {
    map: `${BASE}assets/pbr/grass_dark/Grass006_1K-JPG_Color.jpg`,
    normalMap: `${BASE}assets/pbr/grass_dark/Grass006_1K-JPG_NormalGL.jpg`,
    roughnessMap: `${BASE}assets/pbr/grass_dark/Grass006_1K-JPG_Roughness.jpg`,
    aoMap: `${BASE}assets/pbr/grass_dark/Grass006_1K-JPG_AmbientOcclusion.jpg`,
    displacementMap: `${BASE}assets/pbr/grass_dark/Grass006_1K-JPG_Displacement.jpg`,
  },
} as const;

/**
 * Per-biome HDRI environment map paths. Each biome uses a distinct sky.
 */
export const BIOME_HDRI_PATHS: Record<string, string> = {
  'kings-road': `${BASE}assets/hdri/alps_field_1k.hdr`,
  'desert-wastes': `${BASE}assets/hdri/alps_field_1k.hdr`,
  'frost-peaks': `${BASE}assets/hdri/alps_field_1k.hdr`,
  'shadow-marsh': `${BASE}assets/hdri/night_environment_1k.exr`,
} as const;

/** Default HDRI environment map path. */
export const HDRI_PATH = `${BASE}assets/hdri/alps_field_1k.hdr`;

const PBR_PRELOAD_PATHS = [
  ...Object.values(PBR_TEXTURE_PATHS.grass),
  ...Object.values(PBR_TEXTURE_PATHS.road),
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Color.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_NormalGL.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Roughness.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Displacement.jpg`,
  // Biome terrain textures
  ...Object.values(BIOME_TERRAIN_PATHS['desert-wastes']),
  ...Object.values(BIOME_TERRAIN_PATHS['frost-peaks']),
  ...Object.values(BIOME_TERRAIN_PATHS['shadow-marsh']),
];

// Only preload in browser environment
if (typeof window !== 'undefined') {
  for (const path of ALL_MODEL_PATHS) {
    useGLTF.preload(path);
  }
  for (const path of PBR_PRELOAD_PATHS) {
    useTexture.preload(path);
  }
}

/**
 * Returns the full list of deduplicated model asset paths. Useful for
 * triggering preloads inside a React component tree (e.g. inside a
 * `useEffect`). The actual `useGLTF.preload` calls happen at module
 * evaluation time above, so calling this function is largely a no-op
 * that surfaces the path list to callers.
 */
export function getAllModelPaths() {
  return ALL_MODEL_PATHS;
}
