import * as YUKA from 'yuka';
import { useGameStore } from '../../store/useGameStore';
import { worldToGrid } from '../../utils/math';
import {
  BUILDING_COST,
  type Building,
  type BuildingType,
  CELL_SIZE,
  GRID_SIZE,
  TILE,
} from '../constants';

export class PlayerGovernorBrain extends YUKA.GameEntity {
  private think: YUKA.Think;

  addSubgoal(goal: YUKA.Goal): void {
    this.think.addSubgoal(goal);
  }

  constructor() {
    super();
    this.think = new YUKA.Think(this);
    this.think.addEvaluator(new BuildEvaluator('wall', 1.0));
    this.think.addEvaluator(new BuildEvaluator('hut', 2.0));
    this.think.addEvaluator(new BuildEvaluator('range', 1.5));
    this.think.addEvaluator(new RepairGoalEvaluator());
    this.think.addEvaluator(new SmiteGoalEvaluator());
    this.think.addEvaluator(new StartWaveEvaluator());
  }

  update(delta: number): this {
    super.update(delta);
    this.think.process();
    return this;
  }
}

class BuildStructureGoal extends YUKA.Goal {
  private bType: string;
  constructor(owner: YUKA.GameEntity, bType: string) {
    super(owner);
    this.bType = bType;
  }

  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    const store = useGameStore.getState();
    if (store.phase !== 'build') {
      this.status = YUKA.Goal.STATUS.COMPLETED;
      return this.status;
    }

    const cost = BUILDING_COST[this.bType as BuildingType];
    if (store.gold >= cost) {
      // Find a valid spot
      for (let x = 2; x < GRID_SIZE - 2; x++) {
        for (let z = 2; z < GRID_SIZE - 2; z++) {
          const type = store.grid[x]?.[z];
          const canBuild = this.bType === 'wall' ? type === TILE.PATH : type === TILE.GRASS;

          if (canBuild) {
            const isOccupied = Object.values(store.buildings).some(
              (b) => b.gridX === x && b.gridZ === z,
            );
            if (!isOccupied && store.spendGold(cost)) {
              store.addBuilding({
                id: `b_${Date.now()}_yuka_${x}_${z}`,
                type: this.bType as BuildingType,
                gridX: x,
                gridZ: z,
                levelSpawn: 1,
                levelStats: 1,
                timer: 0,
              });
              this.status = YUKA.Goal.STATUS.COMPLETED;
              return this.status;
            }
          }
        }
      }
    }
    this.status = YUKA.Goal.STATUS.COMPLETED;
    return this.status;
  }

  terminate() {}
}

function hasBuildSlot(
  store: ReturnType<typeof useGameStore.getState>,
  bType: BuildingType,
): boolean {
  for (let x = 2; x < GRID_SIZE - 2; x++) {
    for (let z = 2; z < GRID_SIZE - 2; z++) {
      const tile = store.grid[x]?.[z];
      const canBuild = bType === 'wall' ? tile === TILE.PATH : tile === TILE.GRASS;
      const occupied = Object.values(store.buildings).some((b) => b.gridX === x && b.gridZ === z);
      if (canBuild && !occupied) return true;
    }
  }
  return false;
}

class BuildEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  private bType: string;
  private priorityWeight: number;

  constructor(bType: string, weight: number) {
    super();
    this.bType = bType;
    this.priorityWeight = weight;
  }

  calculateDesirability() {
    const store = useGameStore.getState();
    const cost = BUILDING_COST[this.bType as BuildingType];
    if (store.phase !== 'build' || store.gold < cost) return 0.0;
    if (!hasBuildSlot(store, this.bType as BuildingType)) return 0.0;

    // Threat-aware building
    const wave = store.wave;
    let weight = this.priorityWeight;
    if (wave > 3 && this.bType === 'range') weight += 0.5; // Prioritize ranges on higher waves
    if (wave > 5 && this.bType === 'hut') weight -= 0.5; // De-prioritize economy later

    // Income tracking
    const hutCount = Object.values(store.buildings).filter((b) => b.type === 'hut').length;
    if (this.bType === 'hut' && hutCount < wave / 2) {
      weight += 1.0; // Needs more economy
    }

    return weight;
  }

  setGoal(owner: YUKA.GameEntity) {
    (owner as PlayerGovernorBrain).addSubgoal(new BuildStructureGoal(owner, this.bType));
  }
}

