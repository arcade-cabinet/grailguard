import { create } from 'zustand';
import { Entity, Building, BuildingType, TILE } from '../engine/constants';
import { generateMap } from '../engine/mapGenerator';

const MAX_SEED = 99999;
const { grid, pathCoords, spawnZ } = generateMap(Date.now() % MAX_SEED);

export interface Projectile {
  id: string;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  targetId: string;
  damage: number;
  progress: number;
}

export interface GameState {
  gold: number;
  health: number;
  wave: number;
  phase: 'build' | 'defend';
  gameSpeed: number;
  timeOfDay: number;
  grid: number[][];
  pathCoords: { x: number; z: number }[];
  spawnZ: number;
  buildings: Record<string, Building>;
  units: Record<string, Entity>;
  projectiles: Projectile[];
  cameraShake: number;
  targetingMode: boolean;
  divineSmiteCooldown: number;

  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  takeDamage: (amount: number) => void;
  spawnUnit: (unit: Entity) => void;
  removeUnit: (id: string) => void;
  damageUnit: (id: string, amount: number) => void;
  healUnit: (id: string, amount: number) => void;
  updateUnitPosition: (id: string, pos: Partial<Entity['position']>) => void;
  updateUnitCooldown: (id: string, cooldown: number) => void;
  updateUnitTarget: (id: string, targetId: string | null) => void;
  addBuilding: (building: Building) => void;
  removeBuilding: (id: string) => void;
  updateBuildingTimer: (id: string, timer: number) => void;
  addProjectile: (p: Projectile) => void;
  removeProjectile: (id: string) => void;
  setPhase: (phase: 'build' | 'defend') => void;
  setTimeOfDay: (t: number) => void;
  triggerCameraShake: (intensity: number) => void;
  decrementCameraShake: () => void;
  setTargetingMode: (v: boolean) => void;
  setDivineSmiteCooldown: (cd: number) => void;
  nextWave: () => void;
  resetGame: () => void;
}

const initialState = {
  gold: 150,
  health: 20,
  wave: 0,
  phase: 'build' as const,
  gameSpeed: 1,
  timeOfDay: 0.0,
  grid,
  pathCoords,
  spawnZ,
  buildings: {} as Record<string, Building>,
  units: {} as Record<string, Entity>,
  projectiles: [] as Projectile[],
  cameraShake: 0,
  targetingMode: false,
  divineSmiteCooldown: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  addGold: (amount) =>
    set((s) => ({ gold: s.gold + amount })),

  spendGold: (amount) => {
    const { gold } = get();
    if (gold < amount) return false;
    set((s) => ({ gold: s.gold - amount }));
    return true;
  },

  takeDamage: (amount) =>
    set((s) => ({ health: Math.max(0, s.health - amount) })),

  spawnUnit: (unit) =>
    set((s) => ({ units: { ...s.units, [unit.id]: unit } })),

  removeUnit: (id) =>
    set((s) => {
      const next = { ...s.units };
      delete next[id];
      return { units: next };
    }),

  damageUnit: (id, amount) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return {
        units: {
          ...s.units,
          [id]: { ...unit, hp: Math.max(0, unit.hp - amount) },
        },
      };
    }),

  healUnit: (id, amount) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return {
        units: {
          ...s.units,
          [id]: { ...unit, hp: Math.min(unit.maxHp, unit.hp + amount) },
        },
      };
    }),

  updateUnitPosition: (id, pos) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return {
        units: {
          ...s.units,
          [id]: { ...unit, position: { ...unit.position, ...pos } },
        },
      };
    }),

  updateUnitCooldown: (id, cooldown) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return { units: { ...s.units, [id]: { ...unit, cooldown } } };
    }),

  updateUnitTarget: (id, targetId) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return { units: { ...s.units, [id]: { ...unit, targetId } } };
    }),

  addBuilding: (building) =>
    set((s) => {
      const newGrid = s.grid.map((row) => [...row]);
      const tileType =
        building.type === 'wall' ? TILE.BARRICADE : TILE.BUILDING;
      newGrid[building.gridX][building.gridZ] = tileType;
      return {
        buildings: { ...s.buildings, [building.id]: building },
        grid: newGrid,
      };
    }),

  removeBuilding: (id) =>
    set((s) => {
      const building = s.buildings[id];
      if (!building) return {};
      const newGrid = s.grid.map((row) => [...row]);
      newGrid[building.gridX][building.gridZ] = TILE.GRASS;
      const next = { ...s.buildings };
      delete next[id];
      return { buildings: next, grid: newGrid };
    }),

  updateBuildingTimer: (id, timer) =>
    set((s) => {
      const b = s.buildings[id];
      if (!b) return {};
      return { buildings: { ...s.buildings, [id]: { ...b, timer } } };
    }),

  addProjectile: (p) =>
    set((s) => ({ projectiles: [...s.projectiles, p] })),

  removeProjectile: (id) =>
    set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== id) })),

  setPhase: (phase) => set({ phase }),

  setTimeOfDay: (t) => set({ timeOfDay: t % 1.0 }),

  triggerCameraShake: (intensity) => set({ cameraShake: intensity }),

  decrementCameraShake: () =>
    set((s) => ({ cameraShake: Math.max(0, s.cameraShake - 0.02) })),

  setTargetingMode: (v) => set({ targetingMode: v }),

  setDivineSmiteCooldown: (cd) => set({ divineSmiteCooldown: cd }),

  nextWave: () =>
    set((s) => ({
      wave: s.wave + 1,
      phase: 'defend',
      gold: s.gold + 20,
    })),

  resetGame: () => {
    const { grid: newGrid, pathCoords: newPath, spawnZ: newSpawnZ } = generateMap(
      Date.now() % MAX_SEED
    );
    set({
      ...initialState,
      grid: newGrid,
      pathCoords: newPath,
      spawnZ: newSpawnZ,
    });
  },
}));
