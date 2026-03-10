import { useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE, TILE } from '../../engine/constants';
import { useGameStore } from '../../store/useGameStore';

const HALF = (GRID_SIZE * CELL_SIZE) / 2;

/**
 * Map a tile type identifier to its display color tint.
 * With PBR textures, colors are used as subtle tints over the texture.
 */
function tileColor(tileId: number): THREE.Color {
  switch (tileId) {
    case TILE.PATH:
      return new THREE.Color(0.85, 0.75, 0.65); // warm tint over gravel
    case TILE.SANCTUARY:
      return new THREE.Color(1.0, 0.95, 0.7); // golden sanctuary glow
    case TILE.SPAWN:
      return new THREE.Color(0.9, 0.5, 0.4); // reddish warning tint
    case TILE.SCENERY:
      return new THREE.Color(0.4, 0.8, 0.3); // lush green for scenery
    case TILE.BARRICADE:
      return new THREE.Color(0.7, 0.6, 0.5); // stone/brick tint
    default:
      return new THREE.Color(0.7, 0.9, 0.6); // grass tiles — let texture show through
  }
}

/**
 * Configure a texture for seamless tiling across the grid.
 */
function setupTiling(tex: THREE.Texture, repeat = 2): THREE.Texture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/**
 * Renders the scene's tile grid as a single instanced mesh with real PBR textures.
 * Uses AmbientCG CC0 Grass001 for the base material (Color, NormalGL, Roughness).
 */
export function MapGrid() {
  const grid = useGameStore((s) => s.grid);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const count = GRID_SIZE * GRID_SIZE;

  // Load real PBR grass texture set
  const [grassColor, grassNormal, grassRoughness] = useTexture([
    '/assets/materials/Grass001/Color.jpg',
    '/assets/materials/Grass001/NormalGL.jpg',
    '/assets/materials/Grass001/Roughness.jpg',
  ]);

  // Configure tiling on all grass maps
  useEffect(() => {
    setupTiling(grassColor);
    setupTiling(grassNormal);
    setupTiling(grassRoughness);
  }, [grassColor, grassNormal, grassRoughness]);

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
      <meshStandardMaterial
        map={grassColor}
        normalMap={grassNormal}
        roughnessMap={grassRoughness}
        roughness={0.9}
        metalness={0.0}
      />
    </instancedMesh>
  );
}

/**
 * Renders instanced scenery objects (cones) at grid cells marked as SCENERY.
 * Uses a PBR gravel texture for a natural rock/environment look.
 */
export function SceneryInstances() {
  const grid = useGameStore((s) => s.grid);
  const stoneTex = useTexture('/assets/materials/Gravel017/Color.jpg');

  // Configure tiling
  useEffect(() => {
    setupTiling(stoneTex, 1);
  }, [stoneTex]);

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
      <meshStandardMaterial map={stoneTex} color="#2d5a27" roughness={0.8} />
    </instancedMesh>
  );
}
