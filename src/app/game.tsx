import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import { useMetaStore } from '../store/useMetaStore';
import { BezelLayout, HUDStat } from '../components/ui/BezelLayout';
import { Environment } from '../components/3d/Environment';
import { MapGrid, SceneryInstances } from '../components/3d/MapGrid';
import { Sanctuary } from '../components/3d/Sanctuary';
import { ParticleSystem } from '../components/3d/ParticleSystem';
import { CombatController } from '../components/3d/CombatController';
import { BuildingController } from '../components/3d/BuildingController';
import { UnitMesh } from '../components/3d/Entities/UnitMesh';
import { BuildingMesh } from '../components/3d/Entities/BuildingMesh';
import {
  BUILDING_COST,
  BuildingType,
  UnitType,
  TILE,
  CELL_SIZE,
  HALF_GRID,
  GRID_SIZE,
  Building,
  Entity,
  UNIT_STATS,
} from '../engine/constants';
import { worldToGrid, gridToWorld } from '../utils/math';
import * as THREE from 'three';
import { useRouter } from 'expo-router';

// ---- Ghost mesh shown during drag ----
interface GhostMeshProps {
  position: [number, number, number] | null;
  valid: boolean;
}

function GhostMesh({ position, valid }: GhostMeshProps) {
  if (!position) return null;
  return (
    <mesh position={position} renderOrder={10}>
      <boxGeometry args={[CELL_SIZE * 0.8, 1.5, CELL_SIZE * 0.8]} />
      <meshStandardMaterial
        color={valid ? '#00ff88' : '#ff4422'}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---- Camera shake rig ----
function CameraRig() {
  const cameraShake = useGameStore((s) => s.cameraShake);
  useFrame((state) => {
    if (cameraShake > 0) {
      state.camera.position.x += (Math.random() - 0.5) * cameraShake * 0.1;
      state.camera.position.y += (Math.random() - 0.5) * cameraShake * 0.05;
    }
  });
  return null;
}

// ---- Raycaster for drag-drop ----
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface SceneRaycasterProps {
  ndcRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onHit: (pos: THREE.Vector3) => void;
}

function SceneRaycaster({ ndcRef, onHit }: SceneRaycasterProps) {
  const { camera, raycaster } = useThree();
  const intersect = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!ndcRef.current) return;
    raycaster.setFromCamera(
      new THREE.Vector2(ndcRef.current.x, ndcRef.current.y),
      camera
    );
    if (raycaster.ray.intersectPlane(groundPlane, intersect.current)) {
      onHit(intersect.current.clone());
    }
  });

  return null;
}

// ---- Main game scene ----
interface GameSceneProps {
  ghostPos: [number, number, number] | null;
  ghostValid: boolean;
  ndcRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onRayHit: (pos: THREE.Vector3) => void;
}

function GameScene({ ghostPos, ghostValid, ndcRef, onRayHit }: GameSceneProps) {
  const units = useGameStore((s) => s.units);
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
      {Object.values(buildings).map((b) => (
        <BuildingMesh key={b.id} building={b} />
      ))}
      {Object.values(units).map((u) => (
        <UnitMesh key={u.id} entity={u} />
      ))}
      <ParticleSystem emitEvents={[]} />
    </>
  );
}

// ---- Wave spawner ID generator ----
let _eid = 0;
function genEnemyId() { return `e_${Date.now()}_${_eid++}`; }

// ---- HUD Bottom Bar ----
const BUILDING_LABELS: Record<BuildingType, string> = {
  wall: '🧱 Wall\n25g',
  hut: '🏠 Hut\n50g',
  range: '🏹 Range\n100g',
  temple: '⛪ Temple\n150g',
  keep: '🏰 Keep\n200g',
};

interface BottomHUDProps {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (t: BuildingType) => void;
  phase: 'build' | 'defend';
  onStartWave: () => void;
  divineSmiteCooldown: number;
  onDivineSmite: () => void;
  gold: number;
  unlocks: Record<BuildingType, boolean>;
}

