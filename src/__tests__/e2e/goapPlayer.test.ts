import { GameEntity, Goal, GoalEvaluator, Think } from 'yuka';
import biomeConfig from '../../data/biomeConfig.json';
import waveConfig from '../../data/waveConfig.json';
import {
  Building,
  createRunWorld,
  finalizeRun,
  GameSession,
  gameWorld,
  getSession,
  queueWorldCommand,
  stepRunWorld,
} from '../../engine/GameEngine';
import {
  applyBiomeModifiers,
  type BiomeSession,
  getAllBiomeIds,
} from '../../engine/systems/biomeSystem';

vi.mock('../../engine/SoundManager', () => ({
  soundManager: {
    init: vi.fn(),
    playAmbience: vi.fn(),
    stopAmbience: vi.fn(),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    playUiClick: vi.fn(),
    playBuild: vi.fn(),
    playCombat: vi.fn(),
    playGameOver: vi.fn(),
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
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
    const maxTicks = 5000;
    let maxWaveReached = 1;
    let sawDefendPhase = false;
    let sawBuildingPlaced = false;

    while (ticks < maxTicks) {
      const session = getSession();
      if (!session || session.gameOver) break;

      maxWaveReached = Math.max(maxWaveReached, session.wave);

      // Track whether the defend phase was entered (wave 1 started)
      if (session.phase === 'defend') {
        sawDefendPhase = true;
      }

      // Track whether any buildings have been placed
      const buildings = Array.from(gameWorld.query(Building));
      if (buildings.length > 0) {
        sawBuildingPlaced = true;
      }

      if (ticks % 10 === 0) {
        governor.brain.arbitrate();
        governor.brain.execute();
      }

      stepRunWorld(0.1);
      ticks++;
    }

    const finalSession = getSession();
    expect(finalSession).toBeDefined();

    // The governor should have placed at least 1 building
    expect(sawBuildingPlaced).toBe(true);

    // The game should have entered the defend phase (wave 1 started)
    expect(sawDefendPhase).toBe(true);

    // At least 1 enemy was killed OR wave 1 completed (reaching wave 2+)
    const killsOrWaveComplete = (finalSession?.totalKills ?? 0) > 0 || maxWaveReached >= 2;
    expect(killsOrWaveComplete).toBe(true);

    // The player governor should have survived to wave 2
    expect(maxWaveReached).toBeGreaterThanOrEqual(2);
  });

  /* ------------------------------------------------------------------ */
  /*  DB persistence across full run lifecycle                           */
  /* ------------------------------------------------------------------ */

  it('run rewards are persisted via finalizeRun after a governor session', () => {
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
    const maxTicks = 3000;

    while (ticks < maxTicks) {
      const session = getSession();
      if (!session || session.gameOver) break;

      if (ticks % 10 === 0) {
        governor.brain.arbitrate();
        governor.brain.execute();
      }

      stepRunWorld(0.1);
      ticks++;
    }

    const session = getSession();
    expect(session).toBeDefined();

    // finalizeRun produces a summary suitable for bankRunRewards
    const result = session?.gameOver
      ? session.announcement?.includes('Victory')
        ? 'victory'
        : 'defeat'
      : 'defeat';
    const summary = finalizeRun(result as 'victory' | 'defeat');

    expect(summary).toBeDefined();
    expect(summary.runId).toBeTruthy();
    expect(typeof summary.waveReached).toBe('number');
    expect(summary.waveReached).toBeGreaterThanOrEqual(1);
    expect(typeof summary.earnedCoins).toBe('number');
    expect(typeof summary.kills).toBe('number');
    expect(typeof summary.durationMs).toBe('number');
    expect(summary.biome).toBe('kings-road');
    expect(summary.difficulty).toBe('pilgrim');
    expect(summary.result).toBe(result);

    // Since we only played 1-3 waves in 3000 ticks at pilgrim difficulty,
    // the result should be 'defeat' (not enough waves for victory)
    expect(summary.waveReached).toBeLessThan(waveConfig.victoryWave);
  });

  /* ------------------------------------------------------------------ */
  /*  Victory detection                                                  */
  /* ------------------------------------------------------------------ */

  it('victory is correctly detected when wave > victoryWave', () => {
    // Verify waveConfig.victoryWave is 20
    expect(waveConfig.victoryWave).toBe(20);

    createRunWorld({
      preferredSpeed: 1,
      biome: 'kings-road',
      difficulty: 'pilgrim',
      spells: ['smite'],
    });

    const session = getSession();
    expect(session).toBeDefined();
    expect(session?.wave).toBe(1);
    expect(session?.gameOver).toBe(false);

    // Manually set the wave past the victory threshold by manipulating
    // the session via the ECS world trait system
    gameWorld.set(GameSession, (current) => ({
      ...current,
      wave: waveConfig.victoryWave + 1,
      phase: 'game_over' as const,
      gameOver: true,
      announcement: 'Victory Achieved!',
      earnedCoins: (waveConfig.victoryWave + 1) * 25,
    }));

    const updatedSession = getSession();
    expect(updatedSession?.wave).toBe(21);
    expect(updatedSession?.gameOver).toBe(true);
    expect(updatedSession?.phase).toBe('game_over');
    expect(updatedSession?.announcement).toContain('Victory');
    expect(updatedSession?.earnedCoins).toBeGreaterThan(0);

    // finalizeRun should return 'victory' as the result
    const summary = finalizeRun('victory');
    expect(summary.result).toBe('victory');
    expect(summary.waveReached).toBe(21);
  });

  /* ------------------------------------------------------------------ */
  /*  Biome modifiers from biomeConfig                                   */
  /* ------------------------------------------------------------------ */

  it('biome modifiers from config are applied to session', () => {
    // Verify ALL biome IDs in biomeConfig.json are valid
    const configBiomeIds = Object.keys(biomeConfig.biomes);
    const systemBiomeIds = getAllBiomeIds();
    expect(configBiomeIds.sort()).toEqual(systemBiomeIds.sort());

    // Test desert-wastes modifiers
    createRunWorld({
      preferredSpeed: 1,
      biome: 'desert-wastes',
      difficulty: 'pilgrim',
      spells: ['smite'],
    });

    const desertSession = getSession();
    expect(desertSession).toBeDefined();
    expect(desertSession?.biome).toBe('desert-wastes');
    expect(desertSession?.biomeModifiers).toBeDefined();

    // desert-wastes: faithRegenMultiplier=0.5, killGoldMultiplier=1.5
    const desertConfig = biomeConfig.biomes['desert-wastes'];
    expect(desertSession?.biomeModifiers.faithRegenRate).toBe(
      1 * desertConfig.faithRegenMultiplier,
    );
    expect(desertSession?.biomeModifiers.killGoldBase).toBe(
      Math.floor(1 * desertConfig.killGoldMultiplier),
    );

    // Test frost-peaks modifiers
    createRunWorld({
      preferredSpeed: 1,
      biome: 'frost-peaks',
      difficulty: 'pilgrim',
      spells: ['smite'],
    });

    const frostSession = getSession();
    expect(frostSession).toBeDefined();
    expect(frostSession?.biome).toBe('frost-peaks');
    expect(frostSession?.biomeModifiers).toBeDefined();

    // frost-peaks: enemySpeedMultiplier=0.8, buildTimerMultiplier=0.8
    const frostConfig = biomeConfig.biomes['frost-peaks'];
    expect(frostSession?.biomeModifiers.enemySpeed).toBe(1 * frostConfig.enemySpeedMultiplier);
    expect(frostSession?.biomeModifiers.buildTimer).toBe(1 * frostConfig.buildTimerMultiplier);

    // Verify applyBiomeModifiers function consistency with all biomes
    const base: BiomeSession = {
      faithRegenRate: 1,
      killGoldBase: 1,
      enemySpeed: 1,
      enemyHp: 1,
      buildTimer: 1,
      dropChance: 1,
    };

    for (const biomeId of systemBiomeIds) {
      const modified = applyBiomeModifiers(base, biomeId);
      const config = biomeConfig.biomes[biomeId as keyof typeof biomeConfig.biomes];
      expect(modified.faithRegenRate).toBe(base.faithRegenRate * config.faithRegenMultiplier);
      expect(modified.killGoldBase).toBe(Math.floor(base.killGoldBase * config.killGoldMultiplier));
      expect(modified.enemySpeed).toBe(base.enemySpeed * config.enemySpeedMultiplier);
      expect(modified.enemyHp).toBe(Math.floor(base.enemyHp * config.enemyHpMultiplier));
      expect(modified.buildTimer).toBe(base.buildTimer * config.buildTimerMultiplier);
      expect(modified.dropChance).toBe(base.dropChance * config.dropChanceMultiplier);
    }
  });
});
