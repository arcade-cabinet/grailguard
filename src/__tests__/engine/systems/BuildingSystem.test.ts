import type { Building } from '../../../engine/constants';
import {
  type BuildingSystemEvents,
  stepBuildingSimulation,
} from '../../../engine/systems/BuildingSystem';

describe('BuildingSystem', () => {
  let events: jest.Mocked<BuildingSystemEvents>;

  const createBuilding = (id: string, overrides: Partial<Building>): Building => ({
    id,
    type: 'hut',
    gridX: 5,
    gridZ: 5,
    levelSpawn: 1,
    levelStats: 1,
    timer: 0,
    ...overrides,
  });

  beforeEach(() => {
    events = {
      onSpawnUnit: jest.fn(),
      onUpdateTimer: jest.fn(),
    };
  });

  it('does not spawn units if not in defend phase', () => {
    const buildings = {
      b1: createBuilding('b1', { timer: 0 }),
    };

    stepBuildingSimulation(1.0, { phase: 'build', buildings }, events);

    expect(events.onSpawnUnit).not.toHaveBeenCalled();
    expect(events.onUpdateTimer).not.toHaveBeenCalled();
  });

  it('updates timer if it has not reached 0', () => {
    const buildings = {
      b1: createBuilding('b1', { timer: 2.0 }),
    };

    stepBuildingSimulation(0.5, { phase: 'defend', buildings }, events);

    expect(events.onSpawnUnit).not.toHaveBeenCalled();
    expect(events.onUpdateTimer).toHaveBeenCalledWith('b1', 1.5);
  });

  it('spawns a unit and resets timer when timer reaches 0', () => {
    const buildings = {
      b1: createBuilding('b1', { type: 'hut', timer: 0.1 }),
    };

    stepBuildingSimulation(0.2, { phase: 'defend', buildings }, events);

    expect(events.onSpawnUnit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'militia',
        team: 'ally',
      }),
    );
    // Interval for hut is 3.5
    expect(events.onUpdateTimer).toHaveBeenCalledWith('b1', 3.5);
  });

  it('scales stats based on levelStats', () => {
    const buildings = {
      b1: createBuilding('b1', { type: 'keep', timer: 0.1, levelStats: 3 }), // +40% stats
    };

    stepBuildingSimulation(0.2, { phase: 'defend', buildings }, events);

    // Knight base hp = 150, damage = 25
    expect(events.onSpawnUnit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'knight',
        maxHp: 210, // 150 * 1.4
        damage: 35, // 25 * 1.4
      }),
    );
  });

  it('does not process buildings with no valid spawn type or interval', () => {
    const buildings = {
      b1: createBuilding('b1', { type: 'wall', timer: 0 }),
    };

    stepBuildingSimulation(0.5, { phase: 'defend', buildings }, events);

    expect(events.onSpawnUnit).not.toHaveBeenCalled();
    expect(events.onUpdateTimer).not.toHaveBeenCalled();
  });
});