function BottomHUD({
  selectedBuilding,
  onSelectBuilding,
  phase,
  onStartWave,
  divineSmiteCooldown,
  onDivineSmite,
  gold,
  unlocks,
}: BottomHUDProps) {
  const buildingTypes: BuildingType[] = ['wall', 'hut', 'range', 'temple', 'keep'];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      {buildingTypes
        .filter((t) => unlocks[t])
        .map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => onSelectBuilding(t)}
            style={{
              backgroundColor:
                selectedBuilding === t ? '#5c4033' : '#3e2723',
              borderWidth: 1,
              borderColor: '#5c4033',
              borderRadius: 6,
              padding: 6,
              minWidth: 56,
              alignItems: 'center',
              opacity: gold >= BUILDING_COST[t] ? 1 : 0.5,
            }}
          >
            <Text style={{ color: '#eaddcf', fontSize: 10, textAlign: 'center' }}>
              {BUILDING_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}

      <View style={{ flex: 1 }} />

      {/* Divine Smite */}
      <TouchableOpacity
        onPress={onDivineSmite}
        disabled={divineSmiteCooldown > 0}
        style={{
          backgroundColor: divineSmiteCooldown > 0 ? '#444' : '#8833aa',
          borderRadius: 6,
          padding: 8,
          alignItems: 'center',
          minWidth: 64,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10 }}>☄ Smite</Text>
        {divineSmiteCooldown > 0 && (
          <Text style={{ color: '#aaa', fontSize: 9 }}>
            {Math.ceil(divineSmiteCooldown)}s
          </Text>
        )}
      </TouchableOpacity>

      {/* Start Wave */}
      {phase === 'build' && (
        <TouchableOpacity
          onPress={onStartWave}
          style={{
            backgroundColor: '#cc3300',
            borderRadius: 6,
            padding: 8,
            alignItems: 'center',
            minWidth: 72,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
            ⚔ Send Wave
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---- Main Screen ----
export default function GameScreen() {
  const router = useRouter();
  const gold = useGameStore((s) => s.gold);
  const health = useGameStore((s) => s.health);
  const wave = useGameStore((s) => s.wave);
  const phase = useGameStore((s) => s.phase);
  const divineSmiteCooldown = useGameStore((s) => s.divineSmiteCooldown);
  const grid = useGameStore((s) => s.grid);
  const pathCoords = useGameStore((s) => s.pathCoords);
  const unlocks = useMetaStore((s) => s.unlocks);
  const { awardCoins } = useMetaStore();

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null);
  const [ghostValid, setGhostValid] = useState(false);

  const ndcRef = useRef<{ x: number; y: number } | null>(null);
  const { width: screenW, height: screenH } = Dimensions.get('window');

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
      const isWall = selectedBuilding === 'wall';
      const valid =
        gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE &&
        gold >= BUILDING_COST[selectedBuilding] &&
        (isWall ? tile === TILE.PATH : tile === TILE.GRASS);
      setGhostValid(valid);
    },
    [selectedBuilding, grid, gold]
  );

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
        const cost = BUILDING_COST[selectedBuilding];

        const store = useGameStore.getState();
        if (store.spendGold(cost)) {
          const building: Building = {
            id: `b_${Date.now()}`,
            type: selectedBuilding,
            gridX: gx,
            gridZ: gz,
            levelSpawn: 1,
            levelStats: 1,
            timer: 0,
          };
          store.addBuilding(building);
          store.triggerCameraShake(0.3);
        }
      }
      ndcRef.current = null;
      setGhostPos(null);
    },
  });

  const handleStartWave = useCallback(() => {
    const store = useGameStore.getState();
    store.nextWave();
    const currentWave = store.wave;

    const isBoss = currentWave % 5 === 0 && currentWave > 0;

    // Use UnitType from constants to avoid duplicating the union
    type EnemyUnitType = Extract<UnitType, 'goblin' | 'orc' | 'troll' | 'boss'>;
    let toSpawn: EnemyUnitType[];

    if (isBoss) {
      toSpawn = ['boss', 'orc', 'orc', 'goblin', 'goblin'];
    } else if (currentWave < 3) {
      toSpawn = Array<EnemyUnitType>(3 + currentWave).fill('goblin');
    } else if (currentWave < 6) {
      toSpawn = [
        ...Array<EnemyUnitType>(2).fill('orc'),
        ...Array<EnemyUnitType>(currentWave).fill('goblin'),
      ];
    } else {
      toSpawn = [
        'troll',
        'orc',
        'orc',
        ...Array<EnemyUnitType>(currentWave).fill('goblin'),
      ];
    }

    const spawnPt = pathCoords[0];
    const { x: swx, z: swz } = gridToWorld(spawnPt.x, spawnPt.z, CELL_SIZE);

    const spawnDelay = 800; // ms between spawns

    toSpawn.forEach((type, i) => {
      setTimeout(() => {
        const stats = UNIT_STATS[type];
        const hpScale = 1.0 + currentWave * 0.15;
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
            x: swx + (Math.random() - 0.5) * 0.5,
            y: 0,
            z: swz + (Math.random() - 0.5) * 0.5,
          },
          targetId: null,
          pathIndex: 0,
          isHealer: false,
          reward: stats.reward,
        };
        useGameStore.getState().spawnUnit(entity);
      }, i * spawnDelay);
    });
  }, [pathCoords]);

  const handleDivineSmite = useCallback(() => {
    const store = useGameStore.getState();
    if (store.divineSmiteCooldown > 0) return;
    store.setDivineSmiteCooldown(15);
    // AoE damage to all enemies
    const { units } = store;
    for (const [id, unit] of Object.entries(units)) {
      if (unit.team === 'enemy') {
        store.damageUnit(id, 250);
      }
    }
    store.triggerCameraShake(0.8);
  }, []);

  // Game over check
  React.useEffect(() => {
    if (health <= 0) {
      const earnedCoins = wave * 10;
      awardCoins(earnedCoins);
      router.replace('/');
    }
  }, [health, wave, awardCoins, router]);

  return (
    <BezelLayout
      topContent={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HUDStat label="⚔" value={wave} />
          <HUDStat label="❤" value={health} color={health < 5 ? '#ff4444' : '#3e2723'} />
          <HUDStat label="💰" value={gold} />
          <Text style={{ color: '#5c4033', fontSize: 10, marginLeft: 8 }}>
            {phase === 'build' ? '[ BUILD PHASE ]' : '[ DEFEND! ]'}
          </Text>
        </View>
      }
      bottomContent={
        <BottomHUD
          selectedBuilding={selectedBuilding}
          onSelectBuilding={(t) =>
            setSelectedBuilding((prev) => (prev === t ? null : t))
          }
          phase={phase}
          onStartWave={handleStartWave}
          divineSmiteCooldown={divineSmiteCooldown}
          onDivineSmite={handleDivineSmite}
          gold={gold}
          unlocks={unlocks}
        />
      }
    >
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <Canvas
          camera={{ position: [0, 20, 18], fov: 55, near: 0.1, far: 200 }}
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
    </BezelLayout>
  );
}
