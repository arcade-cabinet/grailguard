import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';

const MODEL_URLS: Record<string, string> = {
  barbarian: '/assets/models/barbarian.glb',
  knight: '/assets/models/knight.glb',
  mage: '/assets/models/mage.glb',
  ranger: '/assets/models/ranger.glb',
  rogue: '/assets/models/rogue.glb',
  'skeleton-mage': '/assets/models/skeleton-mage.glb',
  'skeleton-minion': '/assets/models/skeleton-minion.glb',
  'skeleton-warrior': '/assets/models/skeleton-warrior.glb',
  orc: '/assets/models/orc.glb',
};

// Preload unit models
for (const url of Object.values(MODEL_URLS)) {
  useGLTF.preload(url);
}

const TYPE_TO_MODEL: Record<string, string> = {
  militia: 'barbarian',
  archer: 'ranger',
  cleric: 'mage',
  knight: 'knight',
  goblin: 'skeleton-minion',
  orc: 'skeleton-warrior',
  troll: 'orc',
  boss: 'skeleton-mage',
};

// Pre-baked integer colours – no allocations inside useFrame
const TYPE_COLOR: Record<string, number> = {
  wall: 0x887766,
  militia: 0x44aa44,
  archer: 0x22cc88,
  cleric: 0xeeeeff,
  knight: 0x8899cc,
  goblin: 0xaa6600,
  orc: 0x775522,
  troll: 0x554433,
  boss: 0xff1111,
};

interface UnitMeshProps {
  /** Entity ID only — mesh reads live position from the store in useFrame,
   *  so React never re-renders this component for position/HP changes. */
  entityId: string;
}

/**
 * Renders a 3D unit mesh and its HP bar, updating transforms and HP visuals each frame without causing React re-renders for position or HP changes.
 *
 * @param entityId - The game entity identifier of the unit to render
 * @returns The React Three Fiber group for the unit, or `null` if the unit no longer exists
 */
export function UnitMesh({ entityId }: UnitMeshProps) {
  // ── All hooks MUST come before any conditional returns ────────────────
  const meshRef = useRef<THREE.Group>(null);
  const hpBgRef = useRef<THREE.Mesh>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);
  const hpMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Read ONCE for initial JSX (no subscription → no re-renders on state change)
  const snap = useGameStore.getState().units[entityId];

  const isWall = snap?.type === 'wall';
  const isBuildingUnit =
    snap && ['wall', 'turret', 'ballista', 'cannon', 'catapult'].includes(snap.type);
  const isEnemy = snap && ['goblin', 'orc', 'troll', 'boss'].includes(snap.type);
  const modelName = snap ? TYPE_TO_MODEL[snap.type] || 'knight' : 'knight';

  // Load the GLTF scene via the static middleware URL
  const { scene } = useGLTF(MODEL_URLS[modelName] ?? MODEL_URLS.knight);

  // Clone the scene so multiple units don't share identical mesh instances
  const clonedScene = useMemo(() => {
    if (isBuildingUnit) return null; // Buildings are rendered by BuildingMesh
    const clone = scene.clone();

    // Apply shadows on all inner meshes
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return clone;
  }, [scene, isBuildingUnit]);

  // Apply scale adjustments
  const scaleRef = useMemo(() => {
    return isEnemy ? 0.45 : 0.4;
  }, [isEnemy]);

  // Every frame: read entity from store and imperatively update mesh transforms.
  // No React re-render triggered – only mesh refs mutated.
  useFrame((state) => {
    const e = useGameStore.getState().units[entityId];
    if (!e || !meshRef.current) return;

    const baseY = e.type === 'wall' ? 0.5 : 0.35;
    const t = state.clock.elapsedTime;
    const bob = isBuildingUnit ? 0 : Math.abs(Math.sin(t * e.speed * 2.5)) * 0.12;

    if (meshRef.current) {
      meshRef.current.position.set(e.position.x, baseY + bob, e.position.z);
    }

    // HP bar background + fill follow unit in world space
    const ratio = Math.max(0, e.hp / e.maxHp);
    const barY = baseY + (e.type === 'wall' ? 1.3 : 0.9);

    if (hpBgRef.current) {
      hpBgRef.current.position.set(e.position.x, barY, e.position.z);
    }
    if (hpBarRef.current) {
      // Anchor left edge so bar shrinks rightward
      hpBarRef.current.position.set(e.position.x - (1 - ratio) * 0.4, barY, e.position.z);
      hpBarRef.current.scale.x = Math.max(0.01, ratio);
    }
    if (hpMatRef.current) {
      hpMatRef.current.color.setHex(ratio > 0.6 ? 0x22dd22 : ratio > 0.3 ? 0xffaa00 : 0xff2222);
    }
  });

  if (!snap) return null; // Safe to return now that all hooks have been called

  const baseY = isWall ? 0.5 : 0.35;

  return (
    <group ref={meshRef}>
      {/* Unit body */}
      {!isBuildingUnit && clonedScene && (
        <primitive object={clonedScene} position={[0, 0, 0]} scale={scaleRef} />
      )}

      {/* HP bar (hidden for walls) */}
      {!isWall && (
        <>
          {/* grey background */}
          <mesh
            ref={hpBgRef}
            position={[snap.position.x, baseY + 1.2, snap.position.z]}
            renderOrder={4}
          >
            <planeGeometry args={[0.82, 0.1]} />
            <meshBasicMaterial color={0x333333} depthTest={false} />
          </mesh>
          {/* coloured fill */}
          <mesh
            ref={hpBarRef}
            position={[snap.position.x, baseY + 1.2, snap.position.z]}
            renderOrder={5}
          >
            <planeGeometry args={[0.8, 0.08]} />
            <meshBasicMaterial ref={hpMatRef} color={0x22dd22} depthTest={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
