import {
  applySeparation,
  distance2D,
  findTarget,
  getWaveEnemyTypes,
  scaleEnemyHp,
} from '../../engine/combatLogic';
import type { Entity, Vector3Data } from '../../engine/constants';
import { UNIT_STATS } from '../../engine/constants';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeEntity(overrides: Partial<Entity> & { id: string }): Entity {
  return {
    type: 'militia',
    team: 'ally',
    maxHp: 40,
    hp: 40,
    damage: 10,
    speed: 2.5,
    attackRange: 5.0,
    attackSpeed: 1.0,
    cooldown: 0,
    position: { x: 0, y: 0, z: 0 },
    targetId: null,
    pathIndex: 0,
    isHealer: false,
    ...overrides,
  };
}

// ── distance2D ───────────────────────────────────────────────────────────────

describe('distance2D', () => {
  it('returns 0 for same position', () => {
    const p: Vector3Data = { x: 3, y: 5, z: 7 };
    expect(distance2D(p, p)).toBe(0);
  });

  it('computes correct distance on X axis', () => {
    const a: Vector3Data = { x: 0, y: 0, z: 0 };
    const b: Vector3Data = { x: 3, y: 0, z: 4 };
    expect(distance2D(a, b)).toBe(5); // 3-4-5 triangle
  });

  it('ignores Y component', () => {
    const a: Vector3Data = { x: 0, y: 0, z: 0 };
    const b: Vector3Data = { x: 3, y: 100, z: 4 };
    expect(distance2D(a, b)).toBe(5);
  });

  it('is symmetric', () => {
    const a: Vector3Data = { x: 1, y: 0, z: 2 };
    const b: Vector3Data = { x: 4, y: 0, z: 6 };
    expect(distance2D(a, b)).toBe(distance2D(b, a));
  });
});

// ── findTarget ───────────────────────────────────────────────────────────────

describe('findTarget', () => {
  it('returns null when no enemies in range', () => {
    const unit = makeEntity({ id: 'a1', team: 'ally', attackRange: 2 });
    const far = makeEntity({
      id: 'e1',
      team: 'enemy',
      position: { x: 100, y: 0, z: 100 },
    });
    expect(findTarget(unit, [unit, far])).toBeNull();
  });

  it('picks closest enemy in range', () => {
    const unit = makeEntity({ id: 'a1', team: 'ally', attackRange: 10 });
    const near = makeEntity({
      id: 'e1',
      team: 'enemy',
      position: { x: 2, y: 0, z: 0 },
    });
    const farther = makeEntity({
      id: 'e2',
      team: 'enemy',
      position: { x: 5, y: 0, z: 0 },
    });
    expect(findTarget(unit, [unit, near, farther])).toBe(near);
  });

  it('ignores dead enemies', () => {
    const unit = makeEntity({ id: 'a1', team: 'ally', attackRange: 10 });
    const dead = makeEntity({
      id: 'e1',
      team: 'enemy',
      hp: 0,
      position: { x: 1, y: 0, z: 0 },
    });
    expect(findTarget(unit, [unit, dead])).toBeNull();
  });

  it('does not target itself', () => {
    const unit = makeEntity({ id: 'a1', team: 'enemy', attackRange: 10 });
    expect(findTarget(unit, [unit])).toBeNull();
  });

  describe('healer targeting', () => {
    it('picks lowest-ratio ally', () => {
      const healer = makeEntity({
        id: 'h1',
        team: 'ally',
        isHealer: true,
        attackRange: 10,
        damage: -15,
      });
      const hurt = makeEntity({ id: 'a1', team: 'ally', hp: 10, maxHp: 40 });
      const lessHurt = makeEntity({ id: 'a2', team: 'ally', hp: 30, maxHp: 40 });
      expect(findTarget(healer, [healer, hurt, lessHurt])).toBe(hurt);
    });

    it('returns null when all allies at full hp', () => {
      const healer = makeEntity({
        id: 'h1',
        team: 'ally',
        isHealer: true,
        attackRange: 10,
      });
      const full = makeEntity({ id: 'a1', team: 'ally', hp: 40, maxHp: 40 });
      expect(findTarget(healer, [healer, full])).toBeNull();
    });

    it('ignores allies out of range', () => {
      const healer = makeEntity({
        id: 'h1',
        team: 'ally',
        isHealer: true,
        attackRange: 2,
      });
      const farHurt = makeEntity({
        id: 'a1',
        team: 'ally',
        hp: 10,
        maxHp: 40,
        position: { x: 50, y: 0, z: 0 },
      });
      expect(findTarget(healer, [healer, farHurt])).toBeNull();
    });
  });

  describe('enemy wall priority', () => {
    it('enemy targets ally wall within 1.5 before others', () => {
      const enemy = makeEntity({
        id: 'e1',
        team: 'enemy',
        attackRange: 10,
        position: { x: 0, y: 0, z: 0 },
      });
      const wall = makeEntity({
        id: 'w1',
        team: 'ally',
        type: 'wall',
        position: { x: 1, y: 0, z: 0 },
      });
      const militia = makeEntity({
        id: 'a1',
        team: 'ally',
        type: 'militia',
        position: { x: 0.5, y: 0, z: 0 },
      });
      const result = findTarget(enemy, [enemy, wall, militia]);
      expect(result?.id).toBe('w1');
    });

    it('ignores walls beyond 1.5 distance', () => {
      const enemy = makeEntity({
        id: 'e1',
        team: 'enemy',
        attackRange: 10,
        position: { x: 0, y: 0, z: 0 },
      });
      const farWall = makeEntity({
        id: 'w1',
        team: 'ally',
        type: 'wall',
        position: { x: 5, y: 0, z: 0 },
      });
      const militia = makeEntity({
        id: 'a1',
        team: 'ally',
        type: 'militia',
        position: { x: 3, y: 0, z: 0 },
      });
      const result = findTarget(enemy, [enemy, farWall, militia]);
      expect(result?.id).toBe('a1');
    });
  });
});

