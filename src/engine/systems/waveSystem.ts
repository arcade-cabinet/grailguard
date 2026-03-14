/**
 * @module waveSystem
 *
 * Pure functions for wave budget calculation, build timer, queue building,
 * and wave completion detection. All functions are side-effect-free and
 * import tunables from the JSON config.
 */

import bossConfig from '../../data/bossConfig.json';
import difficultyConfig from '../../data/difficultyConfig.json';
import enemyProgression from '../../data/enemyProgression.json';
import waveConfig from '../../data/waveConfig.json';
import waveLabels from '../../data/waveLabels.json';
import { type EnemyAffix, UNITS, type UnitType } from '../constants';
import type { Rng } from './rng';

/** Available difficulty tier names. */
export type DifficultyTier = 'pilgrim' | 'crusader' | 'inquisitor';

/** Enemy types that participate in wave budget allocation (excludes boss). */
const ENEMY_POOL: UnitType[] = ['summoner', 'shieldBearer', 'flying', 'troll', 'orc', 'goblin'];

/**
 * Returns the subset of enemy types unlocked for a given wave number,
 * based on the enemyProgression.json config.
 */
function getUnlockedEnemies(wave: number): UnitType[] {
  return ENEMY_POOL.filter((type) => {
    const entry = enemyProgression[type as keyof typeof enemyProgression];
    return entry && wave >= entry.unlockWave;
  });
}

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
  return Math.floor(
    waveBudgetBase * waveBudgetMultiplier ** wave + waveBudgetQuadratic * wave * wave,
  );
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
 * Allocates a budget into a queue of enemy types, respecting wave-based
 * enemy unlock progression from enemyProgression.json. Only enemy types
 * whose unlockWave <= current wave are eligible for spawning.
 *
 * @param wave - The current wave number (used for unlock checks).
 * @param budget - The remaining budget to spend.
 * @param rng - A seeded PRNG instance for affix rolls.
 * @returns An array of spawn entries with unit type and optional affix.
 */
export function allocateWaveBudget(
  wave: number,
  budget: number,
  rng: Rng,
): { type: UnitType; affix?: EnemyAffix }[] {
  const queue: { type: UnitType; affix?: EnemyAffix }[] = [];
  const possibleAffixes: EnemyAffix[] = ['armored', 'swift', 'regenerating', 'ranged'];
  const pool = getUnlockedEnemies(wave);

  // Find the cheapest available enemy
  const cheapest = Math.min(...pool.map((t) => UNITS[t].cost ?? Infinity));

  while (budget >= cheapest) {
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
 * Builds the enemy spawn queue for a given wave using a seeded PRNG.
 * Delegates to allocateWaveBudget for unlock-aware budget allocation.
 *
 * @param wave - The current wave number.
 * @param rng - A seeded PRNG instance for deterministic affix rolls.
 * @returns An array of spawn entries with unit type and optional affix.
 */
export function buildWaveQueue(wave: number, rng: Rng): { type: UnitType; affix?: EnemyAffix }[] {
  let budget = calculateWaveBudget(wave);
  const queue: { type: UnitType; affix?: EnemyAffix }[] = [];

  // Boss check (bosses have their own unlock in enemyProgression)
  const bossEntry = enemyProgression.boss;
  if (
    wave % bossWaveInterval === 0 &&
    wave >= bossEntry.unlockWave &&
    budget >= (UNITS.boss.cost ?? 0)
  ) {
    queue.push({ type: 'boss' });
    budget -= UNITS.boss.cost ?? 0;
  }

  // Fill remaining budget with unlocked enemies
  const allocated = allocateWaveBudget(wave, budget, rng);
  queue.push(...allocated);

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

/**
 * Returns a descriptive label for a wave based on its budget, using
 * threshold-to-label mappings from waveLabels.json.
 *
 * @param budget - The wave's total budget.
 * @returns A human-readable wave label (e.g. "Scout Party", "War Host").
 */
export function getWaveLabel(budget: number): string {
  for (const entry of waveLabels) {
    if (entry.maxBudget === null || budget <= entry.maxBudget) {
      return entry.label;
    }
  }
  // Fallback (should not occur if config ends with null maxBudget)
  return waveLabels[waveLabels.length - 1].label;
}

/** Stats that can be modified by difficulty. */
export interface DifficultyStats {
  hp: number;
  damage: number;
  speed: number;
}

/**
 * Applies difficulty-tier modifiers to enemy unit stats. Returns a new
 * stats object without mutating the input.
 *
 * - pilgrim: 0.8x enemy stats
 * - crusader: 1.0x enemy stats
 * - inquisitor: 1.3x enemy stats
 *
 * @param stats - The base enemy stats (hp, damage, speed).
 * @param difficulty - The active difficulty tier.
 * @returns A new stats object with multiplied and floored values.
 */
export function applyDifficultyModifiers(
  stats: DifficultyStats,
  difficulty: DifficultyTier,
): DifficultyStats {
  const config = difficultyConfig[difficulty];
  const multiplier = config.enemyStatMultiplier;
  return {
    hp: Math.floor(stats.hp * multiplier),
    damage: Math.floor(stats.damage * multiplier),
    speed: Math.floor(stats.speed * multiplier),
  };
}

/** Describes a boss variant returned by {@link getBossVariant}. */
export interface BossVariant {
  /** Boss identifier key (e.g. 'warlord', 'necromancer'). */
  id: string;
  /** The wave threshold at which this boss first appears. */
  wave: number;
  /** The special ability identifier for this boss. */
  ability: string;
  /** Full config entry for this boss variant. */
  config: Record<string, unknown>;
}

/**
 * Returns the boss variant for a given wave number based on bossConfig.json.
 * Selects the highest-wave boss whose threshold is <= the given wave.
 * Returns `undefined` for non-boss waves (not multiples of 5).
 *
 * @param wave - The current wave number.
 * @returns The matching boss variant, or `undefined` if none matches.
 */
export function getBossVariant(wave: number): BossVariant | undefined {
  if (wave % bossWaveInterval !== 0) return undefined;

  const entries = Object.entries(bossConfig) as [string, Record<string, unknown>][];
  const sorted = entries
    .filter(([, cfg]) => wave >= (cfg.wave as number))
    .sort((a, b) => (b[1].wave as number) - (a[1].wave as number));

  if (sorted.length === 0) return undefined;

  const [id, cfg] = sorted[0];
  return {
    id,
    wave: cfg.wave as number,
    ability: cfg.ability as string,
    config: cfg,
  };
}
