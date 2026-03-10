import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import { useMetaStore } from '../store/useMetaStore';
import { BezelLayout, HUDStat } from '../components/ui/BezelLayout';
import { Environment } from '../components/3d/Environment';
import { MapGrid, SceneryInstances } from '../components/3d/MapGrid';
import { Sanctuary } from '../components/3d/Sanctuary';
import { ParticleSystem, emitParticles } from '../components/3d/ParticleSystem';
import { FloatingTextSystem } from '../components/3d/FloatingTextSystem';
import { CombatController } from '../components/3d/CombatController';
import { BuildingController } from '../components/3d/BuildingController';
import { UnitMesh } from '../components/3d/Entities/UnitMesh';
import { BuildingMesh } from '../components/3d/Entities/BuildingMesh';
import {
  BUILDING_COST,
  BUILDING_SPAWN_INTERVAL,
  BuildingType,
  UnitType,
  TILE,
  CELL_SIZE,
  GRID_SIZE,
  Building,
  Entity,
  UNIT_STATS,
  HP_SCALE_PER_WAVE,
} from '../engine/constants';
import { worldToGrid, gridToWorld } from '../utils/math';
import * as THREE from 'three';
import { useRouter } from 'expo-router';

// ─── Ghost mesh shown during building drag ────────────────────────────────
function GhostMesh({ position, valid }: { position: [number, number, number] | null; valid: boolean }) {
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

// ─── Camera rig (shake only) ──────────────────────────────────────────────
function CameraRig() {
  useFrame((state) => {
    const shake = useGameStore.getState().cameraShake;
    if (shake > 0) {
      state.camera.position.x += (Math.random() - 0.5) * shake * 0.12;
      state.camera.position.y += (Math.random() - 0.5) * shake * 0.06;
    }
  });
  return null;
}

// ─── Ground-plane raycaster for drag-drop ────────────────────────────────
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _ndcVec = new THREE.Vector2();
const _hitVec = new THREE.Vector3();

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

// ─── Entire 3-D scene ────────────────────────────────────────────────────
function GameScene({
  ghostPos,
  ghostValid,
  ndcRef,
  onRayHit,
}: {
  ghostPos: [number, number, number] | null;
  ghostValid: boolean;
  ndcRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onRayHit: (pos: THREE.Vector3) => void;
}) {
  // Subscribe to low-frequency unitIds (NOT to units directly).
  // React only re-renders when units are added/removed, not on position updates.
  const unitIds   = useGameStore((s) => s.unitIds);
  const buildings = useGameStore((s) => s.buildings);

  return (
    <>
      <Environment />
      <CameraRig />
      <MapGrid />
      <SceneryInstances />
      <Sanctuary />
      <CombatController />
      <BuildingController />
      <SceneRaycaster ndcRef={ndcRef} onHit={onRayHit} />
      <GhostMesh position={ghostPos} valid={ghostValid} />
      <ParticleSystem />
      <FloatingTextSystem />
      {Object.values(buildings).map((b) => (
        <BuildingMesh key={b.id} building={b} />
      ))}
      {/* UnitMesh receives only entityId and reads live state in useFrame */}
      {unitIds.map((id) => (
        <UnitMesh key={id} entityId={id} />
      ))}
    </>
  );
}

// ─── Enemy wave composition ───────────────────────────────────────────────
let _eid = 0;
function genEnemyId() { return `e_${Date.now()}_${_eid++}`; }

type EnemyType = Extract<UnitType, 'goblin' | 'orc' | 'troll' | 'boss'>;

function buildWaveList(wave: number): EnemyType[] {
  if (wave % 5 === 0 && wave > 0) {
    return ['boss', 'orc', 'orc', 'orc', 'goblin', 'goblin', 'goblin'];
  }
  if (wave <= 2) return Array<EnemyType>(3 + wave).fill('goblin');
  if (wave <= 5) return [...Array<EnemyType>(2).fill('orc'), ...Array<EnemyType>(wave).fill('goblin')];
  return ['troll', 'orc', 'orc', ...Array<EnemyType>(Math.min(wave, 8)).fill('goblin')];
}

// ─── Bottom HUD ───────────────────────────────────────────────────────────
const BUILDING_EMOJI: Record<BuildingType, string> = {
  wall: '🧱', hut: '🏠', range: '🏹', temple: '⛪', keep: '🏰',
};
const BUILDING_NAME: Record<BuildingType, string> = {
  wall: 'Wall', hut: 'Hut', range: 'Range', temple: 'Temple', keep: 'Keep',
};

function BottomHUD({
  selectedBuilding, onSelectBuilding, phase, onStartWave,
  smiteCd, onDivineSmite, gold, unlocks, gameSpeed, onSpeedToggle,
}: {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (t: BuildingType) => void;
  phase: 'build' | 'defend';
  onStartWave: () => void;
  smiteCd: number;
  onDivineSmite: () => void;
  gold: number;
  unlocks: Record<BuildingType, boolean>;
  gameSpeed: number;
  onSpeedToggle: () => void;
}) {
  const types: BuildingType[] = ['wall', 'hut', 'range', 'temple', 'keep'];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}
    >
      {types.filter((t) => unlocks[t]).map((t) => {
        const cost = BUILDING_COST[t];
        const canAfford = gold >= cost;
        const isSelected = selectedBuilding === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onSelectBuilding(t)}
            style={{
              backgroundColor: isSelected ? '#7a5540' : '#3e2723',
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? '#ffd700' : '#5c4033',
              borderRadius: 8,
              padding: 6,
              minWidth: 58,
              alignItems: 'center',
              opacity: canAfford ? 1 : 0.45,
            }}
          >
            <Text style={{ fontSize: 18 }}>{BUILDING_EMOJI[t]}</Text>
            <Text style={{ color: '#eaddcf', fontSize: 9 }}>{BUILDING_NAME[t]}</Text>
            <Text style={{ color: canAfford ? '#ffd700' : '#888', fontSize: 9 }}>{cost}g</Text>
          </TouchableOpacity>
        );
      })}

      <View style={{ width: 8 }} />

      {/* Divine Smite */}
      <TouchableOpacity
        onPress={onDivineSmite}
        disabled={smiteCd > 0}
        style={{
          backgroundColor: smiteCd > 0 ? '#333' : '#6622aa',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
          minWidth: 58,
          borderWidth: 1,
          borderColor: smiteCd > 0 ? '#555' : '#9944dd',
        }}
      >
        <Text style={{ fontSize: 16 }}>☄️</Text>
        <Text style={{ color: '#ddd', fontSize: 9 }}>Smite</Text>
        {smiteCd > 0 && <Text style={{ color: '#aaa', fontSize: 8 }}>{Math.ceil(smiteCd)}s</Text>}
      </TouchableOpacity>

      {/* Speed Toggle */}
      <TouchableOpacity
        onPress={onSpeedToggle}
        style={{
          backgroundColor: '#2a1a10',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#5c4033',
          minWidth: 44,
        }}
      >
        <Text style={{ color: '#ffd700', fontSize: 14, fontWeight: 'bold' }}>{gameSpeed}×</Text>
        <Text style={{ color: '#aaa', fontSize: 8 }}>speed</Text>
      </TouchableOpacity>

      {/* Send Wave */}
      {phase === 'build' && (
        <TouchableOpacity
          onPress={onStartWave}
          style={{
            backgroundColor: '#bb2200',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#ff4422',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>⚔ SEND</Text>
          <Text style={{ color: '#ffdddd', fontSize: 8 }}>WAVE</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Game Over modal ──────────────────────────────────────────────────────
function GameOverModal({
  visible, wave, coins, onRestart, onMenu,
}: {
  visible: boolean; wave: number; coins: number;
  onRestart: () => void; onMenu: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          backgroundColor: '#eaddcf', borderWidth: 3, borderColor: '#5c4033',
          borderRadius: 16, padding: 32, width: 300, alignItems: 'center',
        }}>
          <Text style={{ color: '#3e2723', fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>
            ☠ FALLEN
          </Text>
          <Text style={{ color: '#5c4033', fontSize: 13, marginBottom: 18, textAlign: 'center' }}>
            The Sacred Grail has been taken…
          </Text>
          <View style={{ backgroundColor: '#d4c5b0', borderRadius: 8, padding: 12, width: '100%', marginBottom: 20 }}>
            <Text style={{ color: '#3e2723', fontSize: 16, textAlign: 'center', marginBottom: 4 }}>
              Waves Survived:{' '}
              <Text style={{ fontWeight: 'bold' }}>{wave}</Text>
            </Text>
            <Text style={{ color: '#8B6914', fontSize: 16, textAlign: 'center' }}>
              Coins Earned:{' '}
              <Text style={{ fontWeight: 'bold' }}>⚜ {coins}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRestart}
            style={{
              backgroundColor: '#5c4033', borderRadius: 8,
              paddingHorizontal: 24, paddingVertical: 10,
              marginBottom: 8, width: '100%', alignItems: 'center',
            }}
          >
            <Text style={{ color: '#eaddcf', fontWeight: 'bold', fontSize: 15 }}>⚔ Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMenu}
            style={{
              backgroundColor: '#3e2723', borderRadius: 8,
              paddingHorizontal: 24, paddingVertical: 10,
              width: '100%', alignItems: 'center',
            }}
          >
            <Text style={{ color: '#eaddcf', fontSize: 13 }}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main game screen ─────────────────────────────────────────────────────
export default function GameScreen() {
  const router       = useRouter();
  const gold         = useGameStore((s) => s.gold);
  const health       = useGameStore((s) => s.health);
  const wave         = useGameStore((s) => s.wave);
  const phase        = useGameStore((s) => s.phase);
  const smiteCd      = useGameStore((s) => s.divineSmiteCooldown);
  const grid         = useGameStore((s) => s.grid);
  const pathCoords   = useGameStore((s) => s.pathCoords);
  const gameSpeed    = useGameStore((s) => s.gameSpeed);
  const announcement = useGameStore((s) => s.announcement);
  const unlocks      = useMetaStore((s) => s.unlocks);
  const awardCoins   = useMetaStore((s) => s.awardCoins);

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [ghostPos,   setGhostPos]   = useState<[number, number, number] | null>(null);
  const [ghostValid, setGhostValid] = useState(false);
  const [gameOver,   setGameOver]   = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const ndcRef = useRef<{ x: number; y: number } | null>(null);
  const { width: screenW, height: screenH } = Dimensions.get('window');

  // Stable ray-hit handler (runs from useFrame – must not re-create)
  const handleRayHit = useCallback(
    (pos: THREE.Vector3) => {
      if (!selectedBuilding) { setGhostPos(null); return; }
      const { x: gx, z: gz } = worldToGrid(pos.x, pos.z, CELL_SIZE);
      const { x: wx, z: wz } = gridToWorld(gx, gz, CELL_SIZE);
      setGhostPos([wx, 0.75, wz]);
      const tile = grid[gx]?.[gz];
      setGhostValid(
        gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE &&
        gold >= BUILDING_COST[selectedBuilding] &&
        (selectedBuilding === 'wall' ? tile === TILE.PATH : tile === TILE.GRASS),
      );
    },
    [selectedBuilding, grid, gold],
  );

  // Touch drag for building placement
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !!selectedBuilding,
    onMoveShouldSetPanResponder:  () => !!selectedBuilding,
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      ndcRef.current = {
        x:  (locationX / screenW) * 2 - 1,
        y: -(locationY / screenH) * 2 + 1,
      };
    },
    onPanResponderRelease: () => {
      if (ghostPos && ghostValid && selectedBuilding) {
        const { x: gx, z: gz } = worldToGrid(ghostPos[0], ghostPos[2], CELL_SIZE);
        const store = useGameStore.getState();
        if (store.spendGold(BUILDING_COST[selectedBuilding])) {
          const building: Building = {
            id: `b_${Date.now()}`,
            type: selectedBuilding,
            gridX: gx,
            gridZ: gz,
            levelSpawn: 1,
            levelStats: 1,
            // Full interval delay so there's no instant spawn on placement
            timer: BUILDING_SPAWN_INTERVAL[selectedBuilding],
          };
          store.addBuilding(building);
          store.triggerCameraShake(0.25);
          emitParticles([ghostPos[0], 0.8, ghostPos[2]], '#ffd700', 8);
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
    const currentWave = store.wave;
    const toSpawn = buildWaveList(currentWave);
    const spawnPt = pathCoords[0];
    const { x: swx, z: swz } = gridToWorld(spawnPt.x, spawnPt.z, CELL_SIZE);
    const hpScale = 1.0 + currentWave * HP_SCALE_PER_WAVE;

    toSpawn.forEach((type, i) => {
      setTimeout(() => {
        const stats = UNIT_STATS[type];
        const entity: Entity = {
          id: genEnemyId(),
          type,
          team: 'enemy',
          maxHp:  Math.round(stats.maxHp  * hpScale),
          hp:     Math.round(stats.maxHp  * hpScale),
          damage: stats.damage,
          speed:  stats.speed,
          attackRange:  stats.attackRange,
          attackSpeed:  stats.attackSpeed,
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
    });

    const isBoss = currentWave % 5 === 0 && currentWave > 0;
    store.setAnnouncement(isBoss ? `⚠ BOSS WAVE ${currentWave} ⚠` : `⚔ Wave ${currentWave}`);
    setTimeout(() => useGameStore.getState().setAnnouncement(''), 2500);
  }, [pathCoords]);

  // Divine Smite (AoE all enemies)
  const handleDivineSmite = useCallback(() => {
    const store = useGameStore.getState();
    if (store.divineSmiteCooldown > 0) return;
    store.setDivineSmiteCooldown(15);
    const enemies = Object.values(store.units).filter((u) => u.team === 'enemy');
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
    if (health <= 0 && !gameOver) {
      const coins = wave * 10;
      awardCoins(coins);
      setEarnedCoins(coins);
      setGameOver(true);
    }
  }, [health, wave, gameOver, awardCoins]);

  const handleRestart = useCallback(() => {
    setGameOver(false);
    setSelectedBuilding(null);
    setGhostPos(null);
    useGameStore.getState().resetGame();
  }, []);

  const handleMenu = useCallback(() => {
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
          <Text style={{
            color: phase === 'build' ? '#44aa44' : '#cc3300',
            fontSize: 10, fontWeight: 'bold',
          }}>
            {phase === 'build' ? '[ BUILD ]' : '[ DEFEND! ]'}
          </Text>
        </View>
      }
      bottomContent={
        <BottomHUD
          selectedBuilding={selectedBuilding}
          onSelectBuilding={(t) => setSelectedBuilding((p) => p === t ? null : t)}
          phase={phase}
          onStartWave={handleStartWave}
          smiteCd={smiteCd}
          onDivineSmite={handleDivineSmite}
          gold={gold}
          unlocks={unlocks}
          gameSpeed={gameSpeed}
          onSpeedToggle={handleSpeedToggle}
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
          />
        </Canvas>
      </View>

      {/* Wave / event announcement overlay */}
      {announcement !== '' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: '35%', left: 0, right: 0,
            alignItems: 'center',
          }}
        >
          <View style={{
            backgroundColor: 'rgba(28,10,4,0.85)',
            borderWidth: 2, borderColor: '#ffd700',
            borderRadius: 12, paddingHorizontal: 28, paddingVertical: 10,
          }}>
            <Text style={{ color: '#ffd700', fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}>
              {announcement}
            </Text>
          </View>
        </View>
      )}

      {/* Placement hint when building is selected */}
      {selectedBuilding && !gameOver && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' }}
        >
          <Text style={{
            color: '#ffd700', backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, fontSize: 11,
          }}>
            Drag to place  •  tap again to cancel
          </Text>
        </View>
      )}

      <GameOverModal
        visible={gameOver}
        wave={wave}
        coins={earnedCoins}
        onRestart={handleRestart}
        onMenu={handleMenu}
      />
    </BezelLayout>
  );
}
