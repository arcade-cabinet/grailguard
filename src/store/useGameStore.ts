import { create } from 'zustand';
import { Entity, Building, TILE } from '../engine/constants';
import { generateMap } from '../engine/mapGenerator';

const MAX_SEED = 99999;

function freshMap() {
  return generateMap(Date.now() % MAX_SEED);
}

const initial = freshMap();

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
  /** Low-frequency list – drives which UnitMesh components are mounted.
   *  Only changes on spawn / death, never on position updates. */
  unitIds: string[];
  cameraShake: number;
  divineSmiteCooldown: number;
  /** Short overlay text ("Wave 3 Complete! +20g") – clears itself after 3 s */
  announcement: string;

  // ── Actions ──────────────────────────────────────────────────────────────
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  takeDamage: (amount: number) => void;
  spawnUnit: (unit: Entity) => void;
  removeUnit: (id: string) => void;
  damageUnit: (id: string, amount: number) => void;
  /**
   * THE KEY PERFORMANCE FIX: replaces N individual set() calls per frame
   * with exactly ONE atomic setState for the entire combat simulation tick.
   */
  batchSetUnits: (
    units: Record<string, Entity>,
    unitIds: string[],
    goldDelta: number,
    healthDelta: number,
  ) => void;
  addBuilding: (building: Building) => void;
  removeBuilding: (id: string) => void;
  updateBuildingTimer: (id: string, timer: number) => void;
  setPhase: (phase: 'build' | 'defend') => void;
  setTimeOfDay: (t: number) => void;
  triggerCameraShake: (intensity: number) => void;
  setDivineSmiteCooldown: (cd: number) => void;
  setAnnouncement: (msg: string) => void;
  nextWave: () => void;
  resetGame: () => void;
}

const makeInitial = (map: ReturnType<typeof freshMap>) => ({
  gold: 150,
  health: 20,
  wave: 0,
  phase: 'build' as const,
  gameSpeed: 1,
  timeOfDay: 0.0,
  grid: map.grid,
  pathCoords: map.pathCoords,
  spawnZ: map.spawnZ,
  buildings: {} as Record<string, Building>,
  units: {} as Record<string, Entity>,
  unitIds: [] as string[],
  cameraShake: 0,
  divineSmiteCooldown: 0,
  announcement: '',
});

export const useGameStore = create<GameState>((set, get) => ({
  ...makeInitial(initial),

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

  spendGold: (amount) => {
    const { gold } = get();
    if (gold < amount) return false;
    set((s) => ({ gold: s.gold - amount }));
    return true;
  },

  takeDamage: (amount) =>
    set((s) => ({ health: Math.max(0, s.health - amount) })),

  spawnUnit: (unit) =>
    set((s) => ({
      units: { ...s.units, [unit.id]: unit },
      unitIds: [...s.unitIds, unit.id],
    })),

  removeUnit: (id) =>
    set((s) => {
      const next = { ...s.units };
      delete next[id];
      return { units: next, unitIds: s.unitIds.filter((i) => i !== id) };
    }),

  damageUnit: (id, amount) =>
    set((s) => {
      const unit = s.units[id];
      if (!unit) return {};
      return {
        units: { ...s.units, [id]: { ...unit, hp: Math.max(0, unit.hp - amount) } },
      };
    }),

  batchSetUnits: (units, unitIds, goldDelta, healthDelta) =>
    set((s) => ({
      units,
      unitIds,
      gold: s.gold + goldDelta,
      health: healthDelta !== 0 ? Math.max(0, s.health + healthDelta) : s.health,
    })),

  addBuilding: (building) =>
    set((s) => {
      const newGrid = s.grid.map((row) => [...row]);
      newGrid[building.gridX][building.gridZ] =
        building.type === 'wall' ? TILE.BARRICADE : TILE.BUILDING;
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

  setPhase: (phase) => set({ phase }),
  setTimeOfDay: (t) => set({ timeOfDay: t % 1.0 }),
  triggerCameraShake: (intensity) => set({ cameraShake: intensity }),
  setDivineSmiteCooldown: (cd) => set({ divineSmiteCooldown: cd }),
  setAnnouncement: (msg) => set({ announcement: msg }),

  nextWave: () =>
    set((s) => ({
      wave: s.wave + 1,
      phase: 'defend',
      gold: s.gold + 20,
    })),

  resetGame: () => {
    const map = freshMap();
    set(makeInitial(map));
  },
}));
