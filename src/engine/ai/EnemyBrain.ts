import * as YUKA from 'yuka';
import { useGameStore } from '../../store/useGameStore';
import { gridToWorld } from '../../utils/math';
import { CELL_SIZE, type Entity } from '../constants';
import { yukaEntityManager } from './EntityManager';

/**
 * A Yuka Vehicle that represents an Enemy in the game, using SteeringBehaviors.
 */
export class EnemyVehicle extends YUKA.Vehicle {
  public storeId: string;
  private pathBehaviors: YUKA.FollowPathBehavior[] = [];
  private flockingBehaviors: YUKA.SteeringBehavior[] = [];
  private evadeBehavior: YUKA.EvadeBehavior;
  private dummyPursuer: YUKA.Vehicle;

  constructor(storeId: string) {
    super();
    this.storeId = storeId;
    this.maxSpeed = 1.0;
    this.mass = 1.0;

    // Setup evasion
    this.dummyPursuer = new YUKA.Vehicle();
    this.evadeBehavior = new YUKA.EvadeBehavior(this.dummyPursuer);
    this.evadeBehavior.weight = 0.4; // Lower than path following/seek (0.5)
    this.evadeBehavior.active = false;
    this.steering.add(this.evadeBehavior);
  }

  update(delta: number): this {
    // Check for nearby range towers to evade
    const store = useGameStore.getState();
    let evading = false;

    for (const b of Object.values(store.buildings)) {
      if (b.type === 'range') {
        const { x: wx, z: wz } = gridToWorld(b.gridX, b.gridZ, CELL_SIZE);
        const distSq = this.position.squaredDistanceTo(new YUKA.Vector3(wx, 0, wz));
        // Range tower attackRange is roughly 3.0 units (9 sq)
        if (distSq < 9.0) {
          this.dummyPursuer.position.set(wx, 0, wz);
          evading = true;
          break;
        }
      }
    }

    this.evadeBehavior.active = evading;

    return super.update(delta);
  }

  /**
   * Translates the grid path from the Zustand store into a Yuka Path that the vehicle can follow.
   */
  public setPath(pathCoords: { x: number; z: number }[]) {
    const yukaPath = new YUKA.Path();
    for (const point of pathCoords) {
      const { x: wx, z: wz } = gridToWorld(point.x, point.z, CELL_SIZE);
      yukaPath.add(new YUKA.Vector3(wx, 0, wz));
    }

    // Clear previous follow path behaviors
    for (const b of this.pathBehaviors) {
      this.steering.remove(b);
    }
    this.pathBehaviors = [];

    // Clear previous flocking behaviors
    for (const b of this.flockingBehaviors) {
      this.steering.remove(b);
    }
    this.flockingBehaviors = [];

    const followPathBehavior = new YUKA.FollowPathBehavior(yukaPath, 0.5);
    // Add arrive behavior at the end of the path
    followPathBehavior.nextWaypointDistance = 0.5;

    this.steering.add(followPathBehavior);
    this.pathBehaviors.push(followPathBehavior);

    // Also add obstacle avoidance or separation if needed
    const separation = new YUKA.SeparationBehavior();
    separation.weight = 1.0;
    this.steering.add(separation);
    this.flockingBehaviors.push(separation);

    const alignment = new YUKA.AlignmentBehavior();
    alignment.weight = 0.5;
    this.steering.add(alignment);
    this.flockingBehaviors.push(alignment);

    const cohesion = new YUKA.CohesionBehavior();
    cohesion.weight = 0.5;
    this.steering.add(cohesion);
    this.flockingBehaviors.push(cohesion);
  }
}
