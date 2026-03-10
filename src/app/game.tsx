import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as THREE from 'three';
import { BuildingController } from '../components/3d/BuildingController';
import { CombatController } from '../components/3d/CombatController';
import { BuildingMesh } from '../components/3d/Entities/BuildingMesh';
import { UnitMesh } from '../components/3d/Entities/UnitMesh';
import { Environment } from '../components/3d/Environment';
import { FloatingTextSystem } from '../components/3d/FloatingTextSystem';
import { GovernorController } from '../components/3d/GovernorController';
import { GameScene } from '../components/3d/game/GameScene';
import { MapGrid, SceneryInstances } from '../components/3d/MapGrid';
import { emitDust, emitParticles, ParticleSystem } from '../components/3d/ParticleSystem';
import { Sanctuary } from '../components/3d/Sanctuary';
import { BezelLayout, HUDStat } from '../components/ui/BezelLayout';
import { BottomHUD } from '../components/ui/hud/BottomHUD';
import { GameOverModal } from '../components/ui/hud/GameOverModal';
import { UpgradeModal } from '../components/ui/UpgradeModal';
import { destroyAudioBridge, initAudioBridge } from '../engine/audio/AudioBridge';
import { playHealSound, playHitSound, playSmiteSound } from '../engine/audio/SoundManager';
import {
  BUILDING_COST,
  BUILDING_SPAWN_INTERVAL,
  type Building,
  type BuildingType,
  CELL_SIZE,
  type Entity,
  GRID_SIZE,
  HP_SCALE_PER_WAVE,
  TILE,
  UNIT_STATS,
  type UnitType,
} from '../engine/constants';
import { findPathAStar } from '../engine/mapGenerator';
import { useGameStore } from '../store/useGameStore';
import { useMetaStore } from '../store/useMetaStore';
import { gridToWorld, worldToGrid } from '../utils/math';

/**
 * Renders a translucent placement preview box at a world position during building drag.
 *
 * @param position - The world-space center [x, y, z] of the preview box; pass `null` to hide it
 * @param valid - `true` when the current placement position is valid (uses green tint), `false` when invalid (uses red tint)
 * @returns The mesh used as the placement preview, or `null` when `position` is `null`
 */
