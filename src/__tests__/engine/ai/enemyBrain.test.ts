/**
 * @module enemyBrain.test
 *
 * TDD tests for enemy flocking/steering behavior configuration.
 */

import { Vehicle } from 'yuka';
import { configureEnemyVehicle } from '../../../engine/ai/enemyBrain';
import aiConfig from '../../../data/aiConfig.json';

describe('enemyBrain', () => {
  describe('configureEnemyVehicle', () => {
    it('adds AlignmentBehavior with weight from config', () => {
      const vehicle = new Vehicle();
      configureEnemyVehicle(vehicle, aiConfig);
      const alignment = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'AlignmentBehavior',
      );
      expect(alignment).toBeDefined();
      expect(alignment!.weight).toBe(aiConfig.alignmentWeight);
    });

    it('adds CohesionBehavior with weight from config', () => {
      const vehicle = new Vehicle();
      configureEnemyVehicle(vehicle, aiConfig);
      const cohesion = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'CohesionBehavior',
      );
      expect(cohesion).toBeDefined();
      expect(cohesion!.weight).toBe(aiConfig.cohesionWeight);
    });

    it('adds SeparationBehavior with weight from config', () => {
      const vehicle = new Vehicle();
      configureEnemyVehicle(vehicle, aiConfig);
      const separation = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'SeparationBehavior',
      );
      expect(separation).toBeDefined();
      expect(separation!.weight).toBe(aiConfig.separationWeight);
    });

    it('adds EvadeBehavior with weight from config', () => {
      const vehicle = new Vehicle();
      configureEnemyVehicle(vehicle, aiConfig);
      const evade = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'EvadeBehavior',
      );
      expect(evade).toBeDefined();
      expect(evade!.weight).toBe(aiConfig.evasionWeight);
    });

    it('configures exactly 4 steering behaviors', () => {
      const vehicle = new Vehicle();
      configureEnemyVehicle(vehicle, aiConfig);
      expect(vehicle.steering.behaviors.length).toBe(4);
    });

    it('accepts custom config overrides', () => {
      const vehicle = new Vehicle();
      const custom = {
        alignmentWeight: 1.0,
        cohesionWeight: 0.8,
        separationWeight: 2.0,
        evasionWeight: 0.1,
        laneOffsetRange: 3.0,
      };
      configureEnemyVehicle(vehicle, custom);
      const alignment = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'AlignmentBehavior',
      );
      expect(alignment!.weight).toBe(1.0);
      const separation = vehicle.steering.behaviors.find(
        (b) => b.constructor.name === 'SeparationBehavior',
      );
      expect(separation!.weight).toBe(2.0);
    });

    it('does not throw on a fresh Vehicle', () => {
      const vehicle = new Vehicle();
      expect(() => configureEnemyVehicle(vehicle, aiConfig)).not.toThrow();
    });
  });
});
