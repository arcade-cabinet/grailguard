import { useGLTF } from '@react-three/drei';

export const BUILDING_MODEL_PATHS = {
  wall: require('../../../public/assets/models/wall.glb'),
  hut: require('../../../public/assets/models/hut.glb'),
  range: require('../../../public/assets/models/range.glb'),
  temple: require('../../../public/assets/models/temple.glb'),
  keep: require('../../../public/assets/models/keep.glb'),
  sentry: require('../../../public/assets/models/tower.glb'),
  obelisk: require('../../../public/assets/models/tower.glb'),
  lumber: require('../../../public/assets/models/hut.glb'),
  mine_ore: require('../../../public/assets/models/mine_ore.glb'),
  mine_gem: require('../../../public/assets/models/mine_gem.glb'),
  track: require('../../../public/assets/models/conveyor.glb'),
  mint: require('../../../public/assets/models/keep.glb'),
  catapult: require('../../../public/assets/models/tower.glb'),
  sorcerer: require('../../../public/assets/models/keep.glb'),
  vault: require('../../../public/assets/models/temple.glb'),
} as const;

export const UNIT_MODEL_PATHS = {
  wall: require('../../../public/assets/models/wall.glb'),
  militia: require('../../../public/assets/models/militia.glb'),
  archer: require('../../../public/assets/models/archer.glb'),
  cleric: require('../../../public/assets/models/cleric.glb'),
  knight: require('../../../public/assets/models/knight.glb'),
  goblin: require('../../../public/assets/models/goblin.glb'),
  orc: require('../../../public/assets/models/orc.glb'),
  troll: require('../../../public/assets/models/troll.glb'),
  boss: require('../../../public/assets/models/boss.glb'),
} as const;

const ALL_MODEL_PATHS = [
  ...new Set([...Object.values(BUILDING_MODEL_PATHS), ...Object.values(UNIT_MODEL_PATHS)]),
  require('../../../public/assets/models/tree.glb'),
  require('../../../public/assets/models/rock.glb'),
];

// Only preload in browser environment
if (typeof window !== 'undefined') {
  for (const path of ALL_MODEL_PATHS) {
    useGLTF.preload(path as string);
  }
}

export function getAllModelPaths() {
  return ALL_MODEL_PATHS;
}