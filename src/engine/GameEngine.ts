/**
 * @module GameEngine
 *
 * Core simulation engine for the Grailguard tower-defense game. Built on
 * the Koota ECS framework with Yuka-based AI steering for unit movement.
 *
 * This module owns:
 * - **ECS trait definitions** (Position, Facing, Building, Unit, Projectile,
 *   Particle, FloatingText, WorldEffect, ResourceCart, GameSession, WaveState,
 *   AutosaveState, CodexId) that describe every entity in the world.
 * - **World lifecycle** -- creating, resetting, serializing, hydrating, and
 *   disposing the game world.
 * - **Simulation loop** -- wave spawning, unit AI, projectile tracking,
 *   building production, logistics carts, particle physics, and combat.
 * - **Player commands** -- building placement/selling/upgrading, spell
 *   casting, wave control, targeting, and game-speed toggling, all funnelled
 *   through the {@link queueWorldCommand} dispatcher.
 *
 * The renderer (React Three Fiber) reads ECS data each frame but never
 * mutates it; all mutations flow through the functions exported here.
 */

import { createWorld, type Entity, trait } from 'koota';
import * as THREE from 'three';
import {
  EntityManager,
  FollowPathBehavior,
  Path,
  SeekBehavior,
  SeparationBehavior,
  Vehicle,
  Vector3 as YukaVector3,
} from 'yuka';
import { generateRoadPoints } from './mapGenerator';
import { soundManager } from './SoundManager';

/** Yuka entity manager driving AI steering behaviors for all mobile units. */
export const yukaManager = new EntityManager();

/** Maps Koota entity IDs to their corresponding Yuka Vehicle instances. */
export const vehiclesByEntityId = new Map<number, Vehicle>();

import {
  BUILDINGS,
  type BuildingType,
  type EnemyAffix,
  type Faction,
  type GamePhase,
  UNITS,
  type UnitType,
} from './constants';

/** ECS trait storing an entity's world-space coordinates. */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** ECS trait storing an entity's Y-axis rotation (yaw) in radians. */
export const Facing = trait({ y: 0 });

/**
 * ECS trait for placed structures. Tracks the building type, upgrade levels
 * for its two branches (spawn rate and stat power), production/cooldown
 * timers, and turret targeting priority.
 */
export const Building = trait({
  type: 'hut' as BuildingType,
  levelSpawn: 1,
  levelStats: 1,
  timer: 0,
  cooldown: 0,
  targeting: 'first' as 'first' | 'strongest' | 'weakest',
});
/**
 * ECS trait for mobile combat entities (both allied and enemy). Contains the
 * unit's current combat stats (post-scaling), status effect timers (poison,
 * frozen, invulnerable, slowed), and pathfinding state.
 */
export const Unit = trait({
  type: 'militia' as UnitType,
  team: 'ally' as Faction,
  maxHp: 1,
  hp: 1,
  damage: 1,
  speed: 1,
  range: 1,
  atkSpd: 1,
  reward: 0,
  isRanged: false,
  isHealer: false,
  cooldown: 0,
  timeAlive: 0,
  pathIndex: 0,
  affix: undefined as EnemyAffix | undefined,
  poison: 0,
  frozen: 0,
  invulnerable: 0,
  slowed: 0,
});
/**
 * ECS trait for short-lived damage/heal numbers that rise above an entity
 * and fade out. Consumed by the renderer to draw billboard text sprites.
 */
export const FloatingText = trait({
  text: '',
  color: '#ffffff',
  life: 1,
  riseSpeed: 8,
});
/**
 * ECS trait for physics-driven particle effects (explosions, build sparkles,
 * death bursts). Each particle has a velocity vector and a lifetime that
 * counts down to zero, at which point the entity is destroyed.
 */
export const Particle = trait({
  color: '#ffffff',
  life: 1,
  size: 0.35,
  vx: 0,
  vy: 0,
  vz: 0,
});
/**
 * ECS trait for large-scale visual effects anchored to a world position
 * (e.g. smite ground rings, boss spawn shockwaves). The renderer uses
 * `life / maxLife` to animate scale and opacity.
 */
export const WorldEffect = trait({
  kind: 'smite' as 'smite' | 'boss_spawn',
  color: '#ffffff',
  life: 1,
  maxLife: 1,
  radius: 4,
});
/**
 * ECS trait for in-flight projectiles (arrows, magic bolts, catapult
 * boulders, heal orbs). Tracks the target entity ID, damage payload,
 * flight speed, and special flags for healing, poison, splash, and slow.
 */
export const Projectile = trait({
  targetId: 0 as number | string,
  damage: 0,
  speed: 10,
  color: '#ffffff',
  isHeal: false,
  isPoison: false,
  splashRadius: 0,
  isSlow: false,
});
/**
 * ECS trait that tags an entity with a codex identifier. When the codex
 * discovery system sees a new ID, it is added to the session's
 * `discoveredCodex` array for the bestiary/compendium UI.
 */
export const CodexId = trait({ id: '' });
/**
 * ECS singleton trait that tracks the autosave checkpoint status. The
 * persistence layer polls `dirty` to decide when to write a snapshot.
 */
export const AutosaveState = trait(() => ({
  dirty: false,
  reason: 'init',
  lastCheckpointAt: 0,
}));
/**
 * ECS singleton trait holding all top-level game state for the active run:
 * resources (gold, wood, ore, gem, faith), player health, wave number, game
 * phase, biome, difficulty, doctrines, relics, active spells and their
 * cooldowns, UI state (banner, camera shake, selection, placement preview),
 * and elapsed time tracking.
 */
export const GameSession = trait(() => ({
  runId: '',
  seed: '',
  mapSize: 100,
  gold: 300,
  wood: 50,
  ore: 0,
  gem: 0,
  faith: 100,
  health: 20,
  wave: 1,
  phase: 'build' as GamePhase,
  biome: 'kings-road',
  difficulty: 'pilgrim',
  doctrines: [] as { nodeId: string; level: number }[],
  relics: [] as string[],
  pendingRelicDraft: false,
  activeSpells: ['smite'] as string[],
  spellCooldowns: {} as Record<string, number>,
  discoveredCodex: [] as string[],
  gameSpeed: 1,
  buildTimeLeft: 30,
  cameraShake: 0,
  announcement: 'Build Phase',
  gameOver: false,
  earnedCoins: 0,
  totalKills: 0,
  elapsedMs: 0,
  bannerText: '',
  bannerTone: 'holy' as 'holy' | 'danger',
  bannerLife: 0,
  bannerMaxLife: 0,
  screenFlash: 0,
  screenFlashColor: '#facc15',
  selectedEntityId: -1,
  activePlacement: '' as '' | BuildingType,
  placementX: 0,
  placementY: 0,
  placementZ: 0,
  placementValid: false,
  roadPoints: [] as { x: number; y: number; z: number }[],
}));

/**
 * ECS trait for minecart entities that transport harvested resources along
 * track networks from extractors (lumber, ore mine, gem mine) to sinks
 * (sanctuary or mint). The cart follows a pre-computed BFS path of track
 * positions and delivers its payload on arrival.
 */
export const ResourceCart = trait(() => ({
  resource: 'wood' as 'wood' | 'ore' | 'gem',
  path: [] as { x: number; z: number }[],
  pathIndex: 0,
  targetId: 0,
}));

/**
 * ECS singleton trait managing the enemy spawn queue for the current wave.
 * During the defend phase, entries are popped off `spawnQueue` at intervals
 * controlled by `spawnTimer`.
 */
export const WaveState = trait(() => ({
  spawnQueue: [] as { type: UnitType; affix?: EnemyAffix }[],
  spawnTimer: 0,
}));

/** The single Koota ECS world instance. All entities live here. */
export const gameWorld = createWorld();

/** Smooth Catmull-Rom curve fitted through the road waypoints. */
export let roadSpline = new THREE.CatmullRomCurve3([new THREE.Vector3()]);

/** 120-point uniform sampling of {@link roadSpline}, used for distance checks and pathfinding. */
export let roadSamples: THREE.Vector3[] = [];

/** World position of the sanctuary (final road waypoint, typically the origin). */
export let sanctuaryPosition = new THREE.Vector3();

/** World position of the enemy spawn point (first road waypoint). */
export let spawnPosition = new THREE.Vector3();

/** Yuka `Path` derived from the road spline, consumed by enemy FollowPathBehavior. */
export const yukaRoadPath = new Path();

/**
 * Rebuilds the shared road geometry caches from an array of waypoints.
 * Updates {@link roadSpline}, {@link roadSamples}, {@link sanctuaryPosition},
 * {@link spawnPosition}, and the Yuka {@link yukaRoadPath}. Called during
 * world creation and when hydrating a saved snapshot.
 *
 * @param points - Ordered waypoints from spawn to sanctuary.
 */
export function updateMapData(points: { x: number; y: number; z: number }[]) {
  const vectors = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  roadSpline = new THREE.CatmullRomCurve3(vectors);
  roadSamples = roadSpline.getPoints(120);
  sanctuaryPosition = vectors[vectors.length - 1].clone();
  spawnPosition = vectors[0].clone();

  yukaRoadPath.clear();
  const subPoints = roadSpline.getPoints(50);
  for (const p of subPoints) {
    yukaRoadPath.add(new YukaVector3(p.x, 0, p.z));
  }
}

