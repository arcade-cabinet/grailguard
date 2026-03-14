/**
 * @module GameEngine
 *
 * Core simulation engine for the Grailguard tower-defense game. Built on
 * the Koota ECS framework with Yuka-based AI steering for unit movement.
 *
 * This module owns:
 * - **ECS trait definitions** that describe every entity in the world.
 * - **World lifecycle** -- creating, resetting, serializing, hydrating, and
 *   disposing the game world.
 * - **System orchestration** -- delegates to pure subsystem functions and
 *   applies their results to the ECS world.
 * - **Player commands** -- all funnelled through {@link queueWorldCommand}.
 *
 * All simulation logic lives in pure modules under `src/engine/systems/`.
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
import combatConfig from '../data/combatConfig.json';
import waveConfig from '../data/waveConfig.json';
import { audioBus } from './audio/audioBridge';
import {
  BUILDINGS,
  type BuildingType,
  type EnemyAffix,
  type Faction,
  type GamePhase,
  UNITS,
  type UnitType,
} from './constants';
import { generateRoadPoints } from './mapGenerator';
import {
  calculateSellValue,
  calculateSpawnRate,
  calculateStatMultiplier,
  calculateUpgradeCost,
  canAffordBuilding,
  getRoadDistancePure,
  isPlacementValidPure,
  snapToGrid,
} from './systems/buildingSystem';
import { discoverNewCodexEntries } from './systems/codexSystem';
import {
  type CombatEntity,
  calculateDamage,
  calculateVampiricHeal,
  findCombatTargetPure,
  processBossAoe,
  processStatusEffects,
} from './systems/combatSystem';
import { calculateDelivery, findLogisticsPathPure, moveCartStep } from './systems/logisticsSystem';
import { moveProjectile, processImpact } from './systems/projectileSystem';
import { createRng, type Rng } from './systems/rng';
import {
  canCastSpell,
  computeSpellEffect,
  type SpellTarget,
  updateCooldowns,
} from './systems/spellSystem';
import {
  generateParticleBurst,
  updateFloatingTextPure,
  updateParticlePure,
  updateWorldEffectPure,
} from './systems/vfxSystem';
// --- Pure subsystem imports ---
import {
  calculateWaveBudget as _calcBudget,
  calculateBuildTimer as _calcBuildTimer,
  applyDifficultyModifiers,
  buildWaveQueue,
  calculateWaveCompletionReward,
  getBossVariant,
  getWaveLabel,
  isWaveComplete,
  type DifficultyTier,
} from './systems/waveSystem';
import { rollDrop, selectSiegeTarget, type SiegeBuilding } from './systems/combatSystem';
import { applyBiomeModifiers, type BiomeSession } from './systems/biomeSystem';
import { configureEnemyVehicle, type AiConfig } from './ai/enemyBrain';
import aiConfig from '../data/aiConfig.json';
import { updateTelemetry } from './telemetry';
import { createPlayerGovernor, type GovernorWorldView } from './ai/playerGovernor';

// ────────────────────────────────────────────────────────────────
// Yuka AI manager
// ────────────────────────────────────────────────────────────────

/** Yuka entity manager driving AI steering behaviors for all mobile units. */
export const yukaManager = new EntityManager();

/** Maps Koota entity IDs to their corresponding Yuka Vehicle instances. */
export const vehiclesByEntityId = new Map<number, Vehicle>();

// ────────────────────────────────────────────────────────────────
// ECS Trait definitions
// ────────────────────────────────────────────────────────────────

/** ECS trait storing an entity's world-space coordinates. */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** ECS trait storing an entity's Y-axis rotation (yaw) in radians. */
export const Facing = trait({ y: 0 });

/** ECS trait for placed structures. */
export const Building = trait({
  type: 'hut' as BuildingType,
  levelSpawn: 1,
  levelStats: 1,
  timer: 0,
  cooldown: 0,
  targeting: 'first' as 'first' | 'strongest' | 'weakest',
});

/** ECS trait for mobile combat entities (both allied and enemy). */
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

/** ECS trait for floating damage/heal text. */
export const FloatingText = trait({
  text: '',
  color: '#ffffff',
  life: 1,
  riseSpeed: 8,
});

/** ECS trait for physics-driven particle effects. */
export const Particle = trait({
  color: '#ffffff',
  life: 1,
  size: 0.35,
  vx: 0,
  vy: 0,
  vz: 0,
});

/** ECS trait for large-scale visual effects. */
export const WorldEffect = trait({
  kind: 'smite' as 'smite' | 'boss_spawn',
  color: '#ffffff',
  life: 1,
  maxLife: 1,
  radius: 4,
});

/** ECS trait for in-flight projectiles. */
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

/** ECS trait tagging an entity with a codex identifier. */
export const CodexId = trait({ id: '' });

/** ECS singleton trait tracking autosave checkpoint status. */
export const AutosaveState = trait(() => ({
  dirty: false,
  reason: 'init',
  lastCheckpointAt: 0,
}));

/** ECS singleton trait holding all top-level game state for the active run. */
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
  governorEnabled: false,
  reducedFx: false,
  biomeModifiers: {
    faithRegenRate: 1,
    killGoldBase: 1,
    enemySpeed: 1,
    enemyHp: 1,
    buildTimer: 1,
    dropChance: 1,
  } as BiomeSession,
}));

/** ECS trait for minecart entities on logistics tracks. */
export const ResourceCart = trait(() => ({
  resource: 'wood' as 'wood' | 'ore' | 'gem',
  path: [] as { x: number; z: number }[],
  pathIndex: 0,
  targetId: 0,
}));

/** ECS singleton managing the enemy spawn queue for the current wave. */
export const WaveState = trait(() => ({
  spawnQueue: [] as { type: UnitType; affix?: EnemyAffix }[],
  spawnTimer: 0,
}));

// ────────────────────────────────────────────────────────────────
// World instance + road geometry caches
// ────────────────────────────────────────────────────────────────

/** The single Koota ECS world instance. All entities live here. */
export const gameWorld = createWorld();

/** O(1) entity lookup by ID. Updated on spawn/destroy. */
const entityIndex = new Map<number, Entity>();

/** Smooth Catmull-Rom curve fitted through the road waypoints. */
export let roadSpline = new THREE.CatmullRomCurve3([new THREE.Vector3()]);

/** 120-point uniform sampling of roadSpline. */
export let roadSamples: THREE.Vector3[] = [];

/** World position of the sanctuary (final road waypoint). */
export let sanctuaryPosition = new THREE.Vector3();

