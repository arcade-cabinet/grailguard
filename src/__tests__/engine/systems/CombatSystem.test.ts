import { yukaEntities, yukaEntityManager } from '../../../engine/ai/EntityManager';
import type { Entity } from '../../../engine/constants';
import {
  type CombatEvents,
  type CombatStateSnapshot,
  stepCombatSimulation,
} from '../../../engine/systems/CombatSystem';

// Mock Yuka dependencies
jest.mock('../../../engine/ai/EntityManager', () => ({
  yukaEntities: new Map(),
  yukaEntityManager: {
    update: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../../engine/ai/EnemyBrain', () => {
  return {
    EnemyVehicle: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn(), x: 0, y: 0, z: 0 },
      setPath: jest.fn(),
    })),
  };
});

describe('CombatSystem', () => {
  let events: jest.Mocked<CombatEvents>;
  let state: CombatStateSnapshot;

  const createEntity = (id: string, overrides: Partial<Entity>): Entity => ({
    id,
    type: 'militia',
    team: 'ally',
    maxHp: 100,
    hp: 100,
    damage: 10,
    speed: 1,
    attackRange: 1,
    attackSpeed: 1,
    cooldown: 0,
    position: { x: 0, y: 0, z: 0 },
    targetId: null,
    pathIndex: 0,
    isHealer: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (yukaEntities.clear as jest.Mock) = jest.fn();
    yukaEntities.clear();

    events = {
      onEnemyKilled: jest.fn(),
      onUnitDamaged: jest.fn(),
      onUnitHealed: jest.fn(),
      onWallDamaged: jest.fn(),
      onBossAoE: jest.fn(),
      onBreach: jest.fn(),
      onRemoveBuilding: jest.fn(),
      onDropPotion: jest.fn(),
      onDropStar: jest.fn(),
    };

    state = {
      units: {},
      buildings: {},
      pathCoords: [],
      grid: Array(22)
        .fill(0)
        .map(() => Array(22).fill(0)),
    };
  });

  it('updates Yuka entity manager', () => {
    stepCombatSimulation(0.1, state, events);
    expect(yukaEntityManager.update).toHaveBeenCalledWith(0.1);
  });

  it('removes units with 0 hp', () => {
    state.units['dead'] = createEntity('dead', { hp: 0, team: 'ally' });

    const result = stepCombatSimulation(0.1, state, events);

    expect(result.newUnits['dead']).toBeUndefined();
    expect(events.onEnemyKilled).not.toHaveBeenCalled();
  });

  it('rewards gold and fires event when enemy is killed', () => {
    state.units['enemy1'] = createEntity('enemy1', { hp: 0, team: 'enemy', reward: 15 });

    const result = stepCombatSimulation(0.1, state, events);

    expect(result.newUnits['enemy1']).toBeUndefined();
    expect(result.goldDelta).toBe(15);
    expect(events.onEnemyKilled).toHaveBeenCalledWith(expect.objectContaining({ id: 'enemy1' }));
  });

  it('removes building when tower unit dies', () => {
    state.units['tower1'] = createEntity('tower1', { hp: 0, team: 'ally', type: 'turret' });

    stepCombatSimulation(0.1, state, events);

    expect(events.onRemoveBuilding).toHaveBeenCalledWith('tower1');
  });

  it('detects if enemies are present', () => {
    state.units['enemy1'] = createEntity('enemy1', { team: 'enemy' });

    const result = stepCombatSimulation(0.1, state, events);

    expect(result.hasEnemies).toBe(true);
  });

  it('damages target in range if cooldown is 0', () => {
    state.units['ally1'] = createEntity('ally1', {
      team: 'ally',
      position: { x: 0, y: 0, z: 0 },
      damage: 10,
      cooldown: 0,
      attackRange: 1.5,
      attackSpeed: 1,
    });
    state.units['enemy1'] = createEntity('enemy1', {
      team: 'enemy',
      position: { x: 1, y: 0, z: 0 },
      hp: 20,
    });

    const result = stepCombatSimulation(0.1, state, events);

    expect(events.onUnitDamaged).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'enemy1' }),
      10,
    );
    expect(result.newUnits['enemy1'].hp).toBe(10);
    // Cooldown should be reset to 1/attackSpeed (1.0) minus delta (0.1) = 0.9. Wait, the code sets it to 1.0, not minus delta on the same tick.
    expect(result.newUnits['ally1'].cooldown).toBe(1.0);
  });

  it('healer heals damaged allies instead of attacking', () => {
    state.units['healer1'] = createEntity('healer1', {
      team: 'ally',
      isHealer: true,
      damage: -15,
      attackRange: 2,
      cooldown: 0,
    });
    state.units['ally1'] = createEntity('ally1', {
      team: 'ally',
      hp: 50,
      maxHp: 100,
      position: { x: 1, y: 0, z: 0 },
    });

    const result = stepCombatSimulation(0.1, state, events);

    expect(events.onUnitHealed).toHaveBeenCalledWith(expect.objectContaining({ id: 'ally1' }), 15);
    expect(result.newUnits['ally1'].hp).toBe(65);
  });
});
