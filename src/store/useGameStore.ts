import { create } from 'zustand';
import { type Building, type Entity, TILE } from '../engine/constants';
import { findPathAStar, generateMap } from '../engine/mapGenerator';

const MAX_SEED = 99999;

/**
 * Creates a new procedurally generated map using the current time as a seed.
 *
 * @returns A map object generated with a seed derived from the current timestamp modulo MAX_SEED.
 */
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
  autoGovernor: boolean;
  triggerWave: boolean;

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
  upgradeBuilding: (id: string, cost: number) => boolean;
  setPhase: (phase: 'build' | 'defend') => void;
  triggerCameraShake: (intensity: number) => void;
  setDivineSmiteCooldown: (cd: number) => void;
  castHealSpell: () => boolean;
  castFreezeSpell: () => boolean;
  setAnnouncement: (msg: string) => void;
  setAutoGovernor: (active: boolean) => void;
  setTriggerWave: (val: boolean) => void;
  nextWave: () => void;
  resetGame: () => void;
}

const makeInitial = (map: ReturnType<typeof freshMap>) => ({
  gold: 150,
  health: 20,
  wave: 0,
  phase: 'build' as const,
  gameSpeed: 1,
  grid: map.grid,
  pathCoords: map.pathCoords,
  spawnZ: map.spawnZ,
  buildings: {} as Record<string, Building>,
  units: {} as Record<string, Entity>,
  unitIds: [] as string[],
  cameraShake: 0,
  divineSmiteCooldown: 0,
  announcement: '',
  autoGovernor: false,
  triggerWave: false,
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

  takeDamage: (amount) => set((s) => ({ health: Math.max(0, s.health - amount) })),

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
      if (!unit) return s;
      return {
        units: {
          ...s.units,
          [id]: { ...unit, hp: Math.min(unit.maxHp, Math.max(0, unit.hp - amount)) },
        },
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

      const spawnPt = s.pathCoords[0] || { x: 0, z: s.spawnZ };
      const newPath = findPathAStar(newGrid, spawnPt, { x: 10, z: 11 }) || s.pathCoords;

      return {
        buildings: { ...s.buildings, [building.id]: building },
        grid: newGrid,
        pathCoords: newPath,
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

      const spawnPt = s.pathCoords[0] || { x: 0, z: s.spawnZ };
      const newPath = findPathAStar(newGrid, spawnPt, { x: 10, z: 11 }) || s.pathCoords;

      return { buildings: next, grid: newGrid, pathCoords: newPath };
    }),

  updateBuildingTimer: (id, timer) =>
    set((s) => {
      const b = s.buildings[id];
      if (!b) return {};
      return { buildings: { ...s.buildings, [id]: { ...b, timer } } };
    }),

  upgradeBuilding: (id, cost) => {
    const s = get();
    if (s.gold < cost) return false;
    const b = s.buildings[id];
    if (!b) return false;

    set((state) => {
      const newLevel = b.levelStats + 1;

      // Update building
      const nextBuildings = {
        ...state.buildings,
        [id]: { ...b, levelStats: newLevel },
      };

      // If it's a tower, it has an associated unit with the same ID. Upgrade it instantly.
      const nextUnits = { ...state.units };
      const towerUnit = nextUnits[id];
      if (towerUnit) {
        nextUnits[id] = {
          ...towerUnit,
          damage: towerUnit.damage * 1.2,
          maxHp: towerUnit.maxHp * 1.2,
          hp: towerUnit.hp + (towerUnit.maxHp * 1.2 - towerUnit.maxHp), // Heal the new HP amount
        };
      }

      return {
        gold: state.gold - cost,
        buildings: nextBuildings,
        units: nextUnits,
      };
    });
    return true;
  },

  setPhase: (phase) => set({ phase }),
  triggerCameraShake: (intensity) => set({ cameraShake: intensity }),
  setDivineSmiteCooldown: (cd) => set({ divineSmiteCooldown: cd }),

  castHealSpell: () => {
    const s = get();
    if (s.gold < 150) return false;
    set((state) => ({ gold: state.gold - 150, health: Math.min(20, state.health + 10) }));
    return true;
  },

  castFreezeSpell: () => {
    const s = get();
    if (s.gold < 100) return false;
    set((state) => {
      // Freeze all enemies for 5 seconds by setting speed to 0.
      // A proper freeze would need a status effect system. For now, just stall their cooldowns or speed.
      // The easiest way is to modify the active enemies.
      const nextUnits = { ...state.units };
      for (const id in nextUnits) {
        if (nextUnits[id].team === 'enemy') {
          nextUnits[id].cooldown += 5.0; // Stun them for 5 seconds
        }
      }
      return { gold: state.gold - 100, units: nextUnits };
    });
    return true;
  },

  setAnnouncement: (msg) => set({ announcement: msg }),
  setAutoGovernor: (active) => set({ autoGovernor: active }),
  setTriggerWave: (val) => set({ triggerWave: val }),

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
