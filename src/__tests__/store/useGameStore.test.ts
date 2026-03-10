import { TILE } from '../../engine/constants';
import { useGameStore } from '../../store/useGameStore';

// Reset store before each test
beforeEach(() => {
  useGameStore.getState().resetGame();
});

describe('useGameStore', () => {
  describe('initial state', () => {
    it('starts with 150 gold', () => {
      expect(useGameStore.getState().gold).toBe(150);
    });

    it('starts with 20 health', () => {
      expect(useGameStore.getState().health).toBe(20);
    });

    it('starts at wave 0', () => {
      expect(useGameStore.getState().wave).toBe(0);
    });

    it('starts in build phase', () => {
      expect(useGameStore.getState().phase).toBe('build');
    });

    it('starts with gameSpeed 1', () => {
      expect(useGameStore.getState().gameSpeed).toBe(1);
    });

    it('has empty units and buildings', () => {
      expect(Object.keys(useGameStore.getState().units)).toHaveLength(0);
      expect(Object.keys(useGameStore.getState().buildings)).toHaveLength(0);
    });

    it('generates a valid grid', () => {
      const { grid } = useGameStore.getState();
      expect(grid.length).toBe(22);
      expect(grid[0].length).toBe(22);
    });

    it('has path coordinates', () => {
      const { pathCoords } = useGameStore.getState();
      expect(pathCoords.length).toBeGreaterThan(0);
    });
  });

  describe('gold management', () => {
    it('addGold increases gold', () => {
      useGameStore.getState().addGold(50);
      expect(useGameStore.getState().gold).toBe(200);
    });

    it('spendGold decreases gold and returns true', () => {
      const result = useGameStore.getState().spendGold(50);
      expect(result).toBe(true);
      expect(useGameStore.getState().gold).toBe(100);
    });

    it('spendGold fails when insufficient gold', () => {
      const result = useGameStore.getState().spendGold(200);
      expect(result).toBe(false);
      expect(useGameStore.getState().gold).toBe(150);
    });

    it('spendGold with exact amount succeeds', () => {
      const result = useGameStore.getState().spendGold(150);
      expect(result).toBe(true);
      expect(useGameStore.getState().gold).toBe(0);
    });
  });

  describe('health / damage', () => {
    it('takeDamage reduces health', () => {
      useGameStore.getState().takeDamage(5);
      expect(useGameStore.getState().health).toBe(15);
    });

    it('health does not go below zero', () => {
      useGameStore.getState().takeDamage(100);
      expect(useGameStore.getState().health).toBe(0);
    });
  });

  describe('unit management', () => {
    const testUnit = {
      id: 'unit-1',
      type: 'militia' as const,
      team: 'ally' as const,
      maxHp: 40,
      hp: 40,
      damage: 10,
      speed: 2.5,
      attackRange: 0.8,
      attackSpeed: 1.0,
      cooldown: 0,
      position: { x: 0, y: 0, z: 0 },
      targetId: null,
      pathIndex: 0,
      isHealer: false,
    };

    it('spawnUnit adds a unit', () => {
      useGameStore.getState().spawnUnit(testUnit);
      expect(useGameStore.getState().units['unit-1']).toBeDefined();
      expect(useGameStore.getState().unitIds).toContain('unit-1');
    });

    it('removeUnit removes a unit', () => {
      useGameStore.getState().spawnUnit(testUnit);
      useGameStore.getState().removeUnit('unit-1');
      expect(useGameStore.getState().units['unit-1']).toBeUndefined();
      expect(useGameStore.getState().unitIds).not.toContain('unit-1');
    });

    it('damageUnit reduces unit hp', () => {
      useGameStore.getState().spawnUnit(testUnit);
      useGameStore.getState().damageUnit('unit-1', 15);
      expect(useGameStore.getState().units['unit-1'].hp).toBe(25);
    });

    it('damageUnit clamps at 0', () => {
      useGameStore.getState().spawnUnit(testUnit);
      useGameStore.getState().damageUnit('unit-1', 999);
      expect(useGameStore.getState().units['unit-1'].hp).toBe(0);
    });

    it('damageUnit on missing unit is a no-op', () => {
      useGameStore.getState().damageUnit('nonexistent', 10);
      // Should not throw
      expect(Object.keys(useGameStore.getState().units)).toHaveLength(0);
    });
  });

  describe('batchSetUnits', () => {
    it('replaces units atomically with gold and health deltas', () => {
      const newUnits = {
        u1: {
          id: 'u1',
          type: 'goblin' as const,
          team: 'enemy' as const,
          maxHp: 30,
          hp: 20,
          damage: 5,
          speed: 3,
          attackRange: 0.8,
          attackSpeed: 0.8,
          cooldown: 0,
          position: { x: 1, y: 0, z: 1 },
          targetId: null,
          pathIndex: 0,
          isHealer: false,
        },
      };
      useGameStore.getState().batchSetUnits(newUnits, ['u1'], 10, -2);
      const state = useGameStore.getState();
      expect(state.units).toEqual(newUnits);
      expect(state.unitIds).toEqual(['u1']);
      expect(state.gold).toBe(160); // 150 + 10
      expect(state.health).toBe(18); // 20 - 2
    });

    it('zero healthDelta does not change health', () => {
      useGameStore.getState().batchSetUnits({}, [], 0, 0);
      expect(useGameStore.getState().health).toBe(20);
    });
  });

  describe('building management', () => {
    const testBuilding = {
      id: 'b-1',
      type: 'hut' as const,
      gridX: 5,
      gridZ: 5,
      levelSpawn: 0,
      levelStats: 0,
      timer: 0,
    };

    it('addBuilding places building and updates grid', () => {
      useGameStore.getState().addBuilding(testBuilding);
      const state = useGameStore.getState();
      expect(state.buildings['b-1']).toBeDefined();
      expect(state.grid[5][5]).toBe(TILE.BUILDING);
    });

    it('addBuilding for wall sets BARRICADE tile', () => {
      const wall = { ...testBuilding, id: 'w-1', type: 'wall' as const, gridX: 6, gridZ: 6 };
      useGameStore.getState().addBuilding(wall);
      expect(useGameStore.getState().grid[6][6]).toBe(TILE.BARRICADE);
    });

    it('removeBuilding restores tile to GRASS', () => {
      useGameStore.getState().addBuilding(testBuilding);
      useGameStore.getState().removeBuilding('b-1');
      const state = useGameStore.getState();
      expect(state.buildings['b-1']).toBeUndefined();
      expect(state.grid[5][5]).toBe(TILE.GRASS);
    });

    it('removeBuilding on missing building is a no-op', () => {
      useGameStore.getState().removeBuilding('nonexistent');
      expect(Object.keys(useGameStore.getState().buildings)).toHaveLength(0);
    });

    it('updateBuildingTimer updates timer value', () => {
      useGameStore.getState().addBuilding(testBuilding);
      useGameStore.getState().updateBuildingTimer('b-1', 2.5);
      expect(useGameStore.getState().buildings['b-1'].timer).toBe(2.5);
    });
  });

  describe('phase / wave', () => {
    it('setPhase changes phase', () => {
      useGameStore.getState().setPhase('defend');
      expect(useGameStore.getState().phase).toBe('defend');
    });

    it('nextWave increments wave, switches to defend, and adds 20 gold', () => {
      const goldBefore = useGameStore.getState().gold;
      useGameStore.getState().nextWave();
      const state = useGameStore.getState();
      expect(state.wave).toBe(1);
      expect(state.phase).toBe('defend');
      expect(state.gold).toBe(goldBefore + 20);
    });

    it('multiple nextWave calls increment properly', () => {
      useGameStore.getState().nextWave();
      useGameStore.getState().nextWave();
      useGameStore.getState().nextWave();
      expect(useGameStore.getState().wave).toBe(3);
    });
  });

  describe('camera / effects', () => {
    it('triggerCameraShake sets cameraShake', () => {
      useGameStore.getState().triggerCameraShake(0.8);
      expect(useGameStore.getState().cameraShake).toBe(0.8);
    });

    it('setDivineSmiteCooldown sets cooldown', () => {
      useGameStore.getState().setDivineSmiteCooldown(15);
      expect(useGameStore.getState().divineSmiteCooldown).toBe(15);
    });

    it('setAnnouncement sets announcement text', () => {
      useGameStore.getState().setAnnouncement('Wave 3!');
      expect(useGameStore.getState().announcement).toBe('Wave 3!');
    });
  });

  describe('resetGame', () => {
    it('resets all state to defaults', () => {
      // Mutate state
      useGameStore.getState().addGold(500);
      useGameStore.getState().takeDamage(10);
      useGameStore.getState().nextWave();
      useGameStore.getState().setAnnouncement('Test');

      // Reset
      useGameStore.getState().resetGame();
      const state = useGameStore.getState();
      expect(state.gold).toBe(150);
      expect(state.health).toBe(20);
      expect(state.wave).toBe(0);
      expect(state.phase).toBe('build');
      expect(state.announcement).toBe('');
    });

    it('generates a new map on reset', () => {
      useGameStore.getState().resetGame();
      // Maps are seeded from Date.now() so they may differ
      // We just verify structure is valid
      const state = useGameStore.getState();
      expect(state.grid.length).toBe(22);
      expect(state.pathCoords.length).toBeGreaterThan(0);
    });
  });
});
