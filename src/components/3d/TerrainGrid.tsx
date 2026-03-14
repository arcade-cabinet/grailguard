/**
 * @module TerrainGrid
 *
 * InstancedMesh-based terrain rendered as a grid of 5x5 unit tiles.
 * Each tile gets a slightly varied grass color seeded from the map seed
 * for deterministic, visually interesting ground without multiple draw calls.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import mapConfig from '../../data/mapConfig.json';

/** Grass color palette -- 4 subtle shades for variation. */
const GRASS_SHADES = ['#4a8f46', '#3d7a3a', '#55a050', '#467f42'];
const DESERT_SHADES = ['#d2b48c', '#c4a67a', '#dabe98', '#bfa070'];
const DARK_FOREST_SHADES = ['#2f4f4f', '#264040', '#385858', '#2a4848'];

const TILE_SIZE = 5;

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

/** Seeded PRNG (LCG) for deterministic tile coloring. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/**
 * Props for the terrain grid.
 * @param biome - Current biome string for color palette selection.
 * @param seed - Seed string for deterministic color variation.
 */
export interface TerrainGridProps {
  biome?: string;
  seed?: string;
}

/**
 * Renders the terrain as a single InstancedMesh of PlaneGeometry tiles.
 * Grid dimensions derive from mapConfig.json `size`. Each tile receives
 * one of 4 grass shades, chosen deterministically from the map seed.
 */
export function TerrainGrid({ biome = 'kings-road', seed = '12345' }: TerrainGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mapSize = mapConfig.size;
  const tilesPerSide = Math.ceil(mapSize / TILE_SIZE);
  const totalTiles = tilesPerSide * tilesPerSide;

  const shades = useMemo(() => {
    if (biome === 'desert-wastes') return DESERT_SHADES;
    if (biome === 'dark-forest') return DARK_FOREST_SHADES;
    return GRASS_SHADES;
  }, [biome]);

  // Compute transforms and colors once
  const initialized = useRef(false);
  useMemo(() => {
    initialized.current = false;
  }, [seed, biome, shades]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || initialized.current) return;

    let seedNum =
      typeof seed === 'string' ? Number.parseInt(seed.substring(0, 8), 16) || 12345 : 12345;
    if (Number.isNaN(seedNum)) seedNum = 12345;
    const random = seededRandom(seedNum);

    const halfGrid = (tilesPerSide * TILE_SIZE) / 2;

    for (let row = 0; row < tilesPerSide; row++) {
      for (let col = 0; col < tilesPerSide; col++) {
        const idx = row * tilesPerSide + col;
        const x = col * TILE_SIZE - halfGrid + TILE_SIZE / 2;
        const z = row * TILE_SIZE - halfGrid + TILE_SIZE / 2;

        _tempObj.position.set(x, 0, z);
        _tempObj.rotation.set(-Math.PI / 2, 0, 0);
        _tempObj.scale.set(1, 1, 1);
        _tempObj.updateMatrix();
        mesh.setMatrixAt(idx, _tempObj.matrix);

        // Pick shade deterministically
        const shadeIdx = Math.floor(random() * shades.length);
        _tempColor.set(shades[shadeIdx]);
        mesh.setColorAt(idx, _tempColor);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    initialized.current = true;
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
    [],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, totalTiles]}
      receiveShadow
      frustumCulled={false}
    />
  );
}
