import {
  buildStructure,
  createRunWorld,
  GameSession,
  gameWorld,
  hydrateRunWorld,
  serializeRunWorld,
  startWave,
  stepRunWorld,
  Unit,
} from '../../engine/GameEngine';

jest.mock('../../engine/SoundManager', () => ({
  soundManager: {
    init: jest.fn(),
    playAmbience: jest.fn(),
    stopAmbience: jest.fn(),
    playMusic: jest.fn(),
    stopMusic: jest.fn(),
    playUiClick: jest.fn(),
    playBuild: jest.fn(),
    playCombat: jest.fn(),
    playGameOver: jest.fn(),
  },
}));

function simulate(seconds: number, dt = 0.05) {
  const steps = Math.ceil(seconds / dt);
  for (let index = 0; index < steps; index += 1) {
    stepRunWorld(dt);
  }
}

describe('GameEngine', () => {
  it('cleans up non-wall allies at the end of a completed wave', () => {
    createRunWorld({ preferredSpeed: 1 });
    const snapshot = serializeRunWorld();
    snapshot.session.phase = 'defend';
    snapshot.waveState.spawnQueue = [];
    snapshot.waveState.spawnTimer = 1;
    snapshot.units.push({
      type: 'militia',
      team: 'ally',
      maxHp: 40,
      hp: 40,
      damage: 10,
      speed: 6,
      range: 2,
      atkSpd: 1,
      reward: 0,
      isRanged: false,
      isHealer: false,
      cooldown: 0,
      timeAlive: 0,
      pathIndex: 20,
      position: { x: 10, y: 0.5, z: 10 },
      facingY: 0,
      poison: 0,
    });
    hydrateRunWorld(snapshot);

    // Simulate until wave completion is detected
    let attempts = 0;
    while (attempts < 100) {
      stepRunWorld(0.05);
      const session = gameWorld.get(GameSession);
      if (session?.wave !== undefined && session.wave > 1 && session?.phase === 'build') {
        break;
      }
      attempts++;
    }

    const session = gameWorld.get(GameSession);
    expect(session?.wave).toBeGreaterThan(1);
    expect(session?.phase).toBe('build');

    const nonWallAllies = Array.from(gameWorld.query(Unit)).filter((entity) => {
      const unit = entity.get(Unit);
      return unit?.team === 'ally' && unit.type !== 'wall';
    });

    expect(nonWallAllies).toHaveLength(0);
  });

  it('serializes and hydrates a run snapshot with structures and unit state intact', () => {
    createRunWorld({ preferredSpeed: 1.5 });
    buildStructure('hut', { x: 25, y: 1.5, z: 25 });
    buildStructure('wall', { x: -20, y: 1.5, z: -40 });
    startWave();

    simulate(4.2);

    const snapshot = serializeRunWorld();
    expect(snapshot.version).toBe(1);
    expect(snapshot.buildings).toHaveLength(1);
    expect(snapshot.units.length).toBeGreaterThanOrEqual(2);

    hydrateRunWorld(snapshot);
    const restored = serializeRunWorld();

    expect(restored.session.runId).toBe(snapshot.session.runId);
    expect(restored.session.gameSpeed).toBe(snapshot.session.gameSpeed);
    expect(restored.buildings).toEqual(snapshot.buildings);
    expect(restored.units).toEqual(snapshot.units);
  });
});
