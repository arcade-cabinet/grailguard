/**
 * @module biomeSystem
 *
 * Pure functions for applying biome-specific modifiers to session parameters.
 * Each biome adjusts faith regen, kill gold, enemy speed/HP, build timer,
 * and drop chance through multipliers defined in biomeConfig.json.
 *
 * Also provides terrain color palettes and scenery types per biome for
 * the rendering layer.
 */

import biomeConfigJson from '../../data/biomeConfig.json';

/** Shape of a single biome configuration entry. */
export interface BiomeConfig {
  faithRegenMultiplier: number;
  killGoldMultiplier: number;
  enemySpeedMultiplier: number;
  enemyHpMultiplier: number;
  buildTimerMultiplier: number;
  dropChanceMultiplier: number;
  terrainColors: string[];
  sceneryTypes: string[];
  ambientAudioKey: string;
}

/** Session parameters that biome modifiers apply to. */
export interface BiomeSession {
  faithRegenRate: number;
  killGoldBase: number;
  enemySpeed: number;
  enemyHp: number;
  buildTimer: number;
  dropChance: number;
}

const biomes = biomeConfigJson.biomes as Record<string, BiomeConfig>;

/**
 * Returns all registered biome IDs.
 */
export function getAllBiomeIds(): string[] {
  return Object.keys(biomes);
}

/**
 * Returns the biome configuration for the given ID.
 * Falls back to 'kings-road' if the biome is not found.
 *
 * @param biomeId - The biome identifier string.
 * @returns The biome configuration.
 */
export function getBiomeConfig(biomeId: string): BiomeConfig {
  return biomes[biomeId] ?? biomes['kings-road'];
}

/**
 * Applies biome-specific multipliers to the given session parameters.
 * Returns a new object; does not mutate the input.
 *
 * Integer fields (killGoldBase, enemyHp) are floored after multiplication.
 *
 * @param session - The base session parameters to modify.
 * @param biomeId - The biome to apply.
 * @returns A new BiomeSession with modifiers applied.
 */
export function applyBiomeModifiers(
  session: BiomeSession,
  biomeId: string,
): BiomeSession {
  const config = getBiomeConfig(biomeId);

  return {
    faithRegenRate: session.faithRegenRate * config.faithRegenMultiplier,
    killGoldBase: Math.floor(session.killGoldBase * config.killGoldMultiplier),
    enemySpeed: session.enemySpeed * config.enemySpeedMultiplier,
    enemyHp: Math.floor(session.enemyHp * config.enemyHpMultiplier),
    buildTimer: session.buildTimer * config.buildTimerMultiplier,
    dropChance: session.dropChance * config.dropChanceMultiplier,
  };
}
