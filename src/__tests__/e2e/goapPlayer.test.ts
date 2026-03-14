import { GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import {
  createRunWorld,
  getSession,
  queueWorldCommand,
  stepRunWorld,
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

// --- GOALS ---
// A mock entity to own the Think brain
class PlayerGovernor extends GameEntity {
  brain = new Think<PlayerGovernor>(this);
}

class SurviveGoal extends Goal<PlayerGovernor> {
  activate() {
    // Determine if we should skip the build phase
    const session = getSession();
    if (session?.phase === 'build' && session.buildTimeLeft > 5) {
      queueWorldCommand({ type: 'skipBuildPhase' });
    }
  }

  process() {
    return 'completed';
  }
}

class BuildDefensesGoal extends Goal<PlayerGovernor> {
  private buildCount = 0;

  activate() {
    const session = getSession();
    if (!session || session.phase !== 'build') return;

    const positions = [
      { x: 15, z: 15 },
      { x: -15, z: 15 },
      { x: 15, z: -15 },
      { x: -15, z: -15 },
    ];
    const pos = positions[this.buildCount % positions.length];
    this.buildCount++;

    if (session.gold >= 75 && session.wood >= 100) {
      queueWorldCommand({
        type: 'build',
        buildingType: 'sentry',
        position: { x: pos.x, y: 1.5, z: pos.z },
      });
    }

    if (session.gold >= 75 && session.wood < 100) {
      queueWorldCommand({
        type: 'build',
        buildingType: 'lumber',
        position: { x: pos.x, y: 1.5, z: pos.z },
      });
    }
  }
  process() {
    return 'completed';
  }
}

class CastSpellGoal extends Goal<PlayerGovernor> {
  activate() {
    const session = getSession();
    if (
      session?.phase === 'defend' &&
      session.faith >= 25 &&
      (session.spellCooldowns.smite ?? 0) <= 0
    ) {
      queueWorldCommand({ type: 'castSpell', spellId: 'smite' });
    }
  }
  process() {
    return 'completed';
  }
}

// --- EVALUATORS ---

class SurviveEvaluator extends GoalEvaluator<PlayerGovernor> {
  calculateDesirability() {
    const session = getSession();
    return session?.phase === 'build' && session.buildTimeLeft > 5 ? 0.8 : 0;
  }
  setGoal(owner: PlayerGovernor) {
    owner.brain.addSubgoal(new SurviveGoal(owner));
  }
}

class BuildDefensesEvaluator extends GoalEvaluator<PlayerGovernor> {
  calculateDesirability() {
    const session = getSession();
    return session?.phase === 'build' ? 1.0 : 0;
  }
  setGoal(owner: PlayerGovernor) {
    owner.brain.addSubgoal(new BuildDefensesGoal(owner));
  }
}

class CastSpellEvaluator extends GoalEvaluator<PlayerGovernor> {
  calculateDesirability() {
    const session = getSession();
    return session?.phase === 'defend' &&
      session.faith >= 25 &&
      (session.spellCooldowns.smite ?? 0) <= 0
      ? 1.0
      : 0;
  }
  setGoal(owner: PlayerGovernor) {
    owner.brain.addSubgoal(new CastSpellGoal(owner));
  }
}

describe('YUKA Goal-Driven Player Governor E2E', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('autonomously plays the game to at least wave 2 using YUKA Think/Goal', () => {
    createRunWorld({
      preferredSpeed: 1,
      biome: 'kings-road',
      difficulty: 'pilgrim',
      doctrines: [{ nodeId: 'crown_tithe', level: 5 }],
      spells: ['smite'],
    });

    const governor = new PlayerGovernor();
    governor.brain.addEvaluator(new SurviveEvaluator());
    governor.brain.addEvaluator(new BuildDefensesEvaluator());
    governor.brain.addEvaluator(new CastSpellEvaluator());

    let ticks = 0;
    const maxTicks = 1000;
    let maxWaveReached = 1;

    while (ticks < maxTicks) {
      const session = getSession();
      if (!session || session.gameOver) break;

      maxWaveReached = Math.max(maxWaveReached, session.wave);

      if (ticks % 10 === 0) {
        governor.brain.arbitrate();
        governor.brain.execute();
      }

      stepRunWorld(0.1);
      ticks++;
    }

    const finalSession = getSession();
    expect(finalSession).toBeDefined();
    // The player governor should have survived to wave 2
    expect(maxWaveReached).toBeGreaterThanOrEqual(2);
  });
});