/**
 * Versioned snapshot of an active run's complete state, suitable for
 * serialization to JSON for autosave / checkpoint persistence. Contains
 * the session singleton, wave state, and full lists of buildings and units
 * with their positions.
 */
export interface ActiveRunSnapshotV1 {
  version: 1;
  session: SessionState;
  waveState: RuntimeState;
  buildings: Array<{
    type: BuildingType;
    levelSpawn: number;
    levelStats: number;
    timer: number;
    position: { x: number; y: number; z: number };
  }>;
  units: Array<{
    type: UnitType;
    team: Faction;
    maxHp: number;
    hp: number;
    damage: number;
    speed: number;
    range: number;
    atkSpd: number;
    reward: number;
    isRanged: boolean;
    isHealer: boolean;
    cooldown: number;
    timeAlive: number;
    pathIndex: number;
    affix?: EnemyAffix;
    poison: number;
    position: { x: number; y: number; z: number };
    facingY: number;
  }>;
}

/**
 * Discriminated union of every player-initiated mutation that can be applied
 * to the game world. UI code constructs one of these variants and passes it
 * to {@link queueWorldCommand}, which dispatches to the appropriate engine
 * function. This decouples the view layer from direct engine calls.
 */
export type WorldCommand =
  | { type: 'build'; buildingType: BuildingType; position: { x: number; y: number; z: number } }
  | { type: 'upgrade'; entityId: number; branch: 'spawn' | 'stats' }
  | { type: 'sellBuilding'; entityId: number }
  | { type: 'sellWall'; entityId: number }
  | { type: 'startWave' }
  | { type: 'skipBuildPhase' }
  | { type: 'castSpell'; spellId: string }
  | { type: 'toggleGameSpeed' }
  | { type: 'selectEntity'; entityId: number }
  | { type: 'clearSelection' }
  | { type: 'draftRelic'; relicId: string }
  | { type: 'setTargeting'; entityId: number; targeting: 'first' | 'strongest' | 'weakest' }
  | {
      type: 'setPlacementPreview';
      buildingType: BuildingType | null;
      preview: { x: number; y: number; z: number; valid: boolean } | null;
    };

type SessionState = NonNullable<ReturnType<typeof getSession>>;
type RuntimeState = NonNullable<ReturnType<typeof getWaveState>>;

function now() {
  return Date.now();
}

