/**
 * @module modelPaths
 *
 * Central registry of GLB asset paths for all building and unit types.
 * Paths are resolved via Metro's `require()` so they work with Expo's
 * asset system. All models are eagerly preloaded at module evaluation time
 * using `useGLTF.preload`.
 */
import { useGLTF } from '@react-three/drei';

/**
 * Map from `BuildingType` keys to their resolved GLB asset paths.
 * Some building types share the same underlying model (e.g. `sentry`,
 * `obelisk`, and `catapult` all use `tower.glb`).
 */
export const BUILDING_MODEL_PATHS = {
  wall: require('../../../assets/models/wall.glb'),
  hut: require('../../../assets/models/hut.glb'),
  range: require('../../../assets/models/range.glb'),
  temple: require('../../../assets/models/temple.glb'),
  keep: require('../../../assets/models/keep.glb'),
  sentry: require('../../../assets/models/tower.glb'),
  obelisk: require('../../../assets/models/tower.glb'),
  lumber: require('../../../assets/models/hut.glb'),
  mine_ore: require('../../../assets/models/mine_ore.glb'),
  mine_gem: require('../../../assets/models/mine_gem.glb'),
  track: require('../../../assets/models/conveyor.glb'),
  mint: require('../../../assets/models/keep.glb'),
  catapult: require('../../../assets/models/tower.glb'),
  sorcerer: require('../../../assets/models/keep.glb'),
  vault: require('../../../assets/models/temple.glb'),
} as const;

/** Map from `UnitType` keys to their resolved GLB asset paths. */
export const UNIT_MODEL_PATHS = {
  wall: require('../../../assets/models/wall.glb'),
  militia: require('../../../assets/models/militia.glb'),
  archer: require('../../../assets/models/archer.glb'),
  cleric: require('../../../assets/models/cleric.glb'),
  knight: require('../../../assets/models/knight.glb'),
  goblin: require('../../../assets/models/goblin.glb'),
  orc: require('../../../assets/models/orc.glb'),
  troll: require('../../../assets/models/troll.glb'),
  boss: require('../../../assets/models/boss.glb'),
  flying: require('../../../assets/models/goblin.glb'),
  shieldBearer: require('../../../assets/models/orc.glb'),
  summoner: require('../../../assets/models/troll.glb'),
} as const;

const ALL_MODEL_PATHS = [
  ...new Set([...Object.values(BUILDING_MODEL_PATHS), ...Object.values(UNIT_MODEL_PATHS)]),
  require('../../../assets/models/tree.glb'),
  require('../../../assets/models/rock.glb'),
];

// Only preload in browser environment
if (typeof window !== 'undefined') {
  for (const path of ALL_MODEL_PATHS) {
    useGLTF.preload(path as string);
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
