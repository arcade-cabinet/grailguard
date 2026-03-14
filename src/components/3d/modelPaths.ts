/**
 * @module modelPaths
 *
 * Central registry of GLB asset paths for all building and unit types,
 * plus PBR texture preloads. Paths are URL strings served from the
 * public/ directory via Vite. All models and textures are eagerly
 * preloaded at module evaluation time.
 */
import { useGLTF, useTexture } from '@react-three/drei';

/**
 * Map from `BuildingType` keys to their resolved GLB asset paths.
 * Some building types share the same underlying model (e.g. `sentry`,
 * `obelisk`, and `catapult` all use `tower.glb`).
 */
export const BUILDING_MODEL_PATHS = {
  wall: '/assets/models/wall.glb',
  hut: '/assets/models/hut.glb',
  range: '/assets/models/range.glb',
  temple: '/assets/models/temple.glb',
  keep: '/assets/models/keep.glb',
  sentry: '/assets/models/tower.glb',
  obelisk: '/assets/models/tower.glb',
  lumber: '/assets/models/hut.glb',
  mine_ore: '/assets/models/mine_ore.glb',
  mine_gem: '/assets/models/mine_gem.glb',
  track: '/assets/models/conveyor.glb',
  mint: '/assets/models/keep.glb',
  catapult: '/assets/models/tower.glb',
  sorcerer: '/assets/models/keep.glb',
  vault: '/assets/models/temple.glb',
} as const;

/** Map from `UnitType` keys to their resolved GLB asset paths. */
export const UNIT_MODEL_PATHS = {
  wall: '/assets/models/wall.glb',
  militia: '/assets/models/militia.glb',
  archer: '/assets/models/archer.glb',
  cleric: '/assets/models/cleric.glb',
  knight: '/assets/models/knight.glb',
  goblin: '/assets/models/goblin.glb',
  orc: '/assets/models/orc.glb',
  troll: '/assets/models/troll.glb',
  boss: '/assets/models/boss.glb',
  flying: '/assets/models/goblin.glb',
  shieldBearer: '/assets/models/orc.glb',
  summoner: '/assets/models/troll.glb',
} as const;

const ALL_MODEL_PATHS = [
  ...new Set([...Object.values(BUILDING_MODEL_PATHS), ...Object.values(UNIT_MODEL_PATHS)]),
  '/assets/models/tree.glb',
  '/assets/models/rock.glb',
];

/** PBR texture paths for terrain, road, and ground materials. */
const PBR_TEXTURE_PATHS = [
  '/assets/pbr/grass/Grass004_1K-JPG_Color.jpg',
  '/assets/pbr/grass/Grass004_1K-JPG_NormalGL.jpg',
  '/assets/pbr/grass/Grass004_1K-JPG_Roughness.jpg',
  '/assets/pbr/grass/Grass004_1K-JPG_AmbientOcclusion.jpg',
  '/assets/pbr/grass/Grass004_1K-JPG_Displacement.jpg',
  '/assets/pbr/road/PavingStones003_1K-JPG_Color.jpg',
  '/assets/pbr/road/PavingStones003_1K-JPG_NormalGL.jpg',
  '/assets/pbr/road/PavingStones003_1K-JPG_Roughness.jpg',
  '/assets/pbr/road/PavingStones003_1K-JPG_Displacement.jpg',
  '/assets/pbr/ground/Ground003_1K-JPG_Color.jpg',
  '/assets/pbr/ground/Ground003_1K-JPG_NormalGL.jpg',
  '/assets/pbr/ground/Ground003_1K-JPG_Roughness.jpg',
  '/assets/pbr/ground/Ground003_1K-JPG_Displacement.jpg',
];

// Only preload in browser environment
if (typeof window !== 'undefined') {
  for (const path of ALL_MODEL_PATHS) {
    useGLTF.preload(path);
  }
  for (const path of PBR_TEXTURE_PATHS) {
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
