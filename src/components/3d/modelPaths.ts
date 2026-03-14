/**
 * @module modelPaths
 *
 * Central registry of GLB asset paths for all building and unit types,
 * plus PBR texture preloads. Paths are URL strings served from the
 * public/ directory via Vite. All models and textures are eagerly
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
  ...new Set([...Object.values(BUILDING_MODEL_PATHS), ...Object.values(UNIT_MODEL_PATHS)]),
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

/** HDRI environment map path. */
export const HDRI_PATH = `${BASE}assets/hdri/alps_field_1k.hdr`;

const PBR_PRELOAD_PATHS = [
  ...Object.values(PBR_TEXTURE_PATHS.grass),
  ...Object.values(PBR_TEXTURE_PATHS.road),
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Color.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_NormalGL.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Roughness.jpg`,
  `${BASE}assets/pbr/ground/Ground003_1K-JPG_Displacement.jpg`,
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
