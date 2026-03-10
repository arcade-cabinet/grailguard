import gameConfig from '../data/gameConfig.json';

export const GRID_SIZE = 22;
export const CELL_SIZE = 2.5;
export const HALF_GRID = (GRID_SIZE * CELL_SIZE) / 2;

export type Faction = 'ally' | 'enemy';
export type UnitType =
  | 'wall'
  | 'militia'
  | 'archer'
  | 'cleric'
  | 'knight'
  | 'goblin'
  | 'orc'
  | 'troll'
  | 'boss'
  | 'turret'
  | 'ballista'
  | 'cannon'
  | 'catapult';
export type BuildingType =
  | 'wall'
  | 'hut'
  | 'range'
  | 'temple'
  | 'keep'
  | 'turret'
  | 'cannon'
  | 'ballista'
  | 'catapult';

// Grid tile IDs
export const TILE = {
  GRASS: 0,
  PATH: 1,
  BUILDING: 2,
  SANCTUARY: 3,
  SPAWN: 4,
  SCENERY: 5,
  BARRICADE: 6,
} as const;

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  id: string;
  type: UnitType;
  team: Faction;
  maxHp: number;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  cooldown: number;
  position: Vector3Data;
  targetId: string | null;
  pathIndex: number;
  isHealer: boolean;
  reward?: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  gridX: number;
  gridZ: number;
  levelSpawn: number;
  levelStats: number;
  timer: number;
}

// Map building costs dynamically from config
export const BUILDING_COST: Record<BuildingType, number> = {
  wall: gameConfig.buildings.wall.cost,
  hut: gameConfig.buildings.hut.cost,
  range: gameConfig.buildings.range.cost,
  temple: gameConfig.buildings.temple.cost,
  keep: gameConfig.buildings.keep.cost,
  turret: gameConfig.buildings.turret.cost,
  ballista: gameConfig.buildings.ballista.cost,
  cannon: gameConfig.buildings.cannon.cost,
  catapult: gameConfig.buildings.catapult.cost,
};

// Map spawn intervals dynamically from config
export const BUILDING_SPAWN_INTERVAL: Record<BuildingType, number> = {
  wall: gameConfig.buildings.wall.spawnInterval,
  hut: gameConfig.buildings.hut.spawnInterval,
  range: gameConfig.buildings.range.spawnInterval,
  temple: gameConfig.buildings.temple.spawnInterval,
  keep: gameConfig.buildings.keep.spawnInterval,
  turret: gameConfig.buildings.turret.spawnInterval,
  ballista: gameConfig.buildings.ballista.spawnInterval,
  cannon: gameConfig.buildings.cannon.spawnInterval,
  catapult: gameConfig.buildings.catapult.spawnInterval,
};

// Unit stats mapped directly from config
export const UNIT_STATS = gameConfig.units as Record<
  UnitType,
  {
    maxHp: number;
    speed: number;
    damage: number;
    attackRange: number;
    attackSpeed: number;
    isHealer: boolean;
    reward?: number;
  }
>;

// Building -> unit type it spawns (if applicable)
export const BUILDING_SPAWNS: Partial<Record<BuildingType, UnitType>> = {
  hut: gameConfig.buildings.hut.spawns as UnitType,
  range: gameConfig.buildings.range.spawns as UnitType,
  temple: gameConfig.buildings.temple.spawns as UnitType,
  keep: gameConfig.buildings.keep.spawns as UnitType,
};

// Enemy wave composition by wave number
export const ENEMY_WAVE_TYPES: UnitType[] = gameConfig.waves.types as UnitType[];

export const HP_SCALE_PER_WAVE = gameConfig.waves.hpScalePerWave;