// ── applySeparation ──────────────────────────────────────────────────────────

describe('applySeparation', () => {
  it('returns zero force when no others nearby', () => {
    const unit = makeEntity({ id: 'a1', position: { x: 0, y: 0, z: 0 } });
    const other = makeEntity({ id: 'a2', position: { x: 100, y: 0, z: 100 } });
    const force = applySeparation(unit, [unit, other]);
    expect(force.x).toBe(0);
    expect(force.z).toBe(0);
    expect(force.y).toBe(0);
  });

  it('pushes units apart when close', () => {
    const unit = makeEntity({ id: 'a1', position: { x: 0, y: 0, z: 0 } });
    const other = makeEntity({ id: 'a2', position: { x: 0.5, y: 0, z: 0 } });
    const force = applySeparation(unit, [unit, other]);
    // Should push unit to the left (negative x)
    expect(force.x).toBeLessThan(0);
  });

  it('y component is always zero', () => {
    const unit = makeEntity({ id: 'a1', position: { x: 0, y: 0, z: 0 } });
    const other = makeEntity({ id: 'a2', position: { x: 0.5, y: 10, z: 0.3 } });
    const force = applySeparation(unit, [unit, other]);
    expect(force.y).toBe(0);
  });

  it('stronger force when closer', () => {
    const unit = makeEntity({ id: 'a1', position: { x: 0, y: 0, z: 0 } });
    const close = makeEntity({ id: 'a2', position: { x: 0.3, y: 0, z: 0 } });
    const farther = makeEntity({ id: 'a3', position: { x: 0.8, y: 0, z: 0 } });

    const forceClose = applySeparation(unit, [unit, close]);
    const forceFar = applySeparation(unit, [unit, farther]);
    expect(Math.abs(forceClose.x)).toBeGreaterThan(Math.abs(forceFar.x));
  });

  it('custom separationRadius and strength work', () => {
    const unit = makeEntity({ id: 'a1', position: { x: 0, y: 0, z: 0 } });
    const other = makeEntity({ id: 'a2', position: { x: 1.5, y: 0, z: 0 } });
    // Default radius 1.2 → should be zero
    const f1 = applySeparation(unit, [unit, other], 1.2);
    expect(f1.x).toBe(0);
    // Radius 2.0 → should produce force
    const f2 = applySeparation(unit, [unit, other], 2.0);
    expect(f2.x).toBeLessThan(0);
  });
});

// ── scaleEnemyHp ─────────────────────────────────────────────────────────────

describe('scaleEnemyHp', () => {
  it('returns base hp at wave 0', () => {
    expect(scaleEnemyHp(100, 0)).toBe(100);
  });

  it('scales linearly with wave number', () => {
    // wave 1: 100 * (1 + 0.15) = 115
    expect(scaleEnemyHp(100, 1)).toBe(115);
    // wave 10: 100 * (1 + 10*0.15) = 250
    expect(scaleEnemyHp(100, 10)).toBe(250);
  });

  it('rounds to nearest integer', () => {
    // wave 1: 30 * 1.15 = 34.5 → rounds to 35
    expect(scaleEnemyHp(30, 1)).toBe(35);
  });

  it('works with goblin base stats', () => {
    const baseHp = UNIT_STATS.goblin.maxHp; // 30
    expect(scaleEnemyHp(baseHp, 0)).toBe(30);
    expect(scaleEnemyHp(baseHp, 5)).toBe(53); // 30 * 1.75 = 52.5 → 53
  });
});

// ── getWaveEnemyTypes ────────────────────────────────────────────────────────

describe('getWaveEnemyTypes', () => {
  it('wave 0 produces only goblins', () => {
    const pool = getWaveEnemyTypes(0);
    expect(pool.length).toBe(3); // 3 + 0
    expect(pool.every((t) => t === 'goblin')).toBe(true);
  });

  it('wave 1 produces 4 goblins', () => {
    const pool = getWaveEnemyTypes(1);
    expect(pool.length).toBe(4);
    expect(pool.every((t) => t === 'goblin')).toBe(true);
  });

  it('wave 3 includes orcs and goblins', () => {
    const pool = getWaveEnemyTypes(3);
    expect(pool.filter((t) => t === 'orc').length).toBe(2);
    expect(pool.filter((t) => t === 'goblin').length).toBe(5); // 2 + 3
  });

  it('wave 5 (boss wave) has boss + orcs + goblins', () => {
    const pool = getWaveEnemyTypes(5);
    expect(pool).toContain('boss');
    expect(pool.filter((t) => t === 'boss').length).toBe(1);
    expect(pool.filter((t) => t === 'orc').length).toBe(2);
    expect(pool.filter((t) => t === 'goblin').length).toBe(2);
  });

  it('wave 6 includes troll, orcs, and goblins', () => {
    const pool = getWaveEnemyTypes(6);
    expect(pool).toContain('troll');
    expect(pool.filter((t) => t === 'orc').length).toBe(2);
    expect(pool.filter((t) => t === 'goblin').length).toBe(6);
  });

  it('wave 10 (boss wave) starts with boss', () => {
    const pool = getWaveEnemyTypes(10);
    expect(pool[0]).toBe('boss');
  });

  it('count increases with wave number for early waves', () => {
    const w0 = getWaveEnemyTypes(0).length;
    const w2 = getWaveEnemyTypes(2).length;
    expect(w2).toBeGreaterThan(w0);
  });
});