/** World position of the enemy spawn point (first road waypoint). */
export let spawnPosition = new THREE.Vector3();

/** Yuka Path for enemy FollowPathBehavior. */
export const yukaRoadPath = new Path();

/** Session-scoped seeded PRNG. Recreated on each run. */
let runRng: Rng = createRng(0);

// ────────────────────────────────────────────────────────────────
// Snapshot / Command types
// ────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────
// Internal helpers (minimal, not extractable)
// ────────────────────────────────────────────────────────────────

function now() {
  return Date.now();
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
  for (let i = 0; i < roadSamples.length; i += 1) {
    const d = distance2D(position, roadSamples[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}

// ────────────────────────────────────────────────────────────────
// World state accessors
// ────────────────────────────────────────────────────────────────

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
  setAutosaveState({ dirty: true, reason });
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

// ────────────────────────────────────────────────────────────────
// Entity index (O(1) lookup by ID)
// ────────────────────────────────────────────────────────────────

function indexEntity(entity: Entity) {
  entityIndex.set(entity.id() as number, entity);
}

function unindexEntity(entity: Entity) {
  entityIndex.delete(entity.id() as number);
}

function getEntityById(entityId: number): Entity | null {
  return entityIndex.get(entityId) ?? null;
}

function clearEntityIndex() {
  entityIndex.clear();
}

// ────────────────────────────────────────────────────────────────
// Road geometry
// ────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────
// Spawning helpers (side-effectful, must stay in engine)
// ────────────────────────────────────────────────────────────────

function spawnFloatingText(
  position: { x: number; y: number; z: number },
  text: string,
  color: string,
  riseSpeed = 8,
) {
  const e = gameWorld.spawn(
    FloatingText({ text, color, life: 1, riseSpeed }),
    Position({ x: position.x, y: position.y + 4, z: position.z }),
  );
  indexEntity(e);
}

function spawnParticleBurstECS(
  position: { x: number; y: number; z: number },
  color: string,
  count: number,
  intensity = 1,
) {
  const session = getSession();
  const reduced = session?.reducedFx ?? false;
  const particles = generateParticleBurst(position, color, count, intensity, runRng, reduced);
  for (const p of particles) {
    const e = gameWorld.spawn(
      Particle({ color: p.color, life: p.life, size: p.size, vx: p.vx, vy: p.vy, vz: p.vz }),
      Position({ x: p.x, y: p.y, z: p.z }),
    );
    indexEntity(e);
  }
}

function spawnWorldEffect(
  kind: 'smite' | 'boss_spawn',
  position: { x: number; y: number; z: number },
  color: string,
  radius: number,
  life: number,
) {
  const e = gameWorld.spawn(
    WorldEffect({ kind, color, life, maxLife: life, radius }),
    Position(position),
  );
  indexEntity(e);
}

function applyDeltaToUnit(target: Entity, amount: number, showColor: string, labelPrefix = '') {
  const unit = target.get(Unit);
  const position = target.get(Position);
  if (!unit || !position) return;
  unit.hp -= amount;
  const magnitude = Math.round(Math.abs(amount));
  const sign = amount < 0 ? '+' : labelPrefix;
  spawnFloatingText(position, `${sign}${magnitude}`, showColor);
  spawnParticleBurstECS(position, showColor, amount < 0 ? 6 : 5, amount < 0 ? 0.85 : 1);
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
  spawnParticleBurstECS(
    { x: sanctuaryPosition.x, y: 6, z: sanctuaryPosition.z },
    '#ef4444',
    16,
    1.25,
  );
  if (nextHealth <= 0) {
    audioBus.emit({ type: 'game_over' });
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
        spawnParticleBurstECS(position, '#facc15', 8, 1);
      }
      // Roll for item drop
      const drop = rollDrop(runRng, session.relics ?? []);
      if (drop && position) {
        if (drop === 'potion') {
          // Heal nearest ally
          let bestAlly: Entity | null = null;
          let bestDist = Infinity;
          for (const e of gameWorld.query(Unit, Position)) {
            const u = e.get(Unit);
            const p = e.get(Position);
            if (u && p && u.team === 'ally' && u.hp < u.maxHp) {
              const d = distance2D(position, p);
              if (d < bestDist) { bestDist = d; bestAlly = e; }
            }
          }
          if (bestAlly) {
            const allyUnit = bestAlly.get(Unit);
            if (allyUnit) {
              const healAmount = Math.floor(allyUnit.maxHp * 0.5);
              applyDeltaToUnit(bestAlly, -healAmount, '#4ade80');
            }
          }
          spawnFloatingText(position, 'Potion!', '#4ade80', 12);
        } else if (drop === 'star') {
          setSession({ gold: (getSession()?.gold ?? 0) + 10 });
          spawnFloatingText(position, '+10g Star!', '#fde047', 12);
          spawnParticleBurstECS(position, '#fde047', 10, 1.2);
        }
      }
    }
  }

  if (position) {
    if (unit.team === 'enemy' && unit.affix === 'explosive') {
      spawnParticleBurstECS(position, '#f97316', 20, 1.5);
      const allies: Array<{ id: number; x: number; z: number; invulnerable: number }> = [];
      for (const e of gameWorld.query(Unit, Position)) {
        const u = e.get(Unit);
        const p = e.get(Position);
        if (u && p && u.team === 'ally') {
          allies.push({ id: e.id() as number, x: p.x, z: p.z, invulnerable: u.invulnerable });
        }
      }
      const hits = processBossAoe(position, combatConfig.explosiveAoeDamage, allies);
      for (const hit of hits) {
        const target = getEntityById(hit.id);
        if (target) applyDeltaToUnit(target, hit.damage, '#f97316', '-');
      }
    } else {
      spawnParticleBurstECS(
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
  unindexEntity(entity);
  entity.destroy();
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

  // Apply difficulty modifiers to enemy stats
  let baseHp = config.hp * multiplier * hpMultiplier;
  let baseDamage = config.damage * multiplier;
  let baseSpeed = affix === 'swift' ? config.speed * combatConfig.swiftSpeedMultiplier : config.speed;
  if (team === 'enemy') {
    const diffMods = applyDifficultyModifiers(
      { hp: baseHp, damage: baseDamage, speed: baseSpeed },
      (session.difficulty as DifficultyTier) || 'pilgrim',
    );
    baseHp = diffMods.hp;
    baseDamage = diffMods.damage;
    baseSpeed = diffMods.speed;
  }

  const entity = gameWorld.spawn(
    Unit({
      type,
      team,
      maxHp: baseHp,
      hp: baseHp,
      damage: baseDamage,
      speed: baseSpeed,
      range: affix === 'ranged' ? 15 : config.range,
      atkSpd:
        affix === 'swift' ? config.atkSpd * combatConfig.swiftCooldownMultiplier : config.atkSpd,
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
  indexEntity(entity);

  if (type !== 'wall') {
    const vehicle = new Vehicle();
    vehicle.position.set(position.x, 0, position.z);
    vehicle.maxSpeed = baseSpeed;
    const followBehavior = new FollowPathBehavior(yukaRoadPath);
    followBehavior.active = team === 'enemy';
    vehicle.steering.add(followBehavior);
    if (team === 'ally') {
      vehicle.steering.add(new SeparationBehavior());
      vehicle.steering.add(new SeekBehavior(new YukaVector3()));
    }
    if (team === 'enemy') {
      configureEnemyVehicle(vehicle, aiConfig as AiConfig);
    }
    yukaManager.add(vehicle);
    vehiclesByEntityId.set(entity.id() as number, vehicle);
  }

  return entity;
}

// ────────────────────────────────────────────────────────────────
// System orchestration: update* functions
// ────────────────────────────────────────────────────────────────

function ecsToCombatEntity(e: Entity): CombatEntity | null {
  const u = e.get(Unit);
  const p = e.get(Position);
  if (!u || !p) return null;
  const id = e.id() as number;
  return {
    id,
    x: p.x,
    z: p.z,
    unit: {
      id,
      type: u.type,
      team: u.team,
      hp: u.hp,
      maxHp: u.maxHp,
      damage: u.damage,
      speed: u.speed,
      range: u.range,
      atkSpd: u.atkSpd,
      isRanged: u.isRanged,
      isHealer: u.isHealer,
      affix: u.affix,
      poison: u.poison,
      frozen: u.frozen,
      invulnerable: u.invulnerable,
      slowed: u.slowed,
      cooldown: u.cooldown,
      pathIndex: u.pathIndex,
      timeAlive: u.timeAlive,
    },
  };
}

function updateUnits(dt: number) {
  const unitEntities: Entity[] = [];
  for (const entity of gameWorld.query(Unit, Position)) unitEntities.push(entity);

  // Build candidate list once per frame for targeting
  const candidates: CombatEntity[] = [];
  for (const e of unitEntities) {
    const ce = ecsToCombatEntity(e);
    if (ce) candidates.push(ce);
  }

  for (const entity of unitEntities) {
    const unit = entity.get(Unit);
    const position = entity.get(Position);
    const facing = entity.get(Facing);
    if (!unit || !position || !facing) continue;

    // Status effects via pure function
    const sr = processStatusEffects(
      {
        hp: unit.hp,
        maxHp: unit.maxHp,
        poison: unit.poison,
        frozen: unit.frozen,
        slowed: unit.slowed,
        affix: unit.affix,
      },
      dt,
    );
    unit.hp = sr.hp;
    unit.poison = sr.poison;
    unit.frozen = sr.frozen;
    if (unit.poison > 0 && runRng.next() < 0.1) spawnParticleBurstECS(position, '#10b981', 1, 0.5);

    if (unit.hp <= 0) {
      destroyUnit(entity, true);
      continue;
    }
    unit.timeAlive += dt;
    unit.cooldown -= dt;

    if (unit.frozen > 0) {
      if (runRng.next() < 0.1) spawnParticleBurstECS(position, '#38bdf8', 1, 0.5);
      const v = vehiclesByEntityId.get(entity.id() as number);
      if (v) v.velocity.set(0, 0, 0);
      continue;
    }
    if (unit.type === 'wall') continue;

    const vehicle = vehiclesByEntityId.get(entity.id() as number);
    if (vehicle) {
      position.x = vehicle.position.x;
      position.z = vehicle.position.z;
      if (vehicle.velocity.squaredLength() > 0.001)
        facing.y = Math.atan2(vehicle.velocity.x, vehicle.velocity.z);
    }

    const attacker = ecsToCombatEntity(entity);
    if (!attacker) continue;
    const targetResult = findCombatTargetPure(attacker, candidates);

    if (targetResult) {
      const target = getEntityById(targetResult.id);
      const targetPosition = target?.get(Position);
      if (!target || !targetPosition) continue;
      const dist = distance2D(position, targetPosition);

      if (dist <= unit.range) {
        facing.y = Math.atan2(targetPosition.x - position.x, targetPosition.z - position.z);
        if (unit.cooldown <= 0) {
          executeAttack(entity, target);
          unit.cooldown = unit.atkSpd;
        }
        if (vehicle) vehicle.velocity.set(0, 0, 0);
      } else if (vehicle) {
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
      continue;
    }

    if (vehicle) {
      if (unit.team === 'ally') {
        vehicle.velocity.set(0, 0, 0);
        const seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior);
        if (seek) seek.active = false;
      } else if (unit.team === 'enemy') {
        // Siege targeting: redirect enemy toward a nearby building if available
        // Only try siege when past halfway along the road (pathIndex > half)
        const siegeRange = 25;
        let siegeTargetFound = false;
        if (unit.pathIndex > roadSamples.length * 0.4) {
          const buildings: SiegeBuilding[] = [];
          for (const be of gameWorld.query(Building, Position)) {
            const bb = be.get(Building);
            const bp = be.get(Position);
            if (bb && bp && distance2D(position, bp) < siegeRange) {
              buildings.push({ id: be.id() as number, type: bb.type, x: bp.x, z: bp.z });
            }
          }
          const siegeTarget = buildings.length > 0
            ? selectSiegeTarget(unit.type, buildings, position)
            : undefined;
          if (siegeTarget) {
            let seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior) as
              | SeekBehavior
              | undefined;
            if (!seek) {
              seek = new SeekBehavior();
              vehicle.steering.add(seek);
            }
            seek.target.set(siegeTarget.x, 0, siegeTarget.z);
            seek.active = true;
            const follow = vehicle.steering.behaviors.find((b) => b instanceof FollowPathBehavior);
            if (follow) follow.active = false;
            siegeTargetFound = true;
          }
        }
        if (!siegeTargetFound) {
        const follow = vehicle.steering.behaviors.find((b) => b instanceof FollowPathBehavior);
        if (follow) follow.active = true;
        const seek = vehicle.steering.behaviors.find((b) => b instanceof SeekBehavior);
        if (seek) seek.active = false;
        }
        if (distance2D(position, sanctuaryPosition) < 6) {
          damageSanctuary(
            unit.type === 'boss' ? waveConfig.grailDamageBoss : waveConfig.grailDamageNormal,
          );
          destroyUnit(entity, false);
        }
      }
    }
  }
}

function executeAttack(attacker: Entity, target: Entity) {
  const attackerUnit = attacker.get(Unit);
  const attackerPosition = attacker.get(Position);
  if (!attackerUnit || !attackerPosition) return;

  audioBus.emit({ type: 'combat_hit' });

  if (attackerUnit.type === 'boss') {
    setSession({ cameraShake: 5 });
    spawnParticleBurstECS(attackerPosition, '#f97316', 16, 1.4);
    const allies: Array<{ id: number; x: number; z: number; invulnerable: number }> = [];
    for (const e of gameWorld.query(Unit, Position)) {
      const u = e.get(Unit);
      const p = e.get(Position);
      if (u && p && u.team === 'ally') {
        allies.push({ id: e.id() as number, x: p.x, z: p.z, invulnerable: u.invulnerable });
      }
    }
    const hits = processBossAoe(attackerPosition, attackerUnit.damage, allies);
    for (const hit of hits) {
      const hitTarget = getEntityById(hit.id);
      if (hitTarget) applyDeltaToUnit(hitTarget, hit.damage, '#ef4444', '-');
    }
    if (attackerUnit.affix === 'vampiric') {
      applyDeltaToUnit(attacker, -calculateVampiricHeal(attackerUnit.damage), '#4ade80');
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
    const e = gameWorld.spawn(
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
    indexEntity(e);
    return;
  }

  if (isHeal) {
    applyDeltaToUnit(target, attackerUnit.damage, '#4ade80');
    return;
  }

  if (defender.invulnerable > 0) return;

  const damage = calculateDamage(attackerUnit.damage, defender.affix === 'armored', isMagic);
  applyDeltaToUnit(target, damage, '#fde047', '-');

  if (attackerUnit.affix === 'vampiric') {
    applyDeltaToUnit(attacker, -calculateVampiricHeal(damage), '#4ade80');
  }
}

function updateBuildings(dt: number) {
  const session = getSession();
  if (!session || session.phase !== 'defend') return;

  if (session.health > 0) {
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

        const trackNodes = Array.from(gameWorld.query(Building, Position))
          .filter((e) => e.get(Building)?.type === 'track')
          .map((e) => {
            const p = e.get(Position);
            return { x: p?.x ?? 0, z: p?.z ?? 0 };
          });

        const mintPositions = Array.from(gameWorld.query(Building, Position))
          .filter((e) => e.get(Building)?.type === 'mint')
          .map((e) => {
            const p = e.get(Position);
            return { x: p?.x ?? 0, z: p?.z ?? 0 };
          });

        const path = findLogisticsPathPure(
          position,
          resType,
          trackNodes,
          mintPositions,
          sanctuaryPosition,
        );

        if (path) {
          const e = gameWorld.spawn(
            ResourceCart({ resource: resType, path, pathIndex: 0, targetId: 0 }),
            Position({ x: position.x, y: position.y + 1, z: position.z }),
          );
          indexEntity(e);
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

    if (building.type === 'mint' || building.type === 'track') continue;

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

          const e = gameWorld.spawn(
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
          indexEntity(e);
          building.cooldown = ((config.atkSpd ?? 1) / 1.1 ** (building.levelStats - 1)) * cdMult;
          audioBus.emit({ type: 'combat_hit' });
        }
      }
      continue;
    }

    if (config.unit) {
      building.timer -= dt;
      const spawnRate = calculateSpawnRate(building.type, building.levelSpawn);
      if (building.timer <= 0) {
        spawnScaledUnit(
          config.unit,
          'ally',
          position,
          calculateStatMultiplier(building.levelStats),
        );
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

  // Spell cooldown updates via pure function
  const updatedCooldowns = updateCooldowns(session.spellCooldowns, dt);
  if (JSON.stringify(updatedCooldowns) !== JSON.stringify(session.spellCooldowns)) {
    setSession({ spellCooldowns: updatedCooldowns });
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
      const bossVariant = getBossVariant(session.wave);
      const bossLabel = bossVariant ? `${bossVariant.id} Approaches` : 'Boss Approaches';
      triggerBanner(bossLabel, 'danger', 2.8, 0.22, '#ef4444');
      audioBus.emit({ type: 'boss_spawn' });
      spawnWorldEffect(
        'boss_spawn',
        { x: spawnPosition.x, y: 0.3, z: spawnPosition.z },
        '#ef4444',
        10,
        1.6,
      );
      spawnParticleBurstECS({ x: spawnPosition.x, y: 1.5, z: spawnPosition.z }, '#ef4444', 24, 1.6);
    }
    setWaveState({ spawnQueue: rest, spawnTimer: waveConfig.spawnInterval });
  } else {
    setWaveState({ spawnTimer: nextSpawnTimer });
  }

  // Wave completion check via pure function
  let enemiesAlive = false;
  for (const entity of gameWorld.query(Unit)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'enemy') {
      enemiesAlive = true;
      break;
    }
  }

  if (isWaveComplete(waveState.spawnQueue.length, enemiesAlive)) {
    cleanupAlliedWaveUnits();

    const reward = calculateWaveCompletionReward(
      session.wave,
      session.gold,
      session.relics?.includes('golden_age') ?? false,
    );

    const nextWave = session.wave + 1;
    if (nextWave > waveConfig.victoryWave) {
      setSession({
        phase: 'game_over',
        announcement: 'Victory Achieved!',
        gameOver: true,
        earnedCoins: session.wave * 25,
      });
      audioBus.emit({ type: 'game_over' });
      return;
    }

    setSession({
      gold: session.gold + reward.goldReward + reward.interest,
      wave: nextWave,
      pendingRelicDraft: session.wave % waveConfig.bossWaveInterval === 0,
    });

    markRunDirty('wave_complete');
    audioBus.emit({ type: 'wave_complete' });
    initialBuildPhase();
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
      unindexEntity(entity);
      entity.destroy();
      continue;
    }

    const targetPos = target.get(Position);
    if (!targetPos) {
      unindexEntity(entity);
      entity.destroy();
      continue;
    }

    const moveResult = moveProjectile(pos, targetPos, proj.speed, dt);

    if (moveResult.hit) {
      // Gather nearby units for splash
      const nearby: Array<{ id: number; team: Faction; x: number; z: number }> = [];
      if (proj.splashRadius > 0) {
        for (const e of gameWorld.query(Unit, Position)) {
          const u = e.get(Unit);
          const p = e.get(Position);
          if (u && p) {
            nearby.push({ id: e.id() as number, team: u.team, x: p.x, z: p.z });
          }
        }
      }

      const targetUnit = target.get(Unit);
      if (targetUnit) {
        const impact = processImpact(
          {
            damage: proj.damage,
            isHeal: proj.isHeal,
            isPoison: proj.isPoison,
            splashRadius: proj.splashRadius,
            isSlow: proj.isSlow,
            color: proj.color,
          },
          { id: targetIdNum, team: targetUnit.team },
          targetPos,
          nearby,
        );

        if (impact.splashTargets.length > 0) {
          for (const st of impact.splashTargets) {
            const splashTarget = getEntityById(st.id);
            if (splashTarget) {
              applyDeltaToUnit(splashTarget, st.damage, impact.color, proj.isHeal ? '' : '-');
            }
          }
          spawnParticleBurstECS(targetPos, proj.color, 12, 1.5);
        } else {
          applyDeltaToUnit(target, impact.directDamage, impact.color, proj.isHeal ? '' : '-');
          if (impact.applyPoison) targetUnit.poison += impact.poisonAmount;
          if (impact.applySlow) targetUnit.slowed = impact.slowDuration;
        }
      }

      unindexEntity(entity);
      entity.destroy();
    } else {
      pos.x = moveResult.x;
      pos.y = moveResult.y;
      pos.z = moveResult.z;
    }
  }
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

    const speed = session.relics.includes('miners_lantern') ? 10 : 5;
    const step = moveCartStep(pos, cart.path, cart.pathIndex, speed, dt);

    pos.x = step.x;
    pos.z = step.z;
    cart.pathIndex = step.pathIndex;

    if (step.arrived) {
      const lastPoint = cart.path[cart.path.length - 1];
      const isMint = cart.resource === 'ore' && distance2D(lastPoint, sanctuaryPosition) > 10;
      const delivery = calculateDelivery(
        cart.resource,
        isMint,
        session.relics?.includes('blessed_pickaxe') ?? false,
      );

      if (delivery.gold > 0) {
        setSession({ gold: session.gold + delivery.gold });
        spawnFloatingText(
          { x: lastPoint.x, y: 3, z: lastPoint.z },
          `+${delivery.gold}g`,
          '#facc15',
          10,
        );
      } else {
        const key = delivery.resource as 'wood' | 'ore' | 'gem';
        setSession({ [key]: (session[key] as number) + delivery.amount });
      }
      toDestroy.push(entity);
    }
  }

  for (const e of toDestroy) {
    unindexEntity(e);
    e.destroy();
  }
}

function updateFloatingTexts(dt: number) {
  const session = getSession();
  const reduced = session?.reducedFx ?? false;
  const toDestroy: Entity[] = [];
  for (const entity of gameWorld.query(FloatingText, Position)) {
    const ft = entity.get(FloatingText);
    const position = entity.get(Position);
    if (!ft || !position) continue;

    const result = updateFloatingTextPure(
      { y: position.y, life: ft.life, riseSpeed: ft.riseSpeed },
      dt,
      reduced,
    );
    ft.life = result.life;
    position.y = result.y;

    if (result.dead) toDestroy.push(entity);
  }
  for (const e of toDestroy) {
    unindexEntity(e);
    e.destroy();
  }
}

function updateParticles(dt: number) {
  const toDestroy: Entity[] = [];
  for (const entity of gameWorld.query(Particle, Position)) {
    const particle = entity.get(Particle);
    const position = entity.get(Position);
    if (!particle || !position) continue;

    const result = updateParticlePure(
      {
        x: position.x,
        y: position.y,
        z: position.z,
        vx: particle.vx,
        vy: particle.vy,
        vz: particle.vz,
        life: particle.life,
      },
      dt,
    );
    position.x = result.x;
    position.y = result.y;
    position.z = result.z;
    particle.vx = result.vx;
    particle.vy = result.vy;
    particle.vz = result.vz;
    particle.life = result.life;

    if (result.dead) toDestroy.push(entity);
  }
  for (const e of toDestroy) {
    unindexEntity(e);
    e.destroy();
  }
}

function updateWorldEffects(dt: number) {
  const toDestroy: Entity[] = [];
  for (const entity of gameWorld.query(WorldEffect, Position)) {
    const effect = entity.get(WorldEffect);
    if (!effect) continue;

    const result = updateWorldEffectPure({ life: effect.life }, dt);
    effect.life = result.life;

    if (result.dead) toDestroy.push(entity);
  }
  for (const e of toDestroy) {
    unindexEntity(e);
    e.destroy();
  }
}

function codexDiscoverySystem() {
  const session = getSession();
  if (!session) return;

  const visibleIds: string[] = [];
  for (const entity of gameWorld.query(CodexId)) {
    const codex = entity.get(CodexId);
    if (codex) visibleIds.push(codex.id);
  }

  const newEntries = discoverNewCodexEntries(session.discoveredCodex, visibleIds);
  if (newEntries.length > 0) {
    setSession({ discoveredCodex: [...session.discoveredCodex, ...newEntries] });
  }
}

function cleanupAlliedWaveUnits() {
  const toDestroy: Entity[] = [];
  for (const entity of gameWorld.query(Unit)) {
    const unit = entity.get(Unit);
    if (unit?.team === 'ally' && unit.type !== 'wall') {
      toDestroy.push(entity);
    }
  }
  for (const entity of toDestroy) {
    destroyUnit(entity, false);
  }
}

// ────────────────────────────────────────────────────────────────
// World lifecycle
// ────────────────────────────────────────────────────────────────

function initializeWorldTraits() {
  gameWorld.add(GameSession, WaveState, AutosaveState);
}

function initialBuildPhase() {
  const session = getSession();
  if (!session) return;

  const waveRng = runRng.fork(`wave-${session.wave}`);
  setWaveState({
    spawnQueue: buildWaveQueue(session.wave, waveRng),
    spawnTimer: 0,
  });
  setSession({
    phase: 'build',
    buildTimeLeft: _calcBuildTimer(session.wave),
    announcement: 'Build Phase',
  });
  const budget = _calcBudget(session.wave);
  const waveLabel = getWaveLabel(budget);
  triggerBanner(`Wave ${session.wave}: ${waveLabel}`, 'holy', 2.4, 0.08, '#facc15');
}

export function createRunWorld(options?: {
  preferredSpeed?: number;
  biome?: string;
  difficulty?: string;
  doctrines?: { nodeId: string; level: number }[];
  spells?: string[];
  seed?: string;
  mapSize?: number;
  governorEnabled?: boolean;
  reducedFx?: boolean;
}) {
  gameWorld.reset();
  clearEntityIndex();
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

  const runId = `run_${now()}_${runRng.next().toString(36).slice(2, 8)}`;
  const seed = options?.seed || runId;
  runRng = createRng(seed);
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
    governorEnabled: options?.governorEnabled ?? false,
    reducedFx: options?.reducedFx ?? false,
  });
  // Apply biome modifiers
  const biomeId = options?.biome ?? 'kings-road';
  const baseModifiers: BiomeSession = {
    faithRegenRate: 1,
    killGoldBase: 1,
    enemySpeed: 1,
    enemyHp: 1,
    buildTimer: 1,
    dropChance: 1,
  };
  const modifiedBiome = applyBiomeModifiers(baseModifiers, biomeId);
  setSession({ biomeModifiers: modifiedBiome });

  setAutosaveState({ dirty: true, reason: 'create_run', lastCheckpointAt: 0 });
  initialBuildPhase();
}

export function resetGameWorld(options?: Parameters<typeof createRunWorld>[0]) {
  createRunWorld(options);
}

export function disposeRunWorld() {
  gameWorld.reset();
  clearEntityIndex();
}

// ────────────────────────────────────────────────────────────────
// Main update loop
// ────────────────────────────────────────────────────────────────

/** Cached governor instance to avoid re-creating each frame. */
let _governor: ReturnType<typeof createPlayerGovernor> | null = null;

export function updateGameWorld(dt: number) {
  const session = getSession();
  if (!session || session.gameOver) return;

  yukaManager.update(dt);
  setSession({ elapsedMs: session.elapsedMs + dt * 1000 });

  // GOAP Governor: auto-play when enabled
  if (session.governorEnabled) {
    if (!_governor) _governor = createPlayerGovernor();
    let enemyCount = 0;
    let enemyNearSanctuary = 0;
    let buildingCount = 0;
    for (const e of gameWorld.query(Unit)) {
      const u = e.get(Unit);
      const p = e.get(Position);
      if (u?.team === 'enemy') {
        enemyCount++;
        if (p && distance2D(p, sanctuaryPosition) < 20) enemyNearSanctuary++;
      }
    }
    for (const _e of gameWorld.query(Building)) buildingCount++;
    const worldView: GovernorWorldView = {
      phase: session.phase,
      wave: session.wave,
      gold: session.gold,
      wood: session.wood,
      faith: session.faith,
      health: session.health,
      maxHealth: 20,
      buildTimeLeft: session.buildTimeLeft,
      buildingCount,
      enemyCount,
      enemyNearSanctuary,
      smiteCooldown: session.spellCooldowns.smite ?? 0,
    };
    const commands = _governor.decide(worldView);
    for (const cmd of commands) {
      queueWorldCommand(cmd);
    }
  }

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

  // Update telemetry counts
  let unitCount = 0;
  let particleCount = 0;
  let projectileCount = 0;
  for (const _e of gameWorld.query(Unit)) unitCount++;
  for (const _e of gameWorld.query(Particle)) particleCount++;
  for (const _e of gameWorld.query(Projectile)) projectileCount++;
  const totalEntities = unitCount + particleCount + projectileCount;
  updateTelemetry({
    entityCount: totalEntities,
    activeParticles: particleCount,
    activeProjectiles: projectileCount,
    activeUnits: unitCount,
    frameTimeMs: dt * 1000,
  });
}

export function stepRunWorld(dt: number) {
  const speed = getSession()?.gameSpeed ?? 1;
  updateGameWorld(Math.min(dt, 0.1) * speed);
}

// ────────────────────────────────────────────────────────────────
// Player commands
// ────────────────────────────────────────────────────────────────

export function snapPlacementPosition(position: { x: number; y: number; z: number }) {
  return snapToGrid(position);
}

export function isPlacementValid(type: BuildingType, position: { x: number; z: number }) {
  const session = getSession();
  if (!session || session.gameOver) return false;

  const existingBuildings = Array.from(gameWorld.query(Building, Position)).map((e) => {
    const b = e.get(Building);
    const p = e.get(Position);
    return { type: b!.type, x: p!.x, z: p!.z };
  });

  const wallPositions = Array.from(gameWorld.query(Unit, Position))
    .filter((e) => e.get(Unit)?.type === 'wall')
    .map((e) => {
      const p = e.get(Position);
      return { x: p!.x, z: p!.z };
    });

  const roadSampleData = roadSamples.map((s) => ({ x: s.x, z: s.z }));

  return isPlacementValidPure(
    type,
    position,
    roadSampleData,
    sanctuaryPosition,
    existingBuildings,
    wallPositions,
  );
}

/**
 * Returns the distance from a world position to the nearest road sample point.
 * Used by the radial menu to determine context (near road vs far from road).
 */
export function getRoadDistance(position: { x: number; z: number }): number {
  return getRoadDistancePure(position, roadSamples.map((s) => ({ x: s.x, z: s.z })));
}

export function buildStructure(type: BuildingType, position: { x: number; y: number; z: number }) {
  const session = getSession();
  if (!session || session.gameOver) return false;

  const config = BUILDINGS[type];
  if (!canAffordBuilding(type, session.gold, session.wood, session.relics ?? [])) return false;

  const snappedPosition = snapToGrid(position);
  if (!isPlacementValid(type, snappedPosition)) return false;

  let woodCost = config.woodCost ?? 0;
  if (type === 'track' && session.relics?.includes('iron_tracks')) woodCost = 0;

  audioBus.emit({ type: 'building_placed' });
  setSession({ gold: session.gold - config.cost, wood: session.wood - woodCost, cameraShake: 2 });
  markRunDirty('build_structure');
  spawnParticleBurstECS(snappedPosition, '#d4af37', 10, 0.85);

  const ironVanguard = session.doctrines.find((d) => d.nodeId === 'iron_vanguard');
  const hpMultiplier = ironVanguard ? 1 + 0.1 * ironVanguard.level : 1;

  if (type === 'wall') {
    const e = gameWorld.spawn(
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
    indexEntity(e);
    return true;
  }

  const e = gameWorld.spawn(
    Building({ type, levelSpawn: 1, levelStats: 1, timer: config.spawnTime }),
    Position(snappedPosition),
    CodexId({ id: type }),
  );
  indexEntity(e);
  return true;
}

export function upgradeBuilding(entity: Entity, branch: 'spawn' | 'stats') {
  const session = getSession();
  const building = entity.get(Building);
  if (!session || !building || session.gameOver) return false;

  const config = BUILDINGS[building.type];
  const currentLevel = branch === 'spawn' ? building.levelSpawn : building.levelStats;
  const costs = calculateUpgradeCost(config.cost, currentLevel);

  if (costs.gold === Infinity || session.gold < costs.gold || session.wood < costs.wood)
    return false;

  if (branch === 'spawn') building.levelSpawn += 1;
  else building.levelStats += 1;

  setSession({
    gold: session.gold - costs.gold,
    wood: session.wood - costs.wood,
    cameraShake: 1.5,
  });
  markRunDirty(`upgrade_${branch}`);
  return true;
}

export function sellBuilding(entity: Entity) {
  const session = getSession();
  const building = entity.get(Building);
  if (!session || !building || session.gameOver) return false;

  const sv = calculateSellValue(building.type, building.levelSpawn, building.levelStats);
  const position = entity.get(Position);
  const posClone = position ? { x: position.x, y: position.y, z: position.z } : null;

  unindexEntity(entity);
  entity.destroy();

  if (posClone) spawnParticleBurstECS(posClone, '#64748b', 10, 0.9);
  audioBus.emit({ type: 'building_sold' });
  setSession({ gold: session.gold + sv.gold, wood: session.wood + sv.wood, cameraShake: 1 });
  markRunDirty('sell_building');
  return true;
}

export function sellWall(entity: Entity) {
  const session = getSession();
  const unit = entity.get(Unit);
  if (!session || !unit || unit.type !== 'wall' || session.gameOver) return false;

  const position = entity.get(Position);
  const posClone = position ? { x: position.x, y: position.y, z: position.z } : null;

  unindexEntity(entity);
  entity.destroy();

  if (posClone) spawnParticleBurstECS(posClone, '#64748b', 8, 0.8);
  audioBus.emit({ type: 'building_sold' });
  setSession({
    wood: session.wood + Math.floor((BUILDINGS.wall.woodCost ?? 0) * 0.5),
    cameraShake: 1,
  });
  markRunDirty('sell_wall');
  return true;
}

export function getBuildingUpgradeCosts(entity: Entity) {
  const building = entity.get(Building);
  if (!building) return null;
  const sv = calculateSellValue(building.type, building.levelSpawn, building.levelStats);
  const config = BUILDINGS[building.type];
  return {
    spawn: calculateUpgradeCost(config.cost, building.levelSpawn),
    stats: calculateUpgradeCost(config.cost, building.levelStats),
    sell: sv.gold,
  };
}

export function getSelectableEntityAtPosition(position: { x: number; z: number }) {
  const session = getSession();
  if (!session || session.phase !== 'build' || session.gameOver) return null;

  let bestEntity: Entity | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entity of gameWorld.query(Building, Position)) {
    const p = entity.get(Position);
    if (!p) continue;
    const d = distance2D(position, p);
    if (d < 5 && d < bestDistance) {
      bestDistance = d;
      bestEntity = entity;
    }
  }

  for (const entity of gameWorld.query(Unit, Position)) {
    const u = entity.get(Unit);
    const p = entity.get(Position);
    if (!u || u.type !== 'wall' || !p) continue;
    const d = distance2D(position, p);
    if (d < 5 && d < bestDistance) {
      bestDistance = d;
      bestEntity = entity;
    }
  }

  return bestEntity;
}

export function startWave() {
  const session = getSession();
  if (!session || session.phase !== 'build') return;

  const earlyBonus = Math.max(
    0,
    Math.floor(session.buildTimeLeft * waveConfig.earlyStartBonusRate),
  );
  const isBossWave = session.wave % waveConfig.bossWaveInterval === 0;
  setSession({
    gold: session.gold + earlyBonus,
    phase: 'defend',
    buildTimeLeft: 0,
    announcement: 'Battle Phase',
  });
  setWaveState({ spawnTimer: 0.5 });
  markRunDirty('start_wave');
  audioBus.emit({ type: 'wave_start' });
  const startBudget = _calcBudget(session.wave);
  const startLabel = getWaveLabel(startBudget);
  triggerBanner(
    isBossWave ? `Boss Wave ${session.wave}` : `Wave ${session.wave}: ${startLabel}`,
    isBossWave ? 'danger' : 'holy',
    isBossWave ? 2.8 : 2.2,
    isBossWave ? 0.16 : 0.1,
    isBossWave ? '#ef4444' : '#facc15',
  );
}

export function skipBuildPhase() {
  const session = getSession();
  if (!session || session.phase !== 'build') return;
  const earlyBonus = Math.max(
    0,
    Math.floor(session.buildTimeLeft * waveConfig.earlyStartBonusRate),
  );
  setSession({ gold: session.gold + earlyBonus, buildTimeLeft: 0 });
}

export function toggleGameSpeed() {
  const session = getSession();
  if (!session) return 1;
  const next = session.gameSpeed === 1 ? 1.5 : session.gameSpeed === 1.5 ? 2 : 1;
  setSession({ gameSpeed: next });
  return next;
}

export function castSpell(spellId: string) {
  const session = getSession();
  if (!session) return false;

  if (!canCastSpell(spellId, session.faith, session.spellCooldowns, session.gameOver)) {
    return false;
  }

  // Build target lists from ECS
  const enemies: SpellTarget[] = [];
  const allies: SpellTarget[] = [];
  for (const entity of gameWorld.query(Unit, Position)) {
    const unit = entity.get(Unit);
    const pos = entity.get(Position);
    if (!unit || !pos) continue;
    const t: SpellTarget = {
      id: entity.id() as number,
      team: unit.team,
      x: pos.x,
      z: pos.z,
      hp: unit.hp,
      maxHp: unit.maxHp,
      type: unit.type,
    };
    if (unit.team === 'enemy') enemies.push(t);
    else allies.push(t);
  }

  // If smite or meteor_strike needs enemies and there are none, bail
  if ((spellId === 'smite' || spellId === 'meteor_strike') && enemies.length === 0) {
    return false;
  }

  const effect = computeSpellEffect(spellId, enemies, allies, sanctuaryPosition);

  // Apply damage
  for (const dt of effect.damageTargets) {
    const target = getEntityById(dt.id);
    if (target) {
      const unit = target.get(Unit);
      if (unit) unit.hp -= dt.damage;
    }
  }

  // Apply heals
  for (const ht of effect.healTargets) {
    const target = getEntityById(ht.id);
    if (target) applyDeltaToUnit(target, -ht.heal, '#4ade80');
  }

  // Apply freezes
  for (const ft of effect.freezeTargets) {
    const target = getEntityById(ft.id);
    if (target) {
      const unit = target.get(Unit);
      if (unit) unit.frozen += ft.freezeDuration;
    }
  }

  // Apply stuns
  for (const st of effect.stunTargets) {
    const target = getEntityById(st.id);
    if (target) {
      const unit = target.get(Unit);
      if (unit) unit.cooldown += st.stunDuration;
    }
  }

  // Apply shields
  for (const sh of effect.shieldTargets) {
    const target = getEntityById(sh.id);
    if (target) {
      const unit = target.get(Unit);
      if (unit) unit.invulnerable = sh.duration;
    }
  }

  // Apply cooldown resets
  for (const rc of effect.resetCooldownTargets) {
    const target = getEntityById(rc.id);
    if (target) {
      const unit = target.get(Unit);
      if (unit) unit.cooldown = 0;
    }
  }

  // VFX for primary target
  if (effect.primaryTargetId !== undefined) {
    const primary = getEntityById(effect.primaryTargetId);
    if (primary) {
      const pos = primary.get(Position);
      if (pos) {
        spawnParticleBurstECS(
          pos,
          spellId === 'meteor_strike' ? '#ef4444' : '#facc15',
          spellId === 'meteor_strike' ? 30 : 18,
          spellId === 'meteor_strike' ? 2.5 : 1.6,
        );
        spawnWorldEffect(
          'smite',
          { x: pos.x, y: 0.2, z: pos.z },
          spellId === 'meteor_strike' ? '#ef4444' : '#facc15',
          spellId === 'meteor_strike' ? 15 : 12,
          spellId === 'meteor_strike' ? 1.5 : 0.75,
        );
      }
    }
  }

  // Banner + session updates
  const spellNames: Record<string, string> = {
    smite: 'Divine Smite',
    holy_nova: 'Holy Nova',
    zealous_haste: 'Zealous Haste',
    earthquake: 'Earthquake',
    chrono_shift: 'Chrono Shift',
    meteor_strike: 'Meteor Strike',
    divine_shield: 'Divine Shield',
  };
  const bannerColors: Record<string, { tone: 'holy' | 'danger'; color: string }> = {
    smite: { tone: 'holy', color: '#fde68a' },
    holy_nova: { tone: 'holy', color: '#4ade80' },
    zealous_haste: { tone: 'holy', color: '#fde047' },
    earthquake: { tone: 'danger', color: '#f97316' },
    chrono_shift: { tone: 'holy', color: '#38bdf8' },
    meteor_strike: { tone: 'danger', color: '#ef4444' },
    divine_shield: { tone: 'holy', color: '#3b82f6' },
  };

  const banner = bannerColors[spellId] ?? { tone: 'holy' as const, color: '#facc15' };
  triggerBanner(spellNames[spellId] ?? spellId, banner.tone, 1.4, 0.24, banner.color);
  audioBus.emit({ type: 'spell_cast', detail: spellId });
  setSession({
    spellCooldowns: { ...session.spellCooldowns, [spellId]: effect.cooldown },
    cameraShake: effect.cameraShake,
    faith: session.faith - effect.faithCost,
  });
  markRunDirty('cast_spell');
  return true;
}

export function draftRelic(relicId: string) {
  const session = getSession();
  if (!session || !session.pendingRelicDraft) return false;
  setSession({ relics: [...(session.relics || []), relicId], pendingRelicDraft: false });
  markRunDirty('draft_relic');
  return true;
}

// ────────────────────────────────────────────────────────────────
// Serialization
// ────────────────────────────────────────────────────────────────

export function serializeRunWorld(): ActiveRunSnapshotV1 {
  const session = getSession();
  const waveState = getWaveState();
  if (!session || !waveState) throw new Error('Cannot serialize an uninitialized run world.');

  const buildings = Array.from(gameWorld.query(Building, Position)).flatMap((entity) => {
    const b = entity.get(Building);
    const p = entity.get(Position);
    if (!b || !p) return [];
    return [
      {
        type: b.type,
        levelSpawn: b.levelSpawn,
        levelStats: b.levelStats,
        timer: b.timer,
        position: { x: p.x, y: p.y, z: p.z },
      },
    ];
  });

  const units = Array.from(gameWorld.query(Unit, Position, Facing)).flatMap((entity) => {
    const u = entity.get(Unit);
    const p = entity.get(Position);
    const f = entity.get(Facing);
    if (!u || !p || !f) return [];
    return [
      {
        type: u.type,
        team: u.team,
        maxHp: u.maxHp,
        hp: u.hp,
        damage: u.damage,
        speed: u.speed,
        range: u.range,
        atkSpd: u.atkSpd,
        reward: u.reward,
        isRanged: u.isRanged,
        isHealer: u.isHealer,
        cooldown: u.cooldown,
        timeAlive: u.timeAlive,
        pathIndex: u.pathIndex,
        affix: u.affix,
        poison: u.poison,
        position: { x: p.x, y: p.y, z: p.z },
        facingY: f.y,
      },
    ];
  });

  return { version: 1, session: { ...session }, waveState: { ...waveState }, buildings, units };
}

export function hydrateRunWorld(snapshot: ActiveRunSnapshotV1) {
  if (snapshot.version !== 1)
    throw new Error(`Unsupported run snapshot version: ${snapshot.version}`);

  gameWorld.reset();
  clearEntityIndex();
  initializeWorldTraits();
  setSession({ ...snapshot.session });
  setWaveState({ ...snapshot.waveState });
  if (snapshot.session.roadPoints) updateMapData(snapshot.session.roadPoints);
  runRng = createRng(snapshot.session.seed || 'hydrated');
  setAutosaveState({ dirty: false, reason: 'hydrate_run', lastCheckpointAt: now() });

  for (const building of snapshot.buildings) {
    const e = gameWorld.spawn(
      Building({
        type: building.type,
        levelSpawn: building.levelSpawn,
        levelStats: building.levelStats,
        timer: building.timer,
      }),
      Position(building.position),
    );
    indexEntity(e);
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
    indexEntity(entity);

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
        for (const wp of [...waypoints].reverse()) reversePath.add(wp);
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
  setAutosaveState({ dirty: false, reason, lastCheckpointAt: now() });
  return snapshot;
}

export function finalizeRun(result: 'defeat' | 'abandoned') {
  const session = getSession();
  if (!session) throw new Error('Cannot finalize an uninitialized run.');
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

// ────────────────────────────────────────────────────────────────
// Command dispatcher
// ────────────────────────────────────────────────────────────────

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
