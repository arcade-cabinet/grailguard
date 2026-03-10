declare module 'yuka' {
  export class GameEntity {
    position: Vector3;
    rotation: any;
    brain: any;
    update(delta: number): this;
  }
  export class Vehicle extends GameEntity {
    maxSpeed: number;
    mass: number;
    steering: SteeringManager;
  }
  export class SteeringManager {
    add(behavior: SteeringBehavior): void;
    remove(behavior: SteeringBehavior): void;
  }
  export class SteeringBehavior {
    weight: number;
  }
  export class FollowPathBehavior extends SteeringBehavior {
    constructor(path?: Path, distance?: number);
    nextWaypointDistance: number;
  }
  export class SeparationBehavior extends SteeringBehavior {}
  export class AlignmentBehavior extends SteeringBehavior {}
  export class CohesionBehavior extends SteeringBehavior {}
  export class EntityManager {
    add(entity: GameEntity): void;
    remove(entity: GameEntity): void;
    update(delta: number): void;
  }
  export class Time {
    update(): this;
    getDelta(): number;
  }
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    squaredDistanceTo(v: Vector3): number;
  }
  export class Path {
    add(waypoint: Vector3): void;
  }
  export class EvadeBehavior extends SteeringBehavior {
    constructor(pursuer: Vehicle);
    active: boolean;
  }
  export class Goal {
    static STATUS: { ACTIVE: string; COMPLETED: string; FAILED: string; INACTIVE: string };
    owner: GameEntity;
    status: string;
    constructor(owner: GameEntity);
    activate(): void;
    process(): string;
    terminate(): void;
  }
  export class CompositeGoal extends Goal {
    addSubgoal(goal: Goal): void;
    removeAllSubgoals(): void;
  }
  export class Think extends CompositeGoal {
    addEvaluator(evaluator: GoalEvaluator): void;
    arbitrate(): void;
  }
  export class GoalEvaluator<T = GameEntity> {
    calculateDesirability(owner: T): number;
    setGoal(owner: T): void;
  }
}
