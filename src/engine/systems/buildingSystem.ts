/**
 * @module buildingSystem
 *
 * Pure functions for building placement validation, upgrade/sell cost
 * calculations, and spawn rate math. No ECS or world access.
 */

import { BUILDINGS, type BuildingType } from '../constants';
import buildingConfig from '../../data/buildingConfig.json';
import combatConfig from '../../data/combatConfig.json';

const { sellValuePercent } = combatConfig;
const spawnRateMultiplier = buildingConfig.spawnRateMultiplier;
const statMultiplier = buildingConfig.statMultiplier;
const upgradeCostMultiplier = buildingConfig.upgradeCostMultiplier;

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Snaps a world-space position to the 5-unit placement grid at Y=1.5.
 */
export function snapToGrid(position: { x: number; y: number; z: number }) {
  return {
    x: Math.round(position.x / 5) * 5,
    y: 1.5,
    z: Math.round(position.z / 5) * 5,
  };
}

/**
 * Returns the distance from a position to the nearest road sample point.
 */
export function getRoadDistancePure(
  position: { x: number; z: number },
  roadSamples: { x: number; z: number }[],
): number {
  let closest = Number.POSITIVE_INFINITY;
  for (const sample of roadSamples) {
    const dist = distance2D(position, sample);
    if (dist < closest) closest = dist;
  }
  return closest;
}

/** Allowed building types that tracks can overlap. */
const TRACK_OVERLAP_ALLOWED: BuildingType[] = ['mine_ore', 'mine_gem', 'lumber', 'mint'];

/**
 * Checks whether a building placement is valid based on road distance,
 * overlap with existing structures/walls, and sanctuary proximity.
 * Pure function: takes all needed state as parameters.
 *
 * @param type - The building type to place.
 * @param position - Grid-snapped XZ position.
 * @param roadSamples - Road sample points for distance checks.
 * @param sanctuaryPos - Position of the sanctuary.
 * @param existingBuildings - Array of existing building positions and types.
 * @param wallPositions - Array of existing wall unit positions.
 * @returns `true` if placement is valid.
 */
export function isPlacementValidPure(
  type: BuildingType,
  position: { x: number; z: number },
  roadSamples: { x: number; z: number }[],
  sanctuaryPos: { x: number; z: number },
  existingBuildings: Array<{ type: BuildingType; x: number; z: number }>,
  wallPositions: Array<{ x: number; z: number }>,
): boolean {
  // Sanctuary overlap check (except tracks)
  if (type !== 'track' && distance2D(position, sanctuaryPos) < 5) {
    return false;
  }

  // Check existing building overlaps
  for (const building of existingBuildings) {
    if (distance2D(position, building) < 5) {
      if (type === 'track' && TRACK_OVERLAP_ALLOWED.includes(building.type)) {
        continue;
      }
      return false;
    }
  }

  // Check wall overlaps
  for (const wall of wallPositions) {
    if (distance2D(position, wall) < 5) {
      return false;
    }
  }

  const roadDistance = getRoadDistancePure(position, roadSamples);

  if (type === 'track') return true;
  if (type === 'wall') return roadDistance <= 4;
  return roadDistance >= 7;
}

/** Maximum building level. Upgrades beyond this are rejected. */
const MAX_BUILDING_LEVEL = 5;

/**
 * Calculates the gold and wood cost for upgrading a building to the next level.
 * Formula: baseCost * upgradeCostMultiplier^(level-1), applied to both gold and wood.
 * Returns Infinity for both if the building is already at max level (5).
 *
 * @param baseCost - The base cost of the building (same for gold and wood).
 * @param level - The current level of the building (1-based).
 * @returns Object with gold and wood upgrade costs (floored integers).
 */
export function calculateUpgradeCost(
  baseCost: number,
  level: number,
): { gold: number; wood: number } {
  if (level > MAX_BUILDING_LEVEL) {
    return { gold: Infinity, wood: Infinity };
  }
  const cost = Math.floor(baseCost * upgradeCostMultiplier ** (level - 1));
  return { gold: cost, wood: cost };
}

/**
 * Calculates the gold and wood refund from selling a building.
 * Uses the exponential upgrade cost formula to sum total invested resources.
 *
 * @param type - Building type.
 * @param levelSpawn - Current spawn branch level.
 * @param levelStats - Current stats branch level.
 * @returns Object with gold and wood refund values.
 */
export function calculateSellValue(
  type: BuildingType,
  levelSpawn: number,
  levelStats: number,
): { gold: number; wood: number } {
  const config = BUILDINGS[type];
  // Sum upgrade costs for all levels achieved (spawn + stats branches)
  let totalGoldInvested = config.cost;
  for (let i = 1; i < levelSpawn; i++) {
    totalGoldInvested += Math.floor(config.cost * upgradeCostMultiplier ** (i - 1));
  }
  for (let i = 1; i < levelStats; i++) {
    totalGoldInvested += Math.floor(config.cost * upgradeCostMultiplier ** (i - 1));
  }
  const gold = Math.floor(totalGoldInvested * sellValuePercent);
  const wood = Math.floor((config.woodCost ?? 0) * sellValuePercent);
  return { gold, wood };
}

/**
 * Computes the spawn interval for a building at a given spawn-branch level.
 *
 * @param type - Building type.
 * @param levelSpawn - Current spawn branch level.
 * @returns Seconds between unit spawns.
 */
export function calculateSpawnRate(type: BuildingType, levelSpawn: number): number {
  const config = BUILDINGS[type];
  return config.spawnTime * spawnRateMultiplier ** (levelSpawn - 1);
}

/**
 * Computes the stat multiplier for spawned units at a given stats-branch level.
 *
 * @param levelStats - Current stats branch level.
 * @returns Stat scaling multiplier.
 */
export function calculateStatMultiplier(levelStats: number): number {
  return statMultiplier ** (levelStats - 1);
}

/**
 * Checks whether the player can afford to place a building.
 *
 * @param type - Building type.
 * @param gold - Current gold.
 * @param wood - Current wood.
 * @param relics - Active relic IDs (for iron_tracks waiving wood cost).
 * @returns `true` if affordable.
 */
export function canAffordBuilding(
  type: BuildingType,
  gold: number,
  wood: number,
  relics: string[],
): boolean {
  const config = BUILDINGS[type];
  let woodCost = config.woodCost ?? 0;
  if (type === 'track' && relics.includes('iron_tracks')) {
    woodCost = 0;
  }
  return gold >= config.cost && wood >= woodCost;
}
