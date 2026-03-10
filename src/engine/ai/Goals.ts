import * as YUKA from 'yuka';

export class AttackGoal extends YUKA.Goal {
  constructor(owner: YUKA.GameEntity) {
    super(owner);
  }

  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    // Attack logic is actually handled by CombatController resolving distance
    this.status = YUKA.Goal.STATUS.COMPLETED;
    return this.status;
  }

  terminate() {}
}

export class AttackGoalEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  calculateDesirability(owner: YUKA.GameEntity) {
    // Return high score if an enemy is in range
    // Assuming owner has access to world state
    return 0; // fallback
  }

  setGoal(owner: YUKA.GameEntity) {
    // TODO: Implement when combat AI is wired to Yuka instead of CombatController
    throw new Error('AttackGoalEvaluator.setGoal not implemented');
  }
}

export class MoveToSanctuaryGoal extends YUKA.Goal {
  constructor(owner: YUKA.GameEntity) {
    super(owner);
  }

  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    // Moving logic is handled by Yuka steering
    return YUKA.Goal.STATUS.ACTIVE;
  }

  terminate() {}
}

export class MoveGoalEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  calculateDesirability(owner: YUKA.GameEntity) {
    return 0.5; // default desire to move to objective
  }

  setGoal(owner: YUKA.GameEntity) {
    // TODO: Implement when movement AI is fully wired
    throw new Error('MoveGoalEvaluator.setGoal not implemented');
  }
}
