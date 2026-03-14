/**
 * @module playerGovernor
 *
 * GOAP-style player governor AI that produces WorldCommand objects.
 * Uses a set of GoalEvaluators (inspired by Yuka's Think/GoalEvaluator
 * pattern) to score potential actions and select the best one each tick.
 *
 * Evaluators:
 * - BuildStructureEvaluator -- scores higher when gold > 200 and wave pressure low
 * - StartWaveEvaluator -- scores higher during build phase when defenses ready
 * - SmiteEvaluator -- scores higher when enemies near sanctuary
 * - RepairEvaluator -- placeholder, low priority
 *
 * The governor outputs WorldCommand objects (same as player input) so it
 * can drive the game identically to a human player.
 */

import type { WorldCommand } from '../GameEngine';
import governorConfig from '../../data/governorConfig.json';

const { weights, thresholds } = governorConfig;

/** Snapshot of the world state provided to evaluators each tick. */
export interface GovernorWorldView {
  phase: string;
  wave: number;
  gold: number;
  wood: number;
  faith: number;
  health: number;
  maxHealth: number;
  buildTimeLeft: number;
  buildingCount: number;
  enemyCount: number;
  enemyNearSanctuary: number;
  smiteCooldown: number;
}

/** Base interface for a GOAP goal evaluator. */
export interface GoalEvaluator {
  /** Compute desirability score in [0, 1]. */
  score(view: GovernorWorldView): number;
  /** Generate commands to execute this goal. */
  generateCommands(view: GovernorWorldView): WorldCommand[];
}

/**
 * Evaluates the desirability of placing a new building.
 * Higher score when gold is plentiful and wave pressure is low.
 */
export class BuildStructureEvaluator implements GoalEvaluator {
  score(view: GovernorWorldView): number {
    if (view.phase !== 'build') return 0;

    // Gold factor: ramps from 0 at 0 gold to 1 at thresholds.goldForBuild*2
    const goldFactor = Math.min(1, view.gold / (thresholds.goldForBuild * 2));

    // Wave pressure: higher waves with few buildings = more pressure
    const wavePressure = Math.min(1, view.wave / 20);
    const defenseFactor = Math.min(1, view.buildingCount / 6);
    const pressureReduction = wavePressure * (1 - defenseFactor) * 0.3;

    const raw = goldFactor * weights.buildStructure - pressureReduction;
    return Math.max(0, Math.min(1, raw));
  }

  generateCommands(view: GovernorWorldView): WorldCommand[] {
    if (view.phase !== 'build') return [];

    // Pick building type based on current resources and needs
    // Simple heuristic: if few buildings, place sentries; if low wood, place lumber
    const type = view.wood < 30 ? 'lumber' : 'sentry';
    const cost = type === 'lumber' ? 75 : 75;

    if (view.gold < cost) return [];

    // Place near center with some offset based on building count
    const angle = (view.buildingCount * 1.2) % (Math.PI * 2);
    const radius = 15 + (view.buildingCount % 4) * 5;
    const x = Math.round(Math.cos(angle) * radius / 5) * 5;
    const z = Math.round(Math.sin(angle) * radius / 5) * 5;

    return [
      {
        type: 'build',
        buildingType: type,
        position: { x, y: 1.5, z },
      },
    ];
  }
}

/**
 * Evaluates desirability of starting the next wave.
 * Higher when defenses are ready and build time is running low.
 */
export class StartWaveEvaluator implements GoalEvaluator {
  score(view: GovernorWorldView): number {
    if (view.phase !== 'build') return 0;

    // More buildings = more ready
    const readiness = Math.min(1, view.buildingCount / thresholds.buildingsReadyForWave);

    // Less build time left = more urgency to start
    const urgency = 1 - Math.min(1, view.buildTimeLeft / thresholds.buildTimeLeftForWave);

    const raw = (readiness * 0.6 + urgency * 0.4) * weights.startWave;
    return Math.max(0, Math.min(1, raw));
  }

  generateCommands(_view: GovernorWorldView): WorldCommand[] {
    return [{ type: 'startWave' }];
  }
}

/**
 * Evaluates desirability of casting Smite spell.
 * Higher when enemies are near the sanctuary and spell is off cooldown.
 */
export class SmiteEvaluator implements GoalEvaluator {
  score(view: GovernorWorldView): number {
    if (view.phase !== 'defend') return 0;
    if (view.smiteCooldown > 0) return 0;
    if (view.enemyNearSanctuary < thresholds.enemyNearSanctuaryForSmite) return 0;
    if (view.faith < thresholds.faithForSmite) return 0;

    // More enemies near sanctuary = higher urgency
    const threatFactor = Math.min(1, view.enemyNearSanctuary / 8);
    const raw = threatFactor * weights.smite;
    return Math.max(0, Math.min(1, raw));
  }

  generateCommands(_view: GovernorWorldView): WorldCommand[] {
    return [{ type: 'castSpell', spellId: 'smite' }];
  }
}

/**
 * Placeholder evaluator for future repair mechanics.
 * Currently scores very low so it never dominates.
 */
export class RepairEvaluator implements GoalEvaluator {
  score(view: GovernorWorldView): number {
    // Placeholder: only slightly desires repair when health is low
    if (view.health >= view.maxHealth) return 0;
    const healthRatio = view.health / view.maxHealth;
    const raw = (1 - healthRatio) * weights.repair;
    return Math.max(0, Math.min(1, raw));
  }

  generateCommands(_view: GovernorWorldView): WorldCommand[] {
    // No repair command exists yet -- placeholder returns empty
    return [];
  }
}

/** A GOAP governor that selects the best action via evaluator scoring. */
export interface PlayerGovernor {
  evaluators: GoalEvaluator[];
  /** Evaluate all goals and return commands for the highest-scoring one. */
  decide(view: GovernorWorldView): WorldCommand[];
}

/**
 * Creates a new PlayerGovernor with all 4 evaluators registered.
 * Call `governor.decide(worldView)` each tick to get WorldCommand[].
 */
export function createPlayerGovernor(): PlayerGovernor {
  const evaluators: GoalEvaluator[] = [
    new BuildStructureEvaluator(),
    new StartWaveEvaluator(),
    new SmiteEvaluator(),
    new RepairEvaluator(),
  ];

  function decide(view: GovernorWorldView): WorldCommand[] {
    let bestScore = 0;
    let bestEvaluator: GoalEvaluator | null = null;

    for (const evaluator of evaluators) {
      const score = evaluator.score(view);
      if (score > bestScore) {
        bestScore = score;
        bestEvaluator = evaluator;
      }
    }

    if (!bestEvaluator || bestScore <= 0) return [];
    return bestEvaluator.generateCommands(view);
  }

  return { evaluators, decide };
}
