/**
 * @module enemyBrain
 *
 * Configures Yuka steering behaviors for enemy units to produce flocking
 * movement along the road. Adds alignment, cohesion, separation, and evasion
 * behaviors with weights sourced from `src/data/aiConfig.json`.
 */

import {
  AlignmentBehavior,
  CohesionBehavior,
  EvadeBehavior,
  SeparationBehavior,
  type Vehicle,
} from 'yuka';

/**
 * Configuration shape for enemy AI steering weights.
 * Loaded from `src/data/aiConfig.json` at runtime.
 */
export interface AiConfig {
  /** Weight for flock alignment (match heading of neighbors). */
  alignmentWeight: number;
  /** Weight for flock cohesion (move toward center of neighbors). */
  cohesionWeight: number;
  /** Weight for separation (avoid crowding neighbors). */
  separationWeight: number;
  /** Weight for evasion (dodge incoming threats). */
  evasionWeight: number;
  /** Lateral offset range for lane variation (world units). */
  laneOffsetRange: number;
}

/**
 * Configures a Yuka Vehicle with flocking steering behaviors using the
 * provided AI config. Adds AlignmentBehavior, CohesionBehavior,
 * SeparationBehavior, and EvadeBehavior with their respective weights.
 *
 * @param vehicle - The Yuka Vehicle instance to configure.
 * @param config - AI configuration with behavior weights.
 */
export function configureEnemyVehicle(vehicle: Vehicle, config: AiConfig): void {
  const alignment = new AlignmentBehavior();
  alignment.weight = config.alignmentWeight;
  vehicle.steering.add(alignment);

  const cohesion = new CohesionBehavior();
  cohesion.weight = config.cohesionWeight;
  vehicle.steering.add(cohesion);

  const separation = new SeparationBehavior();
  separation.weight = config.separationWeight;
  vehicle.steering.add(separation);

  const evade = new EvadeBehavior();
  evade.weight = config.evasionWeight;
  vehicle.steering.add(evade);
}
