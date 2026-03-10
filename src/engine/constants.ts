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
  | 'boss';
export type BuildingType = 'wall' | 'hut' | 'range' | 'temple' | 'keep';

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

// Building costs
export const BUILDING_COST: Record<BuildingType, number> = {
  wall: 25,
  hut: 50,
  range: 100,
  temple: 150,
  keep: 200,
};

// Spawn interval (seconds)
export const BUILDING_SPAWN_INTERVAL: Record<BuildingType, number> = {
  wall: 0,
  hut: 3.5,
  range: 4.5,
  temple: 6.0,
  keep: 8.0,
};

// Unit stats: [maxHp, speed, damage, attackRange, attackSpeed]
export const UNIT_STATS: Record<
  UnitType,
  { maxHp: number; speed: number; damage: number; attackRange: number; attackSpeed: number; isHealer: boolean; reward?: number }
> = {
  wall:    { maxHp: 600,  speed: 0.0, damage: 0,   attackRange: 0.0, attackSpeed: 99.0, isHealer: false },
  militia: { maxHp: 40,   speed: 2.5, damage: 10,  attackRange: 0.8, attackSpeed: 1.0,  isHealer: false },
  archer:  { maxHp: 20,   speed: 2.0, damage: 15,  attackRange: 5.5, attackSpeed: 1.5,  isHealer: false },
  cleric:  { maxHp: 30,   speed: 1.8, damage: -15, attackRange: 4.0, attackSpeed: 2.0,  isHealer: true  },
  knight:  { maxHp: 150,  speed: 1.5, damage: 25,  attackRange: 1.0, attackSpeed: 1.5,  isHealer: false },
  goblin:  { maxHp: 30,   speed: 3.0, damage: 5,   attackRange: 0.8, attackSpeed: 0.8,  isHealer: false, reward: 5  },
  orc:     { maxHp: 80,   speed: 1.8, damage: 15,  attackRange: 1.0, attackSpeed: 1.5,  isHealer: false, reward: 12 },
  troll:   { maxHp: 250,  speed: 1.2, damage: 30,  attackRange: 1.5, attackSpeed: 2.0,  isHealer: false, reward: 25 },
  boss:    { maxHp: 1200, speed: 0.8, damage: 50,  attackRange: 2.0, attackSpeed: 3.0,  isHealer: false, reward: 150 },
};

// Building -> unit type it spawns
export const BUILDING_SPAWNS: Partial<Record<BuildingType, UnitType>> = {
  hut: 'militia',
  range: 'archer',
  temple: 'cleric',
  keep: 'knight',
};

// Enemy wave composition by wave number
export const ENEMY_WAVE_TYPES: UnitType[] = ['goblin', 'orc', 'troll'];

export const HP_SCALE_PER_WAVE = 0.15;