function GhostMesh({
  position,
  valid,
}: {
  position: [number, number, number] | null;
  valid: boolean;
}) {
  if (!position) return null;
  return (
    <mesh position={position} renderOrder={10}>
      <boxGeometry args={[CELL_SIZE * 0.85, 1.5, CELL_SIZE * 0.85]} />
      <meshStandardMaterial
        color={valid ? '#00ff88' : '#ff4422'}
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Applies a per-frame positional jitter to the active scene camera based on the global cameraShake value.
 *
 * This component does not render any visible output; it mutates the camera each frame while the shake amount is greater than zero.
 *
 * @returns `null` — no visual elements are rendered
 */
function CameraRig() {
  // Store the camera's initial position so shake is applied as a temporary
  // offset rather than an additive accumulation that drifts the camera permanently.
  const basePosRef = useRef<THREE.Vector3 | null>(null);

  useFrame((state) => {
    if (!basePosRef.current) {
      basePosRef.current = state.camera.position.clone();
    }
    const shake = useGameStore.getState().cameraShake;
    if (shake > 0) {
      state.camera.position.x = basePosRef.current.x + (Math.random() - 0.5) * shake * 0.12;
      state.camera.position.y = basePosRef.current.y + (Math.random() - 0.5) * shake * 0.06;
    } else {
      // Restore exact base position when shake expires to avoid any residual drift
      state.camera.position.copy(basePosRef.current);
    }
  });
  return null;
}

// ─── Ground-plane raycaster for drag-drop ────────────────────────────────
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _ndcVec = new THREE.Vector2();
const _hitVec = new THREE.Vector3();

/**
 * Per-frame raycaster that projects NDC screen coordinates onto the world ground plane and reports hit positions.
 *
 * Calls `onHit` with the world-space intersection point on the ground plane (Y = 0) whenever `ndcRef.current`
 * contains valid normalized device coordinates and the ray intersects the plane during a frame.
 *
 * @param ndcRef - Mutable ref containing a `{ x, y }` pair of normalized device coordinates in clip space (range typically -1..1), or `null` when inactive.
 * @param onHit - Callback invoked with the intersection position (a `THREE.Vector3`) when a ray from the camera through `ndcRef` hits the ground plane.
 */
function SceneRaycaster({
  ndcRef,
  onHit,
}: {
  ndcRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onHit: (pos: THREE.Vector3) => void;
}) {
  const { camera, raycaster } = useThree();
  useFrame(() => {
    if (!ndcRef.current) return;
    _ndcVec.set(ndcRef.current.x, ndcRef.current.y);
    raycaster.setFromCamera(_ndcVec, camera);
    if (raycaster.ray.intersectPlane(_groundPlane, _hitVec)) onHit(_hitVec.clone());
  });
  return null;
}

// ─── Enemy wave composition ───────────────────────────────────────────────
let _eid = 0;
/**
 * Generates a unique enemy identifier.
 *
 * @returns A string identifier starting with `e_` followed by the current timestamp and a monotonically increasing counter (e.g. `e_1610000000000_1`).
 */
function genEnemyId() {
  return `e_${Date.now()}_${_eid++}`;
}

type EnemyType = Extract<UnitType, 'goblin' | 'orc' | 'troll' | 'boss'>;

/**
 * Build the list of enemy types that will spawn for a given wave.
 *
 * @param wave - The current wave number (1 = first wave; 0 is treated as no wave)
 * @returns An array of EnemyType describing the wave composition:
 * - Every 5th wave (wave % 5 === 0 and wave > 0): one `boss`, three `orc`, and three `goblin`.
 * - Waves 1–2: only `goblin`, with count = 3 + wave.
 * - Waves 3–5: two `orc` and `wave` `goblin`.
 * - Waves > 5: one `troll`, two `orc`, and up to `min(wave, 8)` `goblin`.
 */
function buildWaveList(wave: number): EnemyType[] {
  const list: EnemyType[] = [];

  // Every 5th wave is a Boss wave
  if (wave % 5 === 0 && wave > 0) {
    const bossCount = Math.floor(wave / 5);
    for (let i = 0; i < bossCount; i++) list.push('boss');
    list.push(...Array<EnemyType>(Math.floor(wave * 1.5)).fill('orc'));
    list.push(...Array<EnemyType>(Math.floor(wave * 2)).fill('goblin'));
  } else {
    // Normal wave scaling
    const goblinCount = Math.floor(wave * 2.5 + 3);
    const orcCount = wave >= 3 ? Math.floor(wave * 1.2) : 0;
    const trollCount = wave >= 5 ? Math.floor(wave / 2) : 0;

    list.push(...Array<EnemyType>(trollCount).fill('troll'));
    list.push(...Array<EnemyType>(orcCount).fill('orc'));
    list.push(...Array<EnemyType>(goblinCount).fill('goblin'));
  }

  return list;
}

import { resetYuka } from '../engine/ai/EntityManager';

// ─── Main Game Screen ───────────────────────────────────────────────────────
export default function GameScreen() {
  const router = useRouter();
  const gold = useGameStore((s) => s.gold);
  const health = useGameStore((s) => s.health);
  const wave = useGameStore((s) => s.wave);
  const phase = useGameStore((s) => s.phase);
  const smiteCd = useGameStore((s) => s.divineSmiteCooldown);
  const grid = useGameStore((s) => s.grid);
  const pathCoords = useGameStore((s) => s.pathCoords);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const announcement = useGameStore((s) => s.announcement);
  const unlocks = useMetaStore((s) => s.unlocks);
  const awardCoins = useMetaStore((s) => s.awardCoins);

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [upgradeBuildingId, setUpgradeBuildingId] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null);
  const [ghostValid, setGhostValid] = useState(false);
  const [gameOver, setGameOver] = useState<'playing' | 'victory' | 'defeat'>('playing');
  const [earnedCoins, setEarnedCoins] = useState(0);

  const ndcRef = useRef<{ x: number; y: number } | null>(null);
  // Track wave-spawn timeout IDs so they can be cancelled on unmount / game reset
  const spawnTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const autoGovernor = useGameStore((s) => s.autoGovernor);
  const setAutoGovernor = useGameStore((s) => s.setAutoGovernor);
  const triggerWave = useGameStore((s) => s.triggerWave);
  const setTriggerWave = useGameStore((s) => s.setTriggerWave);

  useEffect(() => {
    initAudioBridge();
    return () => destroyAudioBridge();
  }, []);

  // Cancel any pending spawn timers when the component unmounts
  useEffect(() => {
    return () => {
      for (const id of spawnTimersRef.current) clearTimeout(id);
    };
  }, []);

  // Stable ray-hit handler (runs from useFrame – must not re-create)
  const handleRayHit = useCallback(
    (pos: THREE.Vector3) => {
      if (!selectedBuilding) {
        setGhostPos(null);
        return;
      }
      const { x: gx, z: gz } = worldToGrid(pos.x, pos.z, CELL_SIZE);
      const { x: wx, z: wz } = gridToWorld(gx, gz, CELL_SIZE);
      setGhostPos([wx, 0.75, wz]);
      const tile = grid[gx]?.[gz];

      let isValid =
        gx >= 0 &&
        gx < GRID_SIZE &&
        gz >= 0 &&
        gz < GRID_SIZE &&
        gold >= BUILDING_COST[selectedBuilding] &&
        (selectedBuilding === 'wall'
          ? tile === TILE.PATH || tile === TILE.GRASS
          : tile === TILE.GRASS);

      // If we are placing something that might block the path, ensure a path still exists
      if (isValid && (selectedBuilding === 'wall' || tile === TILE.PATH)) {
        const testGrid = grid.map((row) => [...row]);
        testGrid[gx][gz] = selectedBuilding === 'wall' ? TILE.BARRICADE : TILE.BUILDING;
        const store = useGameStore.getState();
        const spawnPt = store.pathCoords[0] || { x: 0, z: store.spawnZ };
        const path = findPathAStar(testGrid, spawnPt, { x: 10, z: 11 });
        if (!path) isValid = false;
      }

      setGhostValid(isValid);
    },
    [selectedBuilding, grid, gold],
  );

  // Touch drag for building placement
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !!selectedBuilding,
    onMoveShouldSetPanResponder: () => !!selectedBuilding,
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      ndcRef.current = {
        x: (locationX / screenW) * 2 - 1,
        y: -(locationY / screenH) * 2 + 1,
      };
    },
    onPanResponderRelease: () => {
      if (ghostPos && ghostValid && selectedBuilding) {
        const { x: gx, z: gz } = worldToGrid(ghostPos[0], ghostPos[2], CELL_SIZE);
        const store = useGameStore.getState();
        if (store.spendGold(BUILDING_COST[selectedBuilding])) {
          const buildingId = `b_${Date.now()}`;
          const building: Building = {
            id: buildingId,
            type: selectedBuilding,
            gridX: gx,
            gridZ: gz,
            levelSpawn: 1,
            levelStats: 1,
            // Full interval delay so there's no instant spawn on placement
            timer: BUILDING_SPAWN_INTERVAL[selectedBuilding],
          };
          store.addBuilding(building);

          // Spawn wall or tower as a unit so it has HP and can be attacked/attack
          const isUnitBuilding = ['wall', 'turret', 'ballista', 'cannon', 'catapult'].includes(
            selectedBuilding,
          );
          if (isUnitBuilding) {
            const stats = UNIT_STATS[selectedBuilding as UnitType];
            store.spawnUnit({
              id: buildingId, // Share ID so we know they are linked
              type: selectedBuilding as UnitType,
              team: 'ally',
              maxHp: stats.maxHp,
              hp: stats.maxHp,
              damage: stats.damage,
              speed: stats.speed,
              attackRange: stats.attackRange,
              attackSpeed: stats.attackSpeed,
              cooldown: 0,
              position: { x: ghostPos[0], y: 0, z: ghostPos[2] },
              targetId: null,
              pathIndex: -1,
              isHealer: false,
            });
          }

          store.triggerCameraShake(0.25);
          emitDust([ghostPos[0], 0.8, ghostPos[2]], 15);
        }
      }
      ndcRef.current = null;
      setGhostPos(null);
    },
  });

  // Wave launcher
  const handleStartWave = useCallback(() => {
    const store = useGameStore.getState();
    store.nextWave();
    // Re-read after nextWave() so we get the incremented wave number, not the
    // stale snapshot captured in `store` before the call.
    const currentWave = useGameStore.getState().wave;
    const toSpawn = buildWaveList(currentWave);
    const spawnPt = pathCoords[0];
    const { x: swx, z: swz } = gridToWorld(spawnPt.x, spawnPt.z, CELL_SIZE);
    const hpScale = 1.0 + currentWave * HP_SCALE_PER_WAVE;

    // Cancel any leftover timers from a previous wave that may not have finished
    for (const id of spawnTimersRef.current) clearTimeout(id);
    spawnTimersRef.current = [];

    toSpawn.forEach((type, i) => {
      const id = setTimeout(() => {
        const stats = UNIT_STATS[type];
        const entity: Entity = {
          id: genEnemyId(),
          type,
          team: 'enemy',
          maxHp: Math.round(stats.maxHp * hpScale),
          hp: Math.round(stats.maxHp * hpScale),
          damage: stats.damage,
          speed: stats.speed,
          attackRange: stats.attackRange,
          attackSpeed: stats.attackSpeed,
          cooldown: 0,
          position: {
            x: swx + (Math.random() - 0.5) * 0.6,
            y: 0,
            z: swz + (Math.random() - 0.5) * 0.6,
          },
          targetId: null,
          pathIndex: 0,
          isHealer: false,
          reward: stats.reward,
        };
        useGameStore.getState().spawnUnit(entity);
      }, i * 900);
      spawnTimersRef.current.push(id);
    });

    const isBoss = currentWave % 5 === 0 && currentWave > 0;
    store.setAnnouncement(isBoss ? `⚠ BOSS WAVE ${currentWave} ⚠` : `⚔ Wave ${currentWave}`);
    const annoId = setTimeout(() => useGameStore.getState().setAnnouncement(''), 2500);
    spawnTimersRef.current.push(annoId);
  }, [pathCoords]);

  // Handle external trigger for wave (e.g. from Auto-Governor)
  useEffect(() => {
    if (triggerWave) {
      setTriggerWave(false);
      handleStartWave();
    }
  }, [triggerWave, handleStartWave, setTriggerWave]);

  // Divine Smite (AoE all enemies)
  const handleDivineSmite = useCallback(() => {
    const store = useGameStore.getState();
    if (store.divineSmiteCooldown > 0) return;
    store.setDivineSmiteCooldown(15);
    const enemies = Object.values(store.units).filter((u) => u.team === 'enemy');
    playSmiteSound();
    for (const u of enemies) {
      store.damageUnit(u.id, 250);
      emitParticles([u.position.x, 1, u.position.z], '#ffdd00', 12);
    }
    store.triggerCameraShake(0.9);
  }, []);

  // Speed toggle: 1× → 2× → 3× → 1×
  const handleSpeedToggle = useCallback(() => {
    const cur = useGameStore.getState().gameSpeed;
    useGameStore.setState({ gameSpeed: cur >= 3 ? 1 : cur + 1 });
  }, []);

  // Game-over detection
  useEffect(() => {
    if (gameOver === 'playing') {
      if (health <= 0) {
        const coins = wave * 10;
        awardCoins(coins);
        setEarnedCoins(coins);
        setGameOver('defeat');
      } else if (wave >= 15 && phase === 'build') {
        const coins = wave * 10 + 500; // Bonus for winning
        awardCoins(coins);
        setEarnedCoins(coins);
        setGameOver('victory');
      }
    }
  }, [health, wave, gameOver, phase, awardCoins]);

  const handleRestart = useCallback(() => {
    // Cancel any pending wave-spawn timers before resetting
    for (const id of spawnTimersRef.current) clearTimeout(id);
    spawnTimersRef.current = [];
    setGameOver('playing');
    setSelectedBuilding(null);
    setGhostPos(null);
    resetYuka();
    useGameStore.getState().resetGame();
  }, []);

  const handleMenu = useCallback(() => {
    // Cancel any pending wave-spawn timers before navigating away
    for (const id of spawnTimersRef.current) clearTimeout(id);
    spawnTimersRef.current = [];
    useGameStore.getState().resetGame();
    router.replace('/');
  }, [router]);

  return (
    <BezelLayout
      topContent={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HUDStat label="⚔" value={`W${wave}`} />
          <HUDStat label="❤" value={health} color={health <= 5 ? '#ff4444' : '#3e2723'} />
          <HUDStat label="💰" value={gold} />
          <View style={{ flex: 1 }} />
          <Text
            style={{
              color: phase === 'build' ? '#44aa44' : '#cc3300',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            {phase === 'build' ? '[ BUILD ]' : '[ DEFEND! ]'}
          </Text>
        </View>
      }
      bottomContent={
        <BottomHUD
          selectedBuilding={selectedBuilding}
          onSelectBuilding={(t) => setSelectedBuilding((p) => (p === t ? null : t))}
          phase={phase}
          onStartWave={handleStartWave}
          smiteCd={smiteCd}
          onDivineSmite={handleDivineSmite}
          onHealSpell={() => {
            const store = useGameStore.getState();
            if (store.castHealSpell()) {
              playHealSound();
            }
          }}
          onFreezeSpell={() => {
            const store = useGameStore.getState();
            if (store.castFreezeSpell()) {
              playHitSound(); // generic icy hit sound
            }
          }}
          gold={gold}
          unlocks={unlocks}
          gameSpeed={gameSpeed}
          onSpeedToggle={handleSpeedToggle}
          autoGovernor={autoGovernor}
          onAutoGovernorToggle={() => setAutoGovernor(!autoGovernor)}
        />
      }
    >
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <Canvas
          camera={{ position: [0, 22, 20], fov: 52, near: 0.1, far: 220 }}
          shadows
          style={{ flex: 1 }}
        >
          <GameScene
            ghostPos={ghostPos}
            ghostValid={ghostValid}
            ndcRef={ndcRef}
            onRayHit={handleRayHit}
            autoGovernor={autoGovernor}
            setUpgradeBuildingId={setUpgradeBuildingId}
          />
        </Canvas>
      </View>

      {/* Wave / event announcement overlay */}
      {announcement !== '' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(28,10,4,0.85)',
              borderWidth: 2,
              borderColor: '#ffd700',
              borderRadius: 12,
              paddingHorizontal: 28,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{ color: '#ffd700', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}
            >
              {announcement}
            </Text>
          </View>
        </View>
      )}

      {/* Placement hint when building is selected */}
      {selectedBuilding && gameOver === 'playing' && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' }}
        >
          <Text
            style={{
              color: '#ffd700',
              backgroundColor: 'rgba(0,0,0,0.55)',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            Drag to place • tap again to cancel
          </Text>
        </View>
      )}

      <GameOverModal
        visible={gameOver !== 'playing'}
        state={gameOver !== 'playing' ? gameOver : 'defeat'}
        wave={wave}
        coins={earnedCoins}
        onRestart={handleRestart}
        onMenu={handleMenu}
      />
      <UpgradeModal buildingId={upgradeBuildingId} onClose={() => setUpgradeBuildingId(null)} />
    </BezelLayout>
  );
}
