import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE, TILE } from '../../engine/constants';
import { generateNoiseTexture } from '../../engine/textureUtils';
import { useGameStore } from '../../store/useGameStore';

const HALF = (GRID_SIZE * CELL_SIZE) / 2;

/**
 * Map a tile type identifier to its display color.
 *
 * @param tileId - Numeric tile type identifier (one of the TILE constants)
 * @returns A THREE.Color corresponding to the tile type for use when rendering the grid
 */
function tileColor(tileId: number): THREE.Color {
  switch (tileId) {
    case TILE.PATH:
      return new THREE.Color(0.55, 0.42, 0.25);
    case TILE.SANCTUARY:
      return new THREE.Color(0.8, 0.7, 0.3);
    case TILE.SPAWN:
      return new THREE.Color(0.7, 0.2, 0.2);
    case TILE.SCENERY:
      return new THREE.Color(0.15, 0.45, 0.1);
    case TILE.BARRICADE:
      return new THREE.Color(0.4, 0.3, 0.2);
    default:
      return new THREE.Color(0.25, 0.6, 0.15);
  }
}

/**
 * Renders the scene's tile grid as a single instanced mesh centered at the origin.
 *
 * Reads the current grid from the game store and updates per-instance transforms and colors
 * whenever the grid changes. Each instance represents a ground tile and uses a generated
 * grass noise texture for its material.
 *
 * @returns The React element containing the instanced mesh of tiles
 */
export function MapGrid() {
  const grid = useGameStore((s) => s.grid);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const count = GRID_SIZE * GRID_SIZE;
  const grassTex = useMemo(() => generateNoiseTexture('grass_col'), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const idx = x * GRID_SIZE + z;
        const wx = x * CELL_SIZE - HALF + CELL_SIZE / 2;
        const wz = z * CELL_SIZE - HALF + CELL_SIZE / 2;
        dummy.position.set(wx, 0, wz);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);
        color.copy(tileColor(grid[x][z]));
        meshRef.current.setColorAt(idx, color);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [grid]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[CELL_SIZE - 0.05, 0.2, CELL_SIZE - 0.05]} />
      <meshStandardMaterial map={grassTex} roughnessMap={grassTex} />
    </instancedMesh>
  );
}

/**
 * Renders instanced scenery objects (cones) at grid cells marked as SCENERY.
 *
 * Each instance is positioned at the center of its grid cell, given a deterministic scale variation, and textured with a stone noise map.
 *
 * @returns A React element containing an instanced mesh of scenery cones, or `null` if there are no scenery positions.
 */
export function SceneryInstances() {
  const grid = useGameStore((s) => s.grid);
  const stoneTex = useMemo(() => generateNoiseTexture('stone_col'), []);

  const positions = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        if (grid[x][z] === TILE.SCENERY) {
          const wx = x * CELL_SIZE - HALF + CELL_SIZE / 2;
          const wz = z * CELL_SIZE - HALF + CELL_SIZE / 2;
          pts.push([wx, 0.6, wz]);
        }
      }
    }
    return pts;
  }, [grid]);

  const treeRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!treeRef.current) return;
    const dummy = new THREE.Object3D();
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(
        0.8 + Math.sin(i * 13.7) * 0.3,
        1.0 + Math.sin(i * 7.3) * 0.5,
        0.8 + Math.sin(i * 11.1) * 0.3,
      );
      dummy.updateMatrix();
      treeRef.current?.setMatrixAt(i, dummy.matrix);
    });
    treeRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh ref={treeRef} args={[undefined, undefined, positions.length]} castShadow>
      <coneGeometry args={[0.5, 1.5, 6]} />
      <meshStandardMaterial map={stoneTex} color="#2d5a27" />
    </instancedMesh>
  );
}
