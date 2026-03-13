/**
 * @module waveSystem
 *
 * Pure functions for wave budget calculation, build timer, queue building,
 * and wave completion detection. All functions are side-effect-free and
 * import tunables from the JSON config.
 */

import waveConfig from '../../data/waveConfig.json';
import { UNITS, type UnitType, type EnemyAffix } from '../constants';
import type { Rng } from './rng';

const {
  waveBudgetBase,
  waveBudgetMultiplier,
  waveBudgetQuadratic,
  buildTimerBase,
  buildTimerLogCoeff,
  bossWaveInterval,
  affixStartWave,
  affixChance,
  waveCompletionBonusBase,
  waveCompletionBonusPerWave,
  interestRate,
} = waveConfig;

/**
 * Computes the total budget of spawnable points for a given wave number.
 *
 * @param wave - The current wave number (1-based).
 * @returns The wave budget as a floored integer.
 */
export function calculateWaveBudget(wave: number): number {
  return Math.floor(waveBudgetBase * waveBudgetMultiplier ** wave + waveBudgetQuadratic * wave * wave);
}

/**
 * Computes the build-phase duration in seconds for a given wave.
 *
 * @param wave - The current wave number (1-based).
 * @returns The build timer as a floored integer.
 */
export function calculateBuildTimer(wave: number): number {
  return Math.floor(buildTimerBase + buildTimerLogCoeff * Math.log(wave));
}

/**
 * Builds the enemy spawn queue for a given wave using a seeded PRNG.
 *
 * @param wave - The current wave number.
 * @param rng - A seeded PRNG instance for deterministic affix rolls.
 * @returns An array of spawn entries with unit type and optional affix.
 */
export function buildWaveQueue(
  wave: number,
  rng: Rng,
): { type: UnitType; affix?: EnemyAffix }[] {
  let budget = calculateWaveBudget(wave);
  const queue: { type: UnitType; affix?: EnemyAffix }[] = [];
  const possibleAffixes: EnemyAffix[] = ['armored', 'swift', 'regenerating', 'ranged'];

  if (wave % bossWaveInterval === 0 && budget >= (UNITS.boss.cost ?? 0)) {
    queue.push({ type: 'boss' });
    budget -= UNITS.boss.cost ?? 0;
  }

  const pool: UnitType[] = ['troll', 'orc', 'goblin'];
  while (budget >= (UNITS.goblin.cost ?? 0)) {
    for (const type of pool) {
      const cost = UNITS[type].cost ?? 0;
      if (budget >= cost) {
        let affix: EnemyAffix | undefined;
        if (wave >= affixStartWave && rng.next() < affixChance) {
          affix = possibleAffixes[rng.nextInt(0, possibleAffixes.length - 1)];
        }
        queue.push({ type, affix });
        budget -= cost;
        break;
      }
    }
  }

  return queue;
}

/**
 * Checks whether a wave is complete (all spawned and all dead).
 *
 * @param queueLength - Number of remaining entries in the spawn queue.
 * @param enemiesAlive - Whether any enemy units are still alive.
 * @returns `true` if the wave is over.
 */
export function isWaveComplete(queueLength: number, enemiesAlive: boolean): boolean {
  return queueLength === 0 && !enemiesAlive;
}

/**
 * Computes the gold reward and interest for completing a wave.
 *
 * @param wave - The wave number that was completed.
 * @param currentGold - The player's current gold total (for interest calc).
 * @param hasGoldenAge - Whether the player has the golden_age relic.
 * @returns An object with `goldReward` and `interest` amounts.
 */
export function calculateWaveCompletionReward(
  wave: number,
  currentGold: number,
  hasGoldenAge: boolean,
): { goldReward: number; interest: number } {
  const goldReward = waveCompletionBonusBase + waveCompletionBonusPerWave * wave;
  const interest = hasGoldenAge ? Math.floor(currentGold * interestRate) : 0;
  return { goldReward, interest };
}