class RepairGoal extends YUKA.Goal {
  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    const store = useGameStore.getState();
    if (store.phase !== 'build') {
      this.status = YUKA.Goal.STATUS.COMPLETED;
      return this.status;
    }

    const walls = Object.values(store.units).filter((u) => u.type === 'wall' && u.hp < u.maxHp);
    if (walls.length > 0 && store.gold >= 10) {
      const target = walls[0];
      if (store.spendGold(10)) {
        // Heal
        useGameStore.getState().damageUnit(target.id, -Math.floor(target.maxHp * 0.5));
      }
    }

    this.status = YUKA.Goal.STATUS.COMPLETED;
    return this.status;
  }

  terminate() {}
}

class RepairGoalEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  calculateDesirability() {
    const store = useGameStore.getState();
    if (store.phase !== 'build' || store.gold < 10) return 0.0;
    const damagedWalls = Object.values(store.units).filter(
      (u) => u.type === 'wall' && u.hp < u.maxHp,
    );
    return damagedWalls.length > 0 ? 3.0 : 0.0; // High priority to repair
  }

  setGoal(owner: YUKA.GameEntity) {
    (owner as PlayerGovernorBrain).addSubgoal(new RepairGoal(owner));
  }
}

class SmiteGoal extends YUKA.Goal {
  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    const store = useGameStore.getState();
    if (store.divineSmiteCooldown <= 0 && store.phase === 'defend') {
      // Handled via ui or directly here.
      // But GameScreen handles smite button visually, so we just set cooldown and damage enemies
      // Better to trigger it similarly. But we can't easily trigger the handleDivineSmite from here.
      // We will do what handleDivineSmite does:
      store.setDivineSmiteCooldown(15);
      const enemies = Object.values(store.units).filter((u) => u.team === 'enemy');
      for (const u of enemies) {
        store.damageUnit(u.id, 250);
      }
      store.triggerCameraShake(0.9);
      // Let's assume audio is played via AudioBridge since AudioBridge can listen, but AudioBridge doesn't do smite.
      // We can't import playSmiteSound here without Tone.js. Wait, we can.
    }

    this.status = YUKA.Goal.STATUS.COMPLETED;
    return this.status;
  }

  terminate() {}
}

class SmiteGoalEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  calculateDesirability() {
    const store = useGameStore.getState();
    if (store.phase !== 'defend' || store.divineSmiteCooldown > 0) return 0.0;

    // Cluster density check
    const enemies = Object.values(store.units).filter((u) => u.team === 'enemy');
    if (enemies.length > 5) return 4.0; // Very desirable to smite 6+ enemies

    return 0.0;
  }

  setGoal(owner: YUKA.GameEntity) {
    (owner as PlayerGovernorBrain).addSubgoal(new SmiteGoal(owner));
  }
}

class StartWaveGoal extends YUKA.Goal {
  constructor(owner: YUKA.GameEntity) {
    super(owner);
  }

  activate() {
    this.status = YUKA.Goal.STATUS.ACTIVE;
  }

  process() {
    const store = useGameStore.getState();
    if (store.phase === 'build') {
      store.setTriggerWave(true);
    }
    this.status = YUKA.Goal.STATUS.COMPLETED;
    return this.status;
  }

  terminate() {}
}

class StartWaveEvaluator extends YUKA.GoalEvaluator<YUKA.GameEntity> {
  calculateDesirability() {
    const store = useGameStore.getState();
    if (store.phase !== 'build') return 0.0;

    // Desirable if we can't afford a wall, or if there is simply nowhere to put one
    if (store.gold < BUILDING_COST['wall'] || !hasBuildSlot(store, 'wall')) {
      return 0.8;
    }
    return 0.0;
  }

  setGoal(owner: YUKA.GameEntity) {
    (owner as PlayerGovernorBrain).addSubgoal(new StartWaveGoal(owner));
  }
}
