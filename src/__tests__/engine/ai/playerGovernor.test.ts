/**
 * @module playerGovernor.test
 *
 * TDD tests for the GOAP Player Governor. Tests each GoalEvaluator's
 * desirability scoring and the Governor's command generation.
 */

import {
  BuildStructureEvaluator,
  createPlayerGovernor,
  type GovernorWorldView,
  RepairEvaluator,
  SmiteEvaluator,
  StartWaveEvaluator,
} from '../../../engine/ai/playerGovernor';

describe('playerGovernor', () => {
  /** Helper: create a default world view that can be partially overridden. */
  function makeView(overrides: Partial<GovernorWorldView> = {}): GovernorWorldView {
    return {
      phase: 'build',
      wave: 1,
      gold: 300,
      wood: 50,
      faith: 100,
      health: 20,
      maxHealth: 20,
      buildTimeLeft: 15,
      buildingCount: 0,
      enemyCount: 0,
      enemyNearSanctuary: 0,
      smiteCooldown: 0,
      ...overrides,
    };
  }

  describe('BuildStructureEvaluator', () => {
    const evaluator = new BuildStructureEvaluator();

    it('scores higher when gold > 200 during build phase', () => {
      const score = evaluator.score(makeView({ gold: 300, phase: 'build', enemyCount: 0 }));
      expect(score).toBeGreaterThan(0.5);
    });

    it('scores 0 during defend phase', () => {
      const score = evaluator.score(makeView({ phase: 'defend' }));
      expect(score).toBe(0);
    });

    it('scores lower when gold < 200', () => {
      const lowGold = evaluator.score(makeView({ gold: 100 }));
      const highGold = evaluator.score(makeView({ gold: 400 }));
      expect(highGold).toBeGreaterThan(lowGold);
    });

    it('scores lower when wave pressure is high', () => {
      const lowPressure = evaluator.score(makeView({ wave: 1 }));
      const highPressure = evaluator.score(makeView({ wave: 15 }));
      // Higher waves = more pressure, should reduce build desire if few buildings
      expect(lowPressure).toBeGreaterThanOrEqual(highPressure);
    });

    it('returns a value between 0 and 1', () => {
      const score = evaluator.score(makeView());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('StartWaveEvaluator', () => {
    const evaluator = new StartWaveEvaluator();

    it('scores higher during build phase when defenses are ready', () => {
      const score = evaluator.score(
        makeView({
          phase: 'build',
          buildingCount: 3,
          buildTimeLeft: 5,
        }),
      );
      expect(score).toBeGreaterThan(0.3);
    });

    it('scores 0 during defend phase', () => {
      const score = evaluator.score(makeView({ phase: 'defend' }));
      expect(score).toBe(0);
    });

    it('scores higher when more buildings are placed', () => {
      const few = evaluator.score(makeView({ buildingCount: 1, buildTimeLeft: 5 }));
      const many = evaluator.score(makeView({ buildingCount: 5, buildTimeLeft: 5 }));
      expect(many).toBeGreaterThanOrEqual(few);
    });

    it('returns a value between 0 and 1', () => {
      const score = evaluator.score(makeView());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('SmiteEvaluator', () => {
    const evaluator = new SmiteEvaluator();

    it('scores higher when enemies are near sanctuary', () => {
      const score = evaluator.score(
        makeView({
          phase: 'defend',
          enemyNearSanctuary: 5,
          smiteCooldown: 0,
          faith: 50,
        }),
      );
      expect(score).toBeGreaterThan(0.3);
    });

    it('scores 0 when smite is on cooldown', () => {
      const score = evaluator.score(
        makeView({
          phase: 'defend',
          enemyNearSanctuary: 5,
          smiteCooldown: 3,
        }),
      );
      expect(score).toBe(0);
    });

    it('scores 0 when no enemies near sanctuary', () => {
      const score = evaluator.score(
        makeView({
          phase: 'defend',
          enemyNearSanctuary: 0,
        }),
      );
      expect(score).toBe(0);
    });

    it('scores 0 during build phase', () => {
      const score = evaluator.score(
        makeView({
          phase: 'build',
          enemyNearSanctuary: 5,
        }),
      );
      expect(score).toBe(0);
    });

    it('returns a value between 0 and 1', () => {
      const score = evaluator.score(
        makeView({
          phase: 'defend',
          enemyNearSanctuary: 3,
          smiteCooldown: 0,
          faith: 50,
        }),
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('RepairEvaluator', () => {
    const evaluator = new RepairEvaluator();

    it('returns a low priority score', () => {
      const score = evaluator.score(makeView());
      expect(score).toBeLessThanOrEqual(0.2);
    });

    it('returns a value between 0 and 1', () => {
      const score = evaluator.score(makeView());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('createPlayerGovernor', () => {
    it('creates a governor with all 4 evaluators', () => {
      const governor = createPlayerGovernor();
      expect(governor.evaluators).toHaveLength(4);
    });

    it('returns build command when gold is high during build phase', () => {
      const governor = createPlayerGovernor();
      const view = makeView({ gold: 500, phase: 'build', buildingCount: 0 });
      const commands = governor.decide(view);
      // Should recommend building
      const hasBuild = commands.some((c) => c.type === 'build');
      expect(hasBuild).toBe(true);
    });

    it('returns smite command when enemies near sanctuary', () => {
      const governor = createPlayerGovernor();
      const view = makeView({
        phase: 'defend',
        enemyNearSanctuary: 5,
        smiteCooldown: 0,
        faith: 50,
      });
      const commands = governor.decide(view);
      const hasSmite = commands.some((c) => c.type === 'castSpell');
      expect(hasSmite).toBe(true);
    });

    it('returns startWave command when defenses ready and build time low', () => {
      const governor = createPlayerGovernor();
      const view = makeView({
        phase: 'build',
        buildingCount: 5,
        buildTimeLeft: 3,
        gold: 50, // low gold so build won't score high
      });
      const commands = governor.decide(view);
      const hasStart = commands.some((c) => c.type === 'startWave');
      expect(hasStart).toBe(true);
    });

    it('returns empty commands array when no evaluator scores high', () => {
      const governor = createPlayerGovernor();
      const view = makeView({ phase: 'game_over' as 'build' });
      const commands = governor.decide(view);
      // game_over phase -- no evaluator should produce commands
      expect(commands).toHaveLength(0);
    });
  });
});
