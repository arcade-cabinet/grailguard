import { useFrame, useThree } from '@react-three/fiber';
import type React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { CELL_SIZE } from '../../../engine/constants';
import { useGameStore } from '../../../store/useGameStore';

/**
 * Renders a translucent placement preview box at a world position during building drag.
 */
export function GhostMesh({
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
 */
export function CameraRig() {
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
      state.camera.position.copy(basePosRef.current);
    }
  });
  return null;
}

const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _ndcVec = new THREE.Vector2();
const _hitVec = new THREE.Vector3();

/**
 * Per-frame raycaster that projects NDC screen coordinates onto the world ground plane and reports hit positions.
 */
export function SceneRaycaster({
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