function createRunId() {
  return `run_${now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Reads the current {@link GameSession} singleton from the world.
 *
 * @returns The session state object, or `undefined` if the world has not
 *          been initialized.
 */
export function getSession() {
  return gameWorld.get(GameSession);
}

function getWaveState() {
  return gameWorld.get(WaveState);
}

function getAutosaveState() {
  return gameWorld.get(AutosaveState);
}

function setSession(patch: Partial<SessionState>) {
  gameWorld.set(GameSession, (current) => ({ ...current, ...patch }));
}

function setWaveState(patch: Partial<RuntimeState>) {
  gameWorld.set(WaveState, (current) => ({ ...current, ...patch }));
}

function setAutosaveState(patch: Partial<NonNullable<ReturnType<typeof getAutosaveState>>>) {
  gameWorld.set(AutosaveState, (current) => ({ ...current, ...patch }));
}

function markRunDirty(reason: string) {
  setAutosaveState({
    dirty: true,
    reason,
  });
}

function triggerBanner(
  text: string,
  tone: 'holy' | 'danger',
  duration: number,
  flash = 0,
  flashColor = tone === 'danger' ? '#ef4444' : '#facc15',
) {
  setSession({
    bannerText: text,
    bannerTone: tone,
    bannerLife: duration,
    bannerMaxLife: duration,
    screenFlash: flash,
    screenFlashColor: flashColor,
  });
}

function nowAnnouncement(session: SessionState) {
  if (session.gameOver) return 'The Grail is Lost';
  return session.phase === 'build' ? 'Build Phase' : 'Battle Phase';
}

function distance2D(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nearestRoadIndex(position: { x: number; z: number }) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < roadSamples.length; index += 1) {
    const point = roadSamples[index];
    const distance = distance2D(position, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function moveTowards(
  position: { x: number; z: number },
  target: { x: number; z: number },
  step: number,
) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const length = Math.hypot(dx, dz);
  if (length <= 0.001) return { x: position.x, z: position.z };
  const ratio = Math.min(1, step / length);
  return { x: position.x + dx * ratio, z: position.z + dz * ratio };
}

function calculateWaveBudget(wave: number) {
  return Math.floor(50 * 1.15 ** wave + 2 * wave * wave);
}

function calculateBuildTimer(wave: number) {
  return Math.floor(30 + 10 * Math.log(wave));
}

function buildWaveQueue(wave: number) {
  let budget = calculateWaveBudget(wave);
  const queue: { type: UnitType; affix?: EnemyAffix }[] = [];
  const possibleAffixes: EnemyAffix[] = ['armored', 'swift', 'regenerating', 'ranged'];

  if (wave % 5 === 0 && budget >= (UNITS.boss.cost ?? 0)) {
    queue.push({ type: 'boss' });
    budget -= UNITS.boss.cost ?? 0;
  }

  const pool: UnitType[] = ['troll', 'orc', 'goblin'];
  while (budget >= (UNITS.goblin.cost ?? 0)) {
    for (const type of pool) {
      const cost = UNITS[type].cost ?? 0;
      if (budget >= cost) {
        let affix: EnemyAffix | undefined;
        if (wave >= 6 && Math.random() < 0.2) {
          affix = possibleAffixes[Math.floor(Math.random() * possibleAffixes.length)];
        }
        queue.push({ type, affix });
        budget -= cost;
        break;
      }
    }
  }

  return queue;
}

function initializeWorldTraits() {
  gameWorld.add(GameSession, WaveState, AutosaveState);
}

function initialBuildPhase() {
  const session = getSession();
  if (!session) return;

  setWaveState({
    spawnQueue: buildWaveQueue(session.wave),
    spawnTimer: 0,
  });
  setSession({
    phase: 'build',
    buildTimeLeft: calculateBuildTimer(session.wave),
    announcement: 'Build Phase',
  });
  triggerBanner(`Prepare for Wave ${session.wave}`, 'holy', 2.4, 0.08, '#facc15');
}

function spawnScaledUnit(
  type: UnitType,
  team: Faction,
  position: { x: number; y: number; z: number },
  statMultiplier: number,
  affix?: EnemyAffix,
) {
  const config = UNITS[type];
  const session = getSession();
  if (!session) return undefined;

  const multiplier = (team === 'enemy' ? 1 + session.wave * 0.15 : 1) * statMultiplier;
  const ironVanguard = session.doctrines.find((d) => d.nodeId === 'iron_vanguard');
  const hpMultiplier =
    ironVanguard && team === 'ally' && !config.isRanged && !config.isHealer
      ? 1 + 0.1 * ironVanguard.level
      : 1;

  const entity = gameWorld.spawn(
    Unit({
      type,
      team,
      maxHp: config.hp * multiplier * hpMultiplier,
      hp: config.hp * multiplier * hpMultiplier,
      damage: config.damage * multiplier,
      speed: affix === 'swift' ? config.speed * 2 : config.speed,
      range: affix === 'ranged' ? 15 : config.range,
      atkSpd: affix === 'swift' ? config.atkSpd * 0.5 : config.atkSpd,
      reward: config.reward ?? 0,
      isRanged: affix === 'ranged' ? true : config.isRanged,
      isHealer: config.isHealer,
      cooldown: team === 'ally' && session.relics?.includes('war_horn') ? 0 : config.atkSpd || 0,
      timeAlive: 0,
      pathIndex:
        team === 'enemy' ? 0 : clamp(nearestRoadIndex(position), 1, roadSamples.length - 1),
      affix,
      poison: 0,
    }),
    Position(position),
    Facing({ y: 0 }),
    CodexId({ id: type }),
  );

  if (type !== 'wall') {
    const vehicle = new Vehicle();
    vehicle.position.set(position.x, 0, position.z);
    vehicle.maxSpeed = affix === 'swift' ? config.speed * 2 : config.speed;

    const followBehavior = new FollowPathBehavior(yukaRoadPath);
    followBehavior.active = team === 'enemy';
    vehicle.steering.add(followBehavior);

    if (team === 'ally') {
      vehicle.steering.add(new SeparationBehavior());
      vehicle.steering.add(new SeekBehavior(new YukaVector3()));
    }

    yukaManager.add(vehicle);
    vehiclesByEntityId.set(entity.id() as number, vehicle);
  }

  return entity;
}

function spawnFloatingText(
  position: { x: number; y: number; z: number },
  text: string,
  color: string,
  riseSpeed = 8,
) {
  gameWorld.spawn(
    FloatingText({
      text,
      color,
      life: 1,
      riseSpeed,
    }),
    Position({ x: position.x, y: position.y + 4, z: position.z }),
  );
}

function spawnParticleBurst(
  position: { x: number; y: number; z: number },
  color: string,
  count: number,
  intensity = 1,
) {
  for (let index = 0; index < count; index += 1) {
    gameWorld.spawn(
      Particle({
        color,
        life: 0.45 + Math.random() * 0.4,
        size: 0.15 + Math.random() * 0.28,
        vx: (Math.random() - 0.5) * 8 * intensity,
        vy: (4 + Math.random() * 7) * intensity,
        vz: (Math.random() - 0.5) * 8 * intensity,
      }),
      Position({ x: position.x, y: position.y + 1.5, z: position.z }),
    );
  }
}

function spawnWorldEffect(
  kind: 'smite' | 'boss_spawn',
  position: { x: number; y: number; z: number },
  color: string,
  radius: number,
  life: number,
) {
  gameWorld.spawn(
    WorldEffect({
      kind,
      color,
      life,
      maxLife: life,
      radius,
    }),
    Position(position),
  );
}

function applyDeltaToUnit(target: Entity, amount: number, showColor: string, labelPrefix = '') {
  const unit = target.get(Unit);
  const position = target.get(Position);
  if (!unit || !position) return;

  unit.hp -= amount;
  const magnitude = Math.round(Math.abs(amount));
  const sign = amount < 0 ? '+' : labelPrefix;
  spawnFloatingText(position, `${sign}${magnitude}`, showColor);
  spawnParticleBurst(position, showColor, amount < 0 ? 6 : 5, amount < 0 ? 0.85 : 1);
}

function damageSanctuary(amount: number) {
  const session = getSession();
  if (!session) return;

  const nextHealth = Math.max(0, session.health - amount);
  setSession({ health: nextHealth, cameraShake: 6 });
  spawnFloatingText(
    { x: sanctuaryPosition.x, y: 6, z: sanctuaryPosition.z },
    `-${amount}`,
    '#ef4444',
    5,
  );
  spawnParticleBurst({ x: sanctuaryPosition.x, y: 6, z: sanctuaryPosition.z }, '#ef4444', 16, 1.25);
  if (nextHealth <= 0) {
    soundManager.playGameOver();
    setSession({
      phase: 'game_over',
      announcement: 'The Grail is Lost',
      gameOver: true,
      earnedCoins: session.wave * 10,
    });
    markRunDirty('game_over');
  }
}

function destroyUnit(entity: Entity, rewardGold: boolean) {
  const unit = entity.get(Unit);
  const position = entity.get(Position);
  if (!unit) return;

  if (rewardGold && unit.team === 'enemy' && unit.reward > 0) {
    const session = getSession();
    if (session) {
      setSession({ gold: session.gold + unit.reward, totalKills: session.totalKills + 1 });
      if (position) {
        spawnFloatingText(position, `+${unit.reward}g`, '#facc15', 10);
        spawnParticleBurst(position, '#facc15', 8, 1);
      }
    }
  }

  if (position) {
    if (unit.team === 'enemy' && unit.affix === 'explosive') {
      spawnParticleBurst(position, '#f97316', 20, 1.5);
      for (const e of gameWorld.query(Unit, Position)) {
        const u = e.get(Unit);
        const p = e.get(Position);
        if (u && p && u.team === 'ally' && distance2D(position, p) <= 6) {
          applyDeltaToUnit(e, 50, '#f97316', '-');
        }
      }
    } else {
      spawnParticleBurst(
        position,
        unit.team === 'ally' ? '#a16207' : unit.type === 'boss' ? '#ef4444' : '#7f1d1d',
        unit.type === 'boss' ? 20 : 12,
        unit.type === 'boss' ? 1.5 : 1,
      );
    }
  }

  const vehicle = vehiclesByEntityId.get(entity.id() as number);
  if (vehicle) {
    yukaManager.remove(vehicle);
    vehiclesByEntityId.delete(entity.id() as number);
  }

  entity.destroy();
}

function findCombatTarget(entity: Entity) {
  const unit = entity.get(Unit);
  const position = entity.get(Position);
  if (!unit || !position) return undefined;

  let bestTarget: Entity | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  const searchRange = unit.isRanged ? 25 : 8;

  for (const candidate of gameWorld.query(Unit, Position)) {
    if (candidate === entity) continue;

    const candidateUnit = candidate.get(Unit);
    const candidatePosition = candidate.get(Position);
    if (!candidateUnit || !candidatePosition || candidateUnit.hp <= 0) continue;

    if (unit.isHealer) {
      if (candidateUnit.team !== 'ally' || candidateUnit.hp >= candidateUnit.maxHp) continue;
      const distance = distance2D(position, candidatePosition);
      if (distance <= unit.range && distance < bestDistance) {
        bestTarget = candidate;
        bestDistance = distance;
      }
      continue;
    }

    if (candidateUnit.team === unit.team) continue;
    const distance = distance2D(position, candidatePosition);

    if (unit.team === 'enemy' && candidateUnit.type === 'wall' && distance < 5) {
      bestTarget = candidate;
      bestDistance = distance;
      break;
    }

    if (distance <= searchRange && distance < bestDistance) {
      bestTarget = candidate;
      bestDistance = distance;
    }
  }

  return bestTarget;
}

function executeAttack(attacker: Entity, target: Entity) {
  const attackerUnit = attacker.get(Unit);
  const attackerPosition = attacker.get(Position);
  if (!attackerUnit || !attackerPosition) return;

  soundManager.playCombat();

  if (attackerUnit.type === 'boss') {
    setSession({ cameraShake: 5 });
    spawnParticleBurst(attackerPosition, '#f97316', 16, 1.4);
    for (const entity of gameWorld.query(Unit, Position)) {
      const candidate = entity.get(Unit);
      const candidatePosition = entity.get(Position);
      if (!candidate || !candidatePosition || candidate.team !== 'ally') continue;
      if (distance2D(attackerPosition, candidatePosition) < 8) {
        if (candidate.invulnerable > 0) continue;
        applyDeltaToUnit(entity, attackerUnit.damage, '#ef4444', '-');
      }
    }
    if (attackerUnit.affix === 'vampiric') {
      applyDeltaToUnit(attacker, -Math.floor(attackerUnit.damage * 0.5), '#4ade80');
    }
    return;
  }

  const defender = target.get(Unit);
  if (!defender) return;

  const isHeal = attackerUnit.isHealer || attackerUnit.damage < 0;
  const isMagic = isHeal || attackerUnit.type === 'cleric';
  const session = getSession();
  const isPoison =
    attackerUnit.type === 'archer' && session?.relics?.includes('venomous_fletching');

  if (attackerUnit.isRanged) {
    gameWorld.spawn(
      Position({ x: attackerPosition.x, y: attackerPosition.y + 1, z: attackerPosition.z }),
      Projectile({
        targetId: target.id() as number,
        damage: attackerUnit.damage,
        speed: 15,
        color: isHeal ? '#34d399' : isPoison ? '#10b981' : '#e2e8f0',
        isHeal,
        isPoison: isPoison ?? false,
      }),
    );
    return;
  }

  if (isHeal) {
    applyDeltaToUnit(target, attackerUnit.damage, '#4ade80');
    return;
  }

  if (defender.invulnerable > 0) {
    return;
  }

  const damage =
    defender.affix === 'armored' && !isMagic
      ? Math.max(1, Math.floor(attackerUnit.damage * 0.5))
      : attackerUnit.damage;
  applyDeltaToUnit(target, damage, '#fde047', '-');

  if (attackerUnit.affix === 'vampiric') {
    applyDeltaToUnit(attacker, -Math.floor(damage * 0.5), '#4ade80');
  }
}

function updateUnits(dt: number) {
  const unitEntities: Entity[] = [];
  for (const entity of gameWorld.query(Unit, Position)) {
    unitEntities.push(entity);
  }

  for (const entity of unitEntities) {
    const unit = entity.get(Unit);
    const position = entity.get(Position);
    const facing = entity.get(Facing);
    if (!unit || !position || !facing) continue;

    if (unit.poison > 0) {
      const pDmg = unit.poison * 0.2 * dt;
      unit.hp -= pDmg;
      unit.poison = Math.max(0, unit.poison - dt * 2);
      if (Math.random() < 0.1) spawnParticleBurst(position, '#10b981', 1, 0.5);
    }

    if (unit.affix === 'regenerating' && unit.hp < unit.maxHp && unit.hp > 0) {
      unit.hp = Math.min(unit.maxHp, unit.hp + 2 * dt);
    }

    if (unit.hp <= 0) {
      destroyUnit(entity, true);
      continue;
    }

    unit.timeAlive += dt;
    unit.cooldown -= dt;

    if (unit.frozen > 0) {
      unit.frozen -= dt;
      if (Math.random() < 0.1) spawnParticleBurst(position, '#38bdf8', 1, 0.5);
      const vehicle = vehiclesByEntityId.get(entity.id() as number);
      if (vehicle) vehicle.velocity.set(0, 0, 0);
      continue;
    }

    if (unit.type === 'wall') continue;

    const vehicle = vehiclesByEntityId.get(entity.id() as number);
    if (vehicle) {
      position.x = vehicle.position.x;
      position.z = vehicle.position.z;
      if (vehicle.velocity.squaredLength() > 0.001) {
        facing.y = Math.atan2(vehicle.velocity.x, vehicle.velocity.z);
      }
    }

    const target = findCombatTarget(entity);
    if (target) {
      const targetPosition = target.get(Position);
      if (!targetPosition) continue;

      const distance = distance2D(position, targetPosition);

      if (distance <= unit.range) {
        facing.y = Math.atan2(targetPosition.x - position.x, targetPosition.z - position.z);
        if (unit.cooldown <= 0) {
          executeAttack(entity, target);
          unit.cooldown = unit.atkSpd;
        }
        if (vehicle) vehicle.velocity.set(0, 0, 0);
      } else {
        if (vehicle) {
          let seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior) as
            | SeekBehavior
            | undefined;
          if (!seek) {
            seek = new SeekBehavior();
            vehicle.steering.add(seek);
          }
          seek.target.set(targetPosition.x, 0, targetPosition.z);
          seek.active = true;

          const follow = vehicle.steering.behaviors.find((b) => b instanceof FollowPathBehavior);
          if (follow) follow.active = false;
        }
      }
      continue;
    }

    if (vehicle) {
      if (unit.team === 'ally') {
        vehicle.velocity.set(0, 0, 0);
        const seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior);
        if (seek) seek.active = false;
      } else if (unit.team === 'enemy') {
        const follow = vehicle.steering.behaviors.find((b) => b instanceof FollowPathBehavior);
        if (follow) follow.active = true;
        const seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior);
        if (seek) seek.active = false;

        if (distance2D(position, sanctuaryPosition) < 6) {
          damageSanctuary(unit.type === 'boss' ? 5 : 1);
          destroyUnit(entity, false);
        }
      }
    }
  }
}

function updateBuildings(dt: number) {
  const session = getSession();
  if (!session || session.phase !== 'defend') return;

  // Faith generation
  if (session.health > 0) {
    // Arbitrary generation rate: +1 faith per second per 10 health
    const faithRate = (session.health / 10) * dt;
    setSession({ faith: session.faith + faithRate });
  }

  for (const entity of gameWorld.query(Building, Position)) {
    const building = entity.get(Building);
    const position = entity.get(Position);
    if (!building || !position) continue;

    const config = BUILDINGS[building.type];

    if (
      building.type === 'lumber' ||
      building.type === 'mine_ore' ||
      building.type === 'mine_gem'
    ) {
      building.timer -= dt;
      if (building.timer <= 0) {
        const resType =
          building.type === 'lumber' ? 'wood' : building.type === 'mine_ore' ? 'ore' : 'gem';
        const path = findLogisticsPath(position, resType);

        if (path) {
          gameWorld.spawn(
            ResourceCart({ resource: resType, path, pathIndex: 0, targetId: 0 }),
            Position({ x: position.x, y: position.y + 1, z: position.z }),
          );
        } else {
          spawnFloatingText(position, 'No Track!', '#ef4444', 5);
        }
        building.timer = config.spawnTime;
      }
      continue;
    }

    if (building.type === 'vault') {
      building.timer -= dt;
      if (building.timer <= 0) {
        setSession({ gold: session.gold + 10 });
        spawnFloatingText(position, '+10g', '#facc15', 5);
        building.timer = config.spawnTime;
      }
      continue;
    }

    if (building.type === 'mint' || building.type === 'track') {
      // Passive buildings, no ticks needed
      continue;
    }

    if (config.isTurret) {
      building.cooldown -= dt;
      if (building.cooldown <= 0) {
        const range = config.range ?? 0;
        let bestTarget: Entity | null = null;
        let bestScore = -Infinity;

        for (const e of gameWorld.query(Unit, Position)) {
          const u = e.get(Unit);
          const p = e.get(Position);
          if (!u || !p || u.team !== 'enemy') continue;

          const dist = distance2D(position, p);
          if (dist <= range) {
            let score = 0;
            if (building.targeting === 'first') score = u.pathIndex;
            else if (building.targeting === 'strongest') score = u.hp;
            else if (building.targeting === 'weakest') score = -u.hp;

            if (score > bestScore) {
              bestScore = score;
              bestTarget = e;
            }
          }
        }

        if (bestTarget) {
          const hasCrystalLens =
            session.relics?.includes('crystal_lens') && building.type === 'obelisk';
          const damageMult = hasCrystalLens ? 1.5 : 1;
          const cdMult = hasCrystalLens ? 1.2 : 1;

          gameWorld.spawn(
            Position({ x: position.x, y: position.y + 2, z: position.z }),
            Projectile({
              targetId: bestTarget.id() as number,
              damage: (config.damage ?? 0) * 1.1 ** (building.levelStats - 1) * damageMult,
              speed: building.type === 'catapult' ? 15 : 25,
              color:
                config.color === 0xaaaaaa
                  ? '#e2e8f0'
                  : building.type === 'sorcerer'
                    ? '#3b82f6'
                    : building.type === 'catapult'
                      ? '#8b4513'
                      : '#a855f7',
              isHeal: false,
              isPoison: false,
              splashRadius: building.type === 'catapult' ? 5 : 0,
              isSlow: building.type === 'sorcerer',
            }),
          );
          building.cooldown = ((config.atkSpd ?? 1) / 1.1 ** (building.levelStats - 1)) * cdMult;
          soundManager.playCombat();
        }
      }
      continue;
    }

    if (config.unit) {
      building.timer -= dt;
      const spawnRate = config.spawnTime * 0.8 ** (building.levelSpawn - 1);
      if (building.timer <= 0) {
        spawnScaledUnit(config.unit, 'ally', position, 1.3 ** (building.levelStats - 1));
        building.timer = spawnRate;
      }
    }
  }
}

function updateWaveState(dt: number) {
  const session = getSession();
  const waveState = getWaveState();
  if (!session || !waveState || session.gameOver) return;

  if (session.cameraShake > 0) {
    setSession({ cameraShake: session.cameraShake * 0.9 > 0.1 ? session.cameraShake * 0.9 : 0 });
  }

  let updatedCooldowns = false;
  const newCooldowns = { ...session.spellCooldowns };
  for (const [spell, cd] of Object.entries(newCooldowns)) {
    if (cd > 0) {
      newCooldowns[spell] = Math.max(0, cd - dt);
      updatedCooldowns = true;
    }
  }
  if (updatedCooldowns) {
    setSession({ spellCooldowns: newCooldowns });
  }

  if (session.bannerLife > 0 || session.screenFlash > 0) {
    setSession({
      bannerLife: Math.max(0, session.bannerLife - dt),
      screenFlash: Math.max(0, session.screenFlash - dt * 1.8),
    });
  }

  if (session.phase === 'build') {
    if (session.pendingRelicDraft) return;
    const nextTime = session.buildTimeLeft - dt;
    if (nextTime <= 0) {
      startWave();
    } else {
      setSession({ buildTimeLeft: nextTime });
    }
    return;
  }

  if (session.phase !== 'defend') return;

  const nextSpawnTimer = waveState.spawnTimer - dt;
  if (nextSpawnTimer <= 0 && waveState.spawnQueue.length > 0) {
    const [next, ...rest] = waveState.spawnQueue;
    spawnScaledUnit(
      next.type,
      'enemy',
      { x: spawnPosition.x, y: 0.5, z: spawnPosition.z },
      1,
      next.affix,
    );
    if (next.type === 'boss') {
      triggerBanner('Boss Approaches', 'danger', 2.8, 0.22, '#ef4444');
      spawnWorldEffect(
        'boss_spawn',
        { x: spawnPosition.x, y: 0.3, z: spawnPosition.z },
        '#ef4444',
        10,
        1.6,
      );
      spawnParticleBurst({ x: spawnPosition.x, y: 1.5, z: spawnPosition.z }, '#ef4444', 24, 1.6);
    }
    setWaveState({ spawnQueue: rest, spawnTimer: 1 });
  } else {
    setWaveState({ spawnTimer: nextSpawnTimer });
  }

  let enemiesAlive = false;
  for (const entity of gameWorld.query(Unit)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      enemiesAlive = true;
      break;
    }
  }

  if (waveState.spawnQueue.length === 0 && !enemiesAlive) {
    cleanupAlliedWaveUnits();

    let interest = 0;
    if (session.relics?.includes('golden_age')) {
      interest = Math.floor(session.gold * 0.05);
    }

    const nextWave = session.wave + 1;
    if (nextWave > 20) {
      setSession({
        phase: 'game_over',
        announcement: 'Victory Achieved!',
        gameOver: true,
        earnedCoins: session.wave * 25,
      });
      soundManager.playGameOver();
      return;
    }

    setSession({
      gold: session.gold + 50 + session.wave * 10 + interest,
      wave: nextWave,
      pendingRelicDraft: session.wave % 5 === 0,
    });

    markRunDirty('wave_complete');
    initialBuildPhase();
  }
}

function updateFloatingTexts(dt: number) {
  const floatingTextEntities: Entity[] = [];
  for (const entity of gameWorld.query(FloatingText, Position)) {
    floatingTextEntities.push(entity);
  }

  for (const entity of floatingTextEntities) {
    const floatingText = entity.get(FloatingText);
    const position = entity.get(Position);
    if (!floatingText || !position) continue;

    floatingText.life -= dt;
    position.y += floatingText.riseSpeed * dt;

    if (floatingText.life <= 0) {
      entity.destroy();
    }
  }
}

function updateParticles(dt: number) {
  const particleEntities: Entity[] = [];
  for (const entity of gameWorld.query(Particle, Position)) {
    particleEntities.push(entity);
  }

  for (const entity of particleEntities) {
    const particle = entity.get(Particle);
    const position = entity.get(Position);
    if (!particle || !position) continue;

    particle.life -= dt;
    position.x += particle.vx * dt;
    position.y += particle.vy * dt;
    position.z += particle.vz * dt;
    particle.vy -= 18 * dt;
    particle.vx *= 0.96;
    particle.vz *= 0.96;

    if (particle.life <= 0) {
      entity.destroy();
    }
  }
}

function updateWorldEffects(dt: number) {
  const effectEntities: Entity[] = [];
  for (const entity of gameWorld.query(WorldEffect, Position)) {
    effectEntities.push(entity);
  }

  for (const entity of effectEntities) {
    const effect = entity.get(WorldEffect);
    if (!effect) continue;

    effect.life -= dt;
    if (effect.life <= 0) {
      entity.destroy();
    }
  }
}

function cleanupAlliedWaveUnits() {
  const toDestroy: Entity[] = [];
  for (const entity of gameWorld.query(Unit)) {
    const unit = entity.get(Unit);
    if (!unit) continue;
    if (unit.team === 'ally' && unit.type !== 'wall') {
      toDestroy.push(entity);
    }
  }

  for (const entity of toDestroy) {
    destroyUnit(entity, false);
  }
}

/**
 * Initializes a brand-new game run. Resets the ECS world, generates a
 * procedural road from the seed, applies doctrine bonuses to starting
 * resources and health, and enters the first build phase.
 *
 * @param options - Optional overrides for the run configuration.
 * @param options.preferredSpeed - Initial game speed multiplier (default 1).
 * @param options.biome - Map biome identifier (default `'kings-road'`).
 * @param options.difficulty - Difficulty tier (default `'pilgrim'`).
 * @param options.doctrines - Pre-selected doctrine upgrades from the metagame.
 * @param options.spells - Equipped spell IDs (default `['smite']`).
 * @param options.seed - Deterministic seed string for road generation.
 * @param options.mapSize - Side length of the square map (default 100).
 */
export function createRunWorld(options?: {
  preferredSpeed?: number;
  biome?: string;
  difficulty?: string;
  doctrines?: { nodeId: string; level: number }[];
  spells?: string[];
  seed?: string;
  mapSize?: number;
}) {
  gameWorld.reset();
  initializeWorldTraits();

  const doctrines = options?.doctrines ?? [];
  const activeSpells = options?.spells ?? ['smite'];

  const crownTithe = doctrines.find((d) => d.nodeId === 'crown_tithe');
  const faithward = doctrines.find((d) => d.nodeId === 'faithward');

  const startGold = 300 + (crownTithe ? 50 * crownTithe.level : 0);
  const startHealth = 20 + (faithward ? Math.floor(20 * 0.25 * faithward.level) : 0);

  const initialCooldowns: Record<string, number> = {};
  for (const spell of activeSpells) {
    initialCooldowns[spell] = 0;
  }

  const runId = createRunId();
  const seed = options?.seed || runId;
  const mapSize = options?.mapSize || 100;
  const roadVectors = generateRoadPoints(seed, mapSize);
  const rawRoadPoints = roadVectors.map((v) => ({ x: v.x, y: v.y, z: v.z }));
  updateMapData(rawRoadPoints);

  setSession({
    runId,
    seed,
    mapSize,
    gameSpeed: options?.preferredSpeed ?? 1,
    biome: options?.biome ?? 'kings-road',
    difficulty: options?.difficulty ?? 'pilgrim',
    doctrines,
    activeSpells,
    spellCooldowns: initialCooldowns,
    gold: startGold,
    wood: 50,
    ore: 0,
    gem: 0,
    faith: 100,
    health: startHealth,
    totalKills: 0,
    elapsedMs: 0,
    selectedEntityId: -1,
    activePlacement: '',
    placementValid: false,
    roadPoints: rawRoadPoints,
  });
  setAutosaveState({
    dirty: true,
    reason: 'create_run',
    lastCheckpointAt: 0,
  });
  initialBuildPhase();
}

/**
 * Convenience alias for {@link createRunWorld}. Tears down any existing run
 * and starts a fresh one with the given options.
 *
 * @param options - Same options accepted by {@link createRunWorld}.
 */
export function resetGameWorld(options?: {
  preferredSpeed?: number;
  biome?: string;
  difficulty?: string;
  doctrines?: { nodeId: string; level: number }[];
  spells?: string[];
  seed?: string;
  mapSize?: number;
}) {
  createRunWorld(options);
}

/**
 * Destroys all entities and resets the ECS world. Call this when the player
 * leaves a run or the component unmounts to free resources.
 */
export function disposeRunWorld() {
  gameWorld.reset();
}

function codexDiscoverySystem() {
  const session = getSession();
  if (!session) return;

  let changed = false;
  let newDiscovered = session.discoveredCodex;
  for (const entity of gameWorld.query(CodexId)) {
    const codex = entity.get(CodexId);
    if (codex && !newDiscovered.includes(codex.id)) {
      newDiscovered = [...newDiscovered, codex.id];
      changed = true;
    }
  }

  if (changed) {
    setSession({ discoveredCodex: newDiscovered });
  }
}

function updateProjectiles(dt: number) {
  for (const entity of gameWorld.query(Projectile, Position)) {
    const proj = entity.get(Projectile);
    const pos = entity.get(Position);
    if (!proj || !pos) continue;

    const targetIdNum =
      typeof proj.targetId === 'string' ? parseInt(proj.targetId, 10) : proj.targetId;
    const target = getEntityById(targetIdNum);

    if (!target) {
      entity.destroy();
      continue;
    }

    const targetPos = target.get(Position);
    if (!targetPos) {
      entity.destroy();
      continue;
    }

    const dist = distance2D(pos, targetPos);
    if (dist < 1.0) {
      if (proj.splashRadius && proj.splashRadius > 0) {
        const targetUnit = target.get(Unit);
        if (targetUnit) {
          for (const e of gameWorld.query(Unit, Position)) {
            const u = e.get(Unit);
            const p = e.get(Position);
            if (
              u &&
              p &&
              u.team === targetUnit.team &&
              distance2D(targetPos, p) <= (proj.splashRadius ?? 0)
            ) {
              applyDeltaToUnit(e, proj.damage, proj.color, proj.isHeal ? '' : '-');
            }
          }
          spawnParticleBurst(targetPos, proj.color, 12, 1.5);
        }
      } else {
        applyDeltaToUnit(target, proj.damage, proj.color, proj.isHeal ? '' : '-');
        const targetUnit = target.get(Unit);
        if (targetUnit) {
          if (proj.isPoison) {
            targetUnit.poison += 10;
          }
          if (proj.isSlow) {
            targetUnit.slowed = 3;
          }
        }
      }
      entity.destroy();
    } else {
      const moved = moveTowards(pos, targetPos, proj.speed * dt);
      pos.x = moved.x;
      pos.z = moved.z;
      pos.y += (targetPos.y + 0.5 - pos.y) * Math.min(1, (proj.speed * dt) / Math.max(0.1, dist));
    }
  }
}

function findLogisticsPath(
  startPos: { x: number; z: number },
  resourceType: string,
): { x: number; z: number }[] | null {
  const trackNodes = Array.from(gameWorld.query(Building, Position))
    .filter((e) => e.get(Building)?.type === 'track')
    .map((e) => {
      const p = e.get(Position);
      return { x: p?.x ?? 0, z: p?.z ?? 0 };
    });

  const sinks: { x: number; z: number }[] = [
    { x: Math.round(sanctuaryPosition.x / 5) * 5, z: Math.round(sanctuaryPosition.z / 5) * 5 },
  ];
  if (resourceType === 'ore') {
    const mints = Array.from(gameWorld.query(Building, Position))
      .filter((e) => e.get(Building)?.type === 'mint')
      .map((e) => {
        const p = e.get(Position);
        return { x: p?.x ?? 0, z: p?.z ?? 0 };
      });
    sinks.push(...mints);
  }

  const queue: { pos: { x: number; z: number }; path: { x: number; z: number }[] }[] = [];
  const visited = new Set<string>();

  // Find tracks adjacent to startPos
  for (const track of trackNodes) {
    if (distance2D(startPos, track) < 6) {
      queue.push({ pos: track, path: [track] });
      visited.add(`${track.x},${track.z}`);
    }
  }

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { pos, path } = item;

    // Check if adjacent to sink
    for (const sink of sinks) {
      if (distance2D(pos, sink) < 6) {
        return [...path, sink];
      }
    }

    // Traverse adjacent tracks
    for (const track of trackNodes) {
      const key = `${track.x},${track.z}`;
      if (!visited.has(key) && distance2D(pos, track) < 6) {
        visited.add(key);
        queue.push({ pos: track, path: [...path, track] });
      }
    }
  }

  return null; // No path to sink
}

function updateLogistics(dt: number) {
  const session = getSession();
  if (!session) return;

  const toDestroy: Entity[] = [];

  for (const entity of gameWorld.query(ResourceCart, Position)) {
    const cart = entity.get(ResourceCart);
    const pos = entity.get(Position);
    if (!cart || !pos) continue;

    if (cart.pathIndex >= cart.path.length) {
      toDestroy.push(entity);
      continue;
    }

    const target = cart.path[cart.pathIndex];
    const dist = distance2D(pos, target);

    if (dist < 0.5) {
      cart.pathIndex++;
      if (cart.pathIndex >= cart.path.length) {
        // Reached destination
        const isMint = cart.resource === 'ore' && distance2D(target, sanctuaryPosition) > 10;

        if (isMint) {
          setSession({ gold: session.gold + 15 });
          spawnFloatingText({ x: target.x, y: 3, z: target.z }, '+15g', '#facc15', 10);
        } else {
          if (cart.resource === 'wood') setSession({ wood: session.wood + 10 });
          if (cart.resource === 'ore') setSession({ ore: session.ore + 1 });
          if (cart.resource === 'gem')
            setSession({
              gem: session.gem + (session.relics?.includes('blessed_pickaxe') ? 2 : 1),
            });
        }
        toDestroy.push(entity);
      }
    } else {
      const speed = session.relics.includes('miners_lantern') ? 10 : 5;
      const moved = moveTowards(pos, target, speed * dt);
      pos.x = moved.x;
      pos.z = moved.z;
    }
  }

  for (const e of toDestroy) {
    e.destroy();
  }
}

/**
 * Advances the entire simulation by `dt` seconds. Runs all subsystems in
 * order: Yuka steering, wave/phase state, building production, logistics,
 * unit AI and combat, projectile tracking, floating text, particles, world
 * effects, and codex discovery.
 *
 * Typically called via {@link stepRunWorld} which applies game-speed scaling
 * and a delta-time cap.
 *
 * @param dt - Elapsed time in seconds since the last update.
 */
export function updateGameWorld(dt: number) {
  const session = getSession();
  if (!session || session.gameOver) return;

  yukaManager.update(dt);

  setSession({ elapsedMs: session.elapsedMs + dt * 1000 });

  updateWaveState(dt);
  updateBuildings(dt);
  updateLogistics(dt);
  updateUnits(dt);
  updateProjectiles(dt);
  updateFloatingTexts(dt);
  updateParticles(dt);
  updateWorldEffects(dt);
  codexDiscoverySystem();

  const latestSession = getSession();
  if (latestSession) {
    setSession({ announcement: nowAnnouncement(latestSession) });
  }
}

/**
 * Snaps a world position to the placement grid. Buildings are placed on a
 * 5-unit grid at a fixed Y of 1.5.
 *
 * @param position - Raw world-space position (e.g. from a raycast hit).
 * @returns Grid-aligned position suitable for building placement.
 */
export function snapPlacementPosition(position: { x: number; y: number; z: number }) {
  return {
    x: Math.round(position.x / 5) * 5,
    y: 1.5,
    z: Math.round(position.z / 5) * 5,
  };
}

function getRoadDistance(position: { x: number; z: number }) {
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const roadPoint of roadSamples) {
    const distance = distance2D(position, roadPoint);
    if (distance < closestDistance) {
      closestDistance = distance;
    }
  }
  return closestDistance;
}

function overlapsExistingStructure(type: BuildingType, position: { x: number; z: number }) {
  const allowedOverlaps: BuildingType[] = ['mine_ore', 'mine_gem', 'lumber', 'mint'];

  if (type !== 'track' && distance2D(position, sanctuaryPosition) < 5) {
    return true;
  }

  for (const entity of gameWorld.query(Building, Position)) {
    const building = entity.get(Building);
    const buildingPosition = entity.get(Position);
    if (buildingPosition && distance2D(position, buildingPosition) < 5) {
      if (type === 'track' && building && allowedOverlaps.includes(building.type)) {
        continue;
      }
      return true;
    }
  }

  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    const unitPosition = entity.get(Position);
    if (unit?.type === 'wall' && unitPosition && distance2D(position, unitPosition) < 5) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a building of the given type can legally be placed at the
 * specified grid position. Validates road proximity rules (walls must be on
 * the road, buildings must be off it, tracks are unconstrained), overlap
 * with existing structures or wall units, and game-over state.
 *
 * @param type - The building type to place.
 * @param position - Grid-snapped XZ position.
 * @returns `true` if placement is allowed.
 */
export function isPlacementValid(type: BuildingType, position: { x: number; z: number }) {
  const session = getSession();
  if (!session || session.gameOver) return false;

  const roadDistance = getRoadDistance(position);
  if (overlapsExistingStructure(type, position)) return false;

  if (type === 'track') return true;
  if (type === 'wall') return roadDistance <= 4;
  return roadDistance >= 7;
}

/**
 * Attempts to place a building of the given type at the specified position.
 * Deducts gold and wood costs (accounting for relic discounts), validates
 * placement, spawns the appropriate ECS entity (a {@link Unit} for walls,
 * a {@link Building} for everything else), and triggers build audio/VFX.
 *
 * @param type - The building type to construct.
 * @param position - World-space position (will be grid-snapped internally).
 * @returns `true` if the building was successfully placed, `false` if
 *          placement was invalid or the player lacks resources.
 */
export function buildStructure(type: BuildingType, position: { x: number; y: number; z: number }) {
  const session = getSession();
  if (!session || session.gameOver) return false;

  const config = BUILDINGS[type];
  let woodCost = config.woodCost ?? 0;
  if (type === 'track' && session.relics?.includes('iron_tracks')) {
    woodCost = 0;
  }
  if (session.gold < config.cost || session.wood < woodCost) return false;

  const snappedPosition = snapPlacementPosition(position);
  if (!isPlacementValid(type, snappedPosition)) return false;

  soundManager.playBuild();
  setSession({ gold: session.gold - config.cost, wood: session.wood - woodCost, cameraShake: 2 });
  markRunDirty('build_structure');
  spawnParticleBurst(snappedPosition, '#d4af37', 10, 0.85);

  const ironVanguard = session.doctrines.find((d) => d.nodeId === 'iron_vanguard');
  const hpMultiplier = ironVanguard ? 1 + 0.1 * ironVanguard.level : 1;

  if (type === 'wall') {
    gameWorld.spawn(
      Unit({
        type: 'wall',
        team: 'ally',
        maxHp: UNITS.wall.hp * hpMultiplier,
        hp: UNITS.wall.hp * hpMultiplier,
        damage: 0,
        speed: 0,
        range: 0,
        atkSpd: 99,
        reward: 0,
        isRanged: false,
        isHealer: false,
        cooldown: 0,
        timeAlive: 0,
        pathIndex: nearestRoadIndex(snappedPosition),
      }),
      Position(snappedPosition),
      Facing({ y: 0 }),
      CodexId({ id: 'wall' }),
    );
    return true;
  }

  gameWorld.spawn(
    Building({
      type,
      levelSpawn: 1,
      levelStats: 1,
      timer: config.spawnTime,
    }),
    Position(snappedPosition),
    CodexId({ id: type }),
  );

  return true;
}

export function upgradeBuilding(entity: Entity, branch: 'spawn' | 'stats') {
  const session = getSession();
  const building = entity.get(Building);
  if (!session || !building || session.gameOver) return false;

  if (branch === 'spawn') {
    const cost = 50 * building.levelSpawn;
    if (building.levelSpawn >= 5 || session.gold < cost) return false;
    building.levelSpawn += 1;
    setSession({ gold: session.gold - cost, cameraShake: 1.5 });
    markRunDirty('upgrade_spawn');
    return true;
  }

  const cost = 75 * building.levelStats;
  if (building.levelStats >= 5 || session.gold < cost) return false;
  building.levelStats += 1;
  setSession({ gold: session.gold - cost, cameraShake: 1.5 });
  markRunDirty('upgrade_stats');
  return true;
}

export function sellBuilding(entity: Entity) {
  const session = getSession();
  const building = entity.get(Building);
  if (!session || !building || session.gameOver) return false;

  const config = BUILDINGS[building.type];
  const sellValue = Math.floor(
    (config.cost + (building.levelSpawn - 1) * 50 + (building.levelStats - 1) * 75) * 0.5,
  );
  const woodValue = Math.floor((config.woodCost ?? 0) * 0.5);

  const position = entity.get(Position);
  const posClone = position ? { x: position.x, y: position.y, z: position.z } : null;

  entity.destroy();

  if (posClone) {
    spawnParticleBurst(posClone, '#64748b', 10, 0.9);
  }
  setSession({ gold: session.gold + sellValue, wood: session.wood + woodValue, cameraShake: 1 });
  markRunDirty('sell_building');
  return true;
}

export function sellWall(entity: Entity) {
  const session = getSession();
  const unit = entity.get(Unit);
  if (!session || !unit || unit.type !== 'wall' || session.gameOver) {
    return false;
  }

  const position = entity.get(Position);
  const posClone = position ? { x: position.x, y: position.y, z: position.z } : null;

  entity.destroy();

  if (posClone) {
    spawnParticleBurst(posClone, '#64748b', 8, 0.8);
  }
  setSession({
    wood: session.wood + Math.floor((BUILDINGS.wall.woodCost ?? 0) * 0.5),
    cameraShake: 1,
  });
  markRunDirty('sell_wall');
  return true;
}

/**
 * Returns the gold costs for upgrading a building's spawn-rate and stat
 * branches, plus its sell-back value (50% of total invested gold).
 *
 * @param entity - A Koota entity that has the {@link Building} trait.
 * @returns An object with `spawn`, `stats`, and `sell` costs, or `null`
 *          if the entity is not a building.
 */
export function getBuildingUpgradeCosts(entity: Entity) {
  const building = entity.get(Building);
  if (!building) return null;

  return {
    spawn: 50 * building.levelSpawn,
    stats: 75 * building.levelStats,
    sell: Math.floor(
      (BUILDINGS[building.type].cost +
        (building.levelSpawn - 1) * 50 +
        (building.levelStats - 1) * 75) *
        0.5,
    ),
  };
}

export function getSelectableEntityAtPosition(position: { x: number; z: number }) {
  const session = getSession();
  if (!session || session.phase !== 'build' || session.gameOver) return null;

  let bestEntity: Entity | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entity of gameWorld.query(Building, Position)) {
    const entityPosition = entity.get(Position);
    if (!entityPosition) continue;
    const distance = distance2D(position, entityPosition);
    if (distance < 5 && distance < bestDistance) {
      bestDistance = distance;
      bestEntity = entity;
    }
  }

  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    const entityPosition = entity.get(Position);
    if (!unit || unit.type !== 'wall' || !entityPosition) continue;
    const distance = distance2D(position, entityPosition);
    if (distance < 5 && distance < bestDistance) {
      bestDistance = distance;
      bestEntity = entity;
    }
  }

  return bestEntity;
}

export function startWave() {
  const session = getSession();
  if (!session || session.phase !== 'build') return;

  const earlyBonus = Math.max(0, Math.floor(session.buildTimeLeft * 2));
  const isBossWave = session.wave % 5 === 0;
  setSession({
    gold: session.gold + earlyBonus,
    phase: 'defend',
    buildTimeLeft: 0,
    announcement: 'Battle Phase',
  });
  setWaveState({ spawnTimer: 0.5 });
  markRunDirty('start_wave');
  triggerBanner(
    isBossWave ? `Boss Wave ${session.wave}` : `Wave ${session.wave} Begins`,
    isBossWave ? 'danger' : 'holy',
    isBossWave ? 2.8 : 2.2,
    isBossWave ? 0.16 : 0.1,
    isBossWave ? '#ef4444' : '#facc15',
  );
}

export function skipBuildPhase() {
  const session = getSession();
  if (!session || session.phase !== 'build') return;

  const earlyBonus = Math.max(0, Math.floor(session.buildTimeLeft * 2));
  setSession({
    gold: session.gold + earlyBonus,
    buildTimeLeft: 0,
  });
}

export function toggleGameSpeed() {
  const session = getSession();
  if (!session) return 1;

  const next = session.gameSpeed === 1 ? 1.5 : session.gameSpeed === 1.5 ? 2 : 1;
  setSession({ gameSpeed: next });
  return next;
}

export function castSpell(spellId: string) {
  if (spellId === 'smite') return castSmite();
  if (spellId === 'holy_nova') return castHolyNova();
  if (spellId === 'zealous_haste') return castZealousHaste();
  if (spellId === 'earthquake') return castEarthquake();
  if (spellId === 'chrono_shift') return castChronoShift();
  if (spellId === 'meteor_strike') return castMeteorStrike();
  if (spellId === 'divine_shield') return castDivineShield();
  return false;
}

export function castMeteorStrike() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['meteor_strike'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 35
  )
    return false;

  const enemyEntities: Entity[] = [];
  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      enemyEntities.push(entity);
    }
  }

  if (enemyEntities.length === 0) return false;

  const targetEnemy = [...enemyEntities].sort((left, right) => {
    const leftPosition = left.get(Position);
    const rightPosition = right.get(Position);
    if (!leftPosition || !rightPosition) return 0;
    return (
      distance2D(leftPosition, sanctuaryPosition) - distance2D(rightPosition, sanctuaryPosition)
    );
  })[0];

  const targetPosition = targetEnemy.get(Position);
  if (targetPosition) {
    for (const e of gameWorld.query(Unit, Position)) {
      const u = e.get(Unit);
      const p = e.get(Position);
      if (u && p && u.team === 'enemy' && distance2D(targetPosition, p) < 10) {
        applyDeltaToUnit(e, 400, '#ef4444', '-');
      }
    }
    spawnParticleBurst(targetPosition, '#ef4444', 30, 2.5);
    spawnWorldEffect('smite', targetPosition, '#ef4444', 15, 1.5);
  }

  triggerBanner('Meteor Strike', 'danger', 1.4, 0.24, '#ef4444');
  setSession({
    spellCooldowns: { ...session.spellCooldowns, meteor_strike: 25 },
    cameraShake: 8,
    faith: session.faith - 35,
  });
  markRunDirty('cast_spell');
  return true;
}

export function castDivineShield() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['divine_shield'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 40
  )
    return false;

  let shielded = false;
  for (const entity of gameWorld.query(Unit)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'ally') {
      unit.invulnerable = 5; // 5 seconds of invulnerability
      shielded = true;
    }
  }

  if (shielded) {
    triggerBanner('Divine Shield', 'holy', 1.4, 0.24, '#3b82f6');
    setSession({
      spellCooldowns: { ...session.spellCooldowns, divine_shield: 30 },
      faith: session.faith - 40,
    });
    markRunDirty('cast_spell');
    return true;
  }
  return false;
}

export function castChronoShift() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['chrono_shift'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 50
  )
    return false;

  let frozen = false;
  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      unit.frozen += 4;
      frozen = true;
    }
  }

  if (frozen) {
    triggerBanner('Chrono Shift', 'holy', 1.4, 0.24, '#38bdf8');
    setSession({
      spellCooldowns: { ...session.spellCooldowns, chrono_shift: 30 },
      faith: session.faith - 50,
    });
    markRunDirty('cast_spell');
    return true;
  }
  return false;
}

export function castHolyNova() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['holy_nova'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 25
  )
    return false;

  let healed = false;
  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'ally' && unit.type !== 'wall') {
      applyDeltaToUnit(entity, -50, '#4ade80');
      healed = true;
    }
  }

  if (healed) {
    triggerBanner('Holy Nova', 'holy', 1.4, 0.24, '#4ade80');
    setSession({
      spellCooldowns: { ...session.spellCooldowns, holy_nova: 20 },
      faith: session.faith - 25,
    });
    markRunDirty('cast_spell');
    return true;
  }
  return false;
}
export function castZealousHaste() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['zealous_haste'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 25
  )
    return false;

  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'ally') {
      unit.cooldown = 0; // immediate attack
    }
  }

  triggerBanner('Zealous Haste', 'holy', 1.4, 0.24, '#fde047');
  setSession({
    spellCooldowns: { ...session.spellCooldowns, zealous_haste: 30 },
    faith: session.faith - 25,
  });
  markRunDirty('cast_spell');
  return true;
}

export function castEarthquake() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['earthquake'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 25
  )
    return false;

  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      applyDeltaToUnit(entity, 20, '#f97316', '-');
      // simple stun representation
      unit.cooldown += 3;
    }
  }

  triggerBanner('Earthquake', 'danger', 1.4, 0.24, '#f97316');
  setSession({
    spellCooldowns: { ...session.spellCooldowns, earthquake: 25 },
    cameraShake: 8,
    faith: session.faith - 25,
  });
  markRunDirty('cast_spell');
  return true;
}

export function castSmite() {
  const session = getSession();
  if (
    !session ||
    (session.spellCooldowns['smite'] ?? 0) > 0 ||
    session.gameOver ||
    session.faith < 25
  )
    return false;

  const enemyEntities: Entity[] = [];
  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      enemyEntities.push(entity);
    }
  }

  if (enemyEntities.length === 0) return false;

  const prioritizedEnemies = enemyEntities
    .sort((left, right) => {
      const leftPosition = left.get(Position);
      const rightPosition = right.get(Position);
      if (!leftPosition || !rightPosition) return 0;
      return (
        distance2D(leftPosition, sanctuaryPosition) - distance2D(rightPosition, sanctuaryPosition)
      );
    })
    .slice(0, 3);

  for (const entity of prioritizedEnemies) {
    const unit = entity.get(Unit);
    if (unit) {
      unit.hp -= 300;
    }
  }

  if (prioritizedEnemies[0]) {
    const hitPosition = prioritizedEnemies[0].get(Position);
    if (hitPosition) {
      spawnParticleBurst(hitPosition, '#facc15', 18, 1.6);
      spawnWorldEffect(
        'smite',
        { x: hitPosition.x, y: 0.2, z: hitPosition.z },
        '#facc15',
        12,
        0.75,
      );
    }
  }

  triggerBanner('Divine Smite', 'holy', 1.4, 0.24, '#fde68a');
  setSession({
    spellCooldowns: { ...session.spellCooldowns, smite: 15 },
    cameraShake: 4,
    faith: session.faith - 25,
  });
  markRunDirty('cast_smite');
  return true;
}

function getEntityById(entityId: number) {
  for (const entity of gameWorld.query(Position)) {
    if (entity.id() === entityId) return entity;
  }
  return null;
}

/**
 * Serializes the current game world into an {@link ActiveRunSnapshotV1}
 * plain object suitable for JSON persistence. Captures the session
 * singleton, wave state, and every building/unit entity with its position.
 *
 * @returns A version-1 snapshot of the active run.
 * @throws If the world has not been initialized (no session or wave state).
 *
 * @example
 * ```ts
 * const snap = serializeRunWorld();
 * localStorage.setItem('autosave', JSON.stringify(snap));
 * ```
 */
export function serializeRunWorld(): ActiveRunSnapshotV1 {
  const session = getSession();
  const waveState = getWaveState();
  if (!session || !waveState) {
    throw new Error('Cannot serialize an uninitialized run world.');
  }

  const buildings = Array.from(gameWorld.query(Building, Position)).flatMap((entity) => {
    const building = entity.get(Building);
    const position = entity.get(Position);
    if (!building || !position) return [];
    return [
      {
        type: building.type,
        levelSpawn: building.levelSpawn,
        levelStats: building.levelStats,
        timer: building.timer,
        position: { x: position.x, y: position.y, z: position.z },
      },
    ];
  });

  const units = Array.from(gameWorld.query(Unit, Position, Facing)).flatMap((entity) => {
    const unit = entity.get(Unit);
    const position = entity.get(Position);
    const facing = entity.get(Facing);
    if (!unit || !position || !facing) return [];
    return [
      {
        type: unit.type,
        team: unit.team,
        maxHp: unit.maxHp,
        hp: unit.hp,
        damage: unit.damage,
        speed: unit.speed,
        range: unit.range,
        atkSpd: unit.atkSpd,
        reward: unit.reward,
        isRanged: unit.isRanged,
        isHealer: unit.isHealer,
        cooldown: unit.cooldown,
        timeAlive: unit.timeAlive,
        pathIndex: unit.pathIndex,
        affix: unit.affix,
        poison: unit.poison,
        position: { x: position.x, y: position.y, z: position.z },
        facingY: facing.y,
      },
    ];
  });

  return {
    version: 1,
    session: { ...session },
    waveState: { ...waveState },
    buildings,
    units,
  };
}

/**
 * Restores a game world from a previously serialized snapshot. Resets the
 * ECS world, re-applies session and wave state, rebuilds the road geometry,
 * and re-spawns all building and unit entities including their Yuka steering
 * vehicles.
 *
 * @param snapshot - A version-1 snapshot (e.g. from {@link serializeRunWorld}).
 * @throws If the snapshot version is not `1`.
 */
export function hydrateRunWorld(snapshot: ActiveRunSnapshotV1) {
  if (snapshot.version !== 1) {
    throw new Error(`Unsupported run snapshot version: ${snapshot.version}`);
  }

  gameWorld.reset();
  initializeWorldTraits();
  setSession({ ...snapshot.session });
  setWaveState({ ...snapshot.waveState });
  if (snapshot.session.roadPoints) {
    updateMapData(snapshot.session.roadPoints);
  }
  setAutosaveState({
    dirty: false,
    reason: 'hydrate_run',
    lastCheckpointAt: now(),
  });

  for (const building of snapshot.buildings) {
    gameWorld.spawn(
      Building({
        type: building.type,
        levelSpawn: building.levelSpawn,
        levelStats: building.levelStats,
        timer: building.timer,
      }),
      Position(building.position),
    );
  }

  for (const unit of snapshot.units) {
    const entity = gameWorld.spawn(
      Unit({
        type: unit.type,
        team: unit.team,
        maxHp: unit.maxHp,
        hp: unit.hp,
        damage: unit.damage,
        speed: unit.speed,
        range: unit.range,
        atkSpd: unit.atkSpd,
        reward: unit.reward,
        isRanged: unit.isRanged,
        isHealer: unit.isHealer,
        cooldown: unit.cooldown,
        timeAlive: unit.timeAlive,
        pathIndex: unit.pathIndex,
        affix: unit.affix,
        poison: unit.poison ?? 0,
      }),
      Position(unit.position),
      Facing({ y: unit.facingY }),
    );

    if (unit.type !== 'wall') {
      const config = UNITS[unit.type];
      const vehicle = new Vehicle();
      vehicle.maxSpeed = unit.affix === 'swift' ? config.speed * 2 : config.speed;
      vehicle.position.copy(new YukaVector3(unit.position.x, unit.position.y, unit.position.z));
      vehicle.boundingRadius = 1;

      if (unit.team === 'enemy') {
        const pathBehavior = new FollowPathBehavior(yukaRoadPath, 1.5);
        pathBehavior.active = true;
        vehicle.steering.add(pathBehavior);
      } else {
        const reversePath = new Path();
        const waypoints =
          (yukaRoadPath as unknown as { _waypoints?: YukaVector3[] })._waypoints || [];
        for (const wp of [...waypoints].reverse()) {
          reversePath.add(wp);
        }
        const advBehavior = new FollowPathBehavior(reversePath, 1.5);
        vehicle.steering.add(advBehavior);

        const separation = new SeparationBehavior();
        separation.weight = 2.0;
        vehicle.steering.add(separation);

        const seek = new SeekBehavior();
        seek.active = false;
        vehicle.steering.add(seek);
      }

      yukaManager.add(vehicle);
      vehiclesByEntityId.set(entity.id() as number, vehicle);
    }
  }
}

export function checkpointRun(reason: string) {
  const snapshot = serializeRunWorld();
  setAutosaveState({
    dirty: false,
    reason,
    lastCheckpointAt: now(),
  });
  return snapshot;
}

export function finalizeRun(result: 'defeat' | 'abandoned') {
  const session = getSession();
  if (!session) {
    throw new Error('Cannot finalize an uninitialized run.');
  }

  return {
    runId: session.runId,
    waveReached: session.wave,
    earnedCoins: session.earnedCoins,
    kills: session.totalKills,
    durationMs: Math.round(session.elapsedMs),
    biome: session.biome,
    difficulty: session.difficulty,
    result,
  };
}

/**
 * Top-level frame tick intended to be called from the render loop. Applies
 * the player's game-speed multiplier (1x / 1.5x / 2x) and clamps the
 * effective delta to 100 ms to prevent physics explosions after tab
 * backgrounding.
 *
 * @param dt - Raw wall-clock delta in seconds since the last frame.
 */
export function stepRunWorld(dt: number) {
  const speed = getSession()?.gameSpeed ?? 1;
  updateGameWorld(Math.min(dt, 0.1) * speed);
}

export function draftRelic(relicId: string) {
  const session = getSession();
  if (!session || !session.pendingRelicDraft) return false;

  const newRelics = [...(session.relics || []), relicId];
  setSession({ relics: newRelics, pendingRelicDraft: false });
  markRunDirty('draft_relic');
  return true;
}

/**
 * Central command dispatcher. The UI layer calls this with a
 * {@link WorldCommand} discriminated union, and this function routes to the
 * appropriate engine mutation (build, upgrade, sell, spell cast, wave
 * control, selection, etc.).
 *
 * @param command - The player-initiated command to execute.
 * @returns `true` if the command was successfully applied, `false` otherwise
 *          (e.g. insufficient resources, invalid target).
 */
export function queueWorldCommand(command: WorldCommand) {
  switch (command.type) {
    case 'build':
      return buildStructure(command.buildingType, command.position);
    case 'upgrade': {
      const entity = getEntityById(command.entityId);
      return entity ? upgradeBuilding(entity, command.branch) : false;
    }
    case 'sellBuilding': {
      const entity = getEntityById(command.entityId);
      return entity ? sellBuilding(entity) : false;
    }
    case 'sellWall': {
      const entity = getEntityById(command.entityId);
      return entity ? sellWall(entity) : false;
    }
    case 'startWave':
      startWave();
      return true;
    case 'skipBuildPhase':
      skipBuildPhase();
      return true;
    case 'draftRelic':
      return draftRelic(command.relicId);
    case 'setTargeting': {
      const entity = getEntityById(command.entityId);
      const building = entity?.get(Building);
      if (building) {
        building.targeting = command.targeting;
        markRunDirty('set_targeting');
        return true;
      }
      return false;
    }
    case 'castSpell':
      return castSpell(command.spellId);
    case 'toggleGameSpeed':
      toggleGameSpeed();
      return true;
    case 'selectEntity':
      setSession({ selectedEntityId: command.entityId });
      markRunDirty('select_entity');
      return true;
    case 'clearSelection':
      setSession({ selectedEntityId: -1 });
      markRunDirty('clear_selection');
      return true;
    case 'setPlacementPreview':
      setSession({
        activePlacement: command.buildingType ?? '',
        placementX: command.preview?.x ?? 0,
        placementY: command.preview?.y ?? 0,
        placementZ: command.preview?.z ?? 0,
        placementValid: command.preview?.valid ?? false,
      });
      markRunDirty('set_placement_preview');
      return true;
  }
}

export function getSessionSummary() {
  const session = getSession();
  if (!session) return null;
  return {
    runId: session.runId,
    phase: session.phase,
    wave: session.wave,
    biome: session.biome,
    gameOver: session.gameOver,
    totalKills: session.totalKills,
    elapsedMs: session.elapsedMs,
    gold: session.gold,
    health: session.health,
  };
}

export function getAutosaveSummary() {
  return getAutosaveState();
}
