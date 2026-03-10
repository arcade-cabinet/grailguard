import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';

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
  const meshRef = useRef<THREE.Mesh>(null);
  const hpBgRef = useRef<THREE.Mesh>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);
  const hpMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Every frame: read entity from store and imperatively update mesh transforms.
  // No React re-render triggered – only mesh refs mutated.
  useFrame((state) => {
    const e = useGameStore.getState().units[entityId];
    if (!e) return; // unit was removed — component unmounts next React tick

    const snap = useGameStore.getState().units[entityId];
    if (!snap) return;

    const baseY = snap.type === 'wall' ? 0.5 : 0.35;
    const t = state.clock.elapsedTime;
    const bob = snap.type === 'wall' ? 0 : Math.abs(Math.sin(t * snap.speed * 2.5)) * 0.12;

    if (meshRef.current) {
      meshRef.current.position.set(snap.position.x, baseY + bob, snap.position.z);
    }

    // HP bar background + fill follow unit in world space
    const ratio = Math.max(0, snap.hp / snap.maxHp);
    const barY = baseY + (snap.type === 'wall' ? 1.3 : 0.9);

    if (hpBgRef.current) {
      hpBgRef.current.position.set(snap.position.x, barY, snap.position.z);
    }
    if (hpBarRef.current) {
      // Anchor left edge so bar shrinks rightward
      hpBarRef.current.position.set(snap.position.x - (1 - ratio) * 0.4, barY, snap.position.z);
      hpBarRef.current.scale.x = Math.max(0.01, ratio);
    }
    if (hpMatRef.current) {
      hpMatRef.current.color.setHex(ratio > 0.6 ? 0x22dd22 : ratio > 0.3 ? 0xffaa00 : 0xff2222);
    }
  });

  // ── Read ONCE for initial JSX (no subscription → no re-renders on state change) ──
  const snap = useGameStore.getState().units[entityId];
  if (!snap) return null; // unit may have been removed between render cycle and mount

  const isWall = snap.type === 'wall';
  const isBoss = snap.type === 'boss';
  const isTroll = snap.type === 'troll';
  const baseY = isWall ? 0.5 : 0.35;
  const color = TYPE_COLOR[snap.type] ?? 0x4488ff;

  return (
    <group>
      {/* Unit body */}
      <mesh ref={meshRef} castShadow position={[snap.position.x, baseY, snap.position.z]}>
        {isWall ? (
          <boxGeometry args={[1.9, 2.1, 0.55]} />
        ) : isBoss ? (
          <sphereGeometry args={[0.55, 10, 10]} />
        ) : isTroll ? (
          <boxGeometry args={[0.65, 0.85, 0.65]} />
        ) : (
          <capsuleGeometry args={[0.22, 0.38, 4, 8]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={snap.type === 'knight' ? 0.65 : snap.type === 'boss' ? 0.3 : 0}
          emissive={snap.type === 'boss' ? 0x330000 : snap.type === 'cleric' ? 0x111122 : 0x000000}
          emissiveIntensity={snap.type === 'boss' ? 0.6 : 0.2}
        />
      </mesh>

      {/* HP bar (hidden for walls) */}
      {!isWall && (
        <>
          {/* grey background */}
          <mesh
            ref={hpBgRef}
            position={[snap.position.x, baseY + 0.9, snap.position.z]}
            renderOrder={4}
          >
            <planeGeometry args={[0.82, 0.1]} />
            <meshBasicMaterial color={0x333333} depthTest={false} />
          </mesh>
          {/* coloured fill */}
          <mesh
            ref={hpBarRef}
            position={[snap.position.x, baseY + 0.9, snap.position.z]}
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
