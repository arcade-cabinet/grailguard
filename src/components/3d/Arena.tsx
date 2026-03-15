/**
 * @module Arena
 *
 * Root React Three Fiber scene for the Grailguard game. Assembles the full 3D
 * battlefield: PBR terrain with tiled grass textures, HDRI environment sky,
 * stone-paved road, environment scatter (trees/rocks), physically-based
 * lighting, camera rig, and all entity meshes (buildings, units, projectiles,
 * particles, resource carts, and world effects). Also exposes helper functions
 * for projecting between screen coordinates and the ground plane.
 */
import { Environment, useGLTF, useTexture } from '@react-three/drei';
import { DETAIL_MODEL_PATHS, HDRI_PATH, PBR_TEXTURE_PATHS } from './modelPaths';
import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useQuery, useTrait } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import mapConfig from '../../data/mapConfig.json';
import {
  Building,
  Facing,
  GameSession,
  gameWorld,
  Particle,
  Position,
  Projectile,
  ResourceCart,
  roadSpline,
  sanctuaryPosition,
  stepRunWorld,
  Unit,
  WorldEffect,
} from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';
import { CameraController, getActiveCamera } from './CameraController';
import { DayNightCycle } from './DayNightCycle';
import { BuildingMesh } from './Entities/BuildingMesh';
import { ProjectileMesh } from './Entities/ProjectileMesh';
import { ResourceCartMesh } from './Entities/ResourceCartMesh';
import { UnitMesh } from './Entities/UnitMesh';
import { WorldEffectMesh } from './Entities/WorldEffectMesh';
import { ParticlePool, useParticlePool } from './ParticlePool';
import { Sanctuary } from './Sanctuary';

const placementPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const placementRaycaster = new THREE.Raycaster();
const placementPointer = new THREE.Vector2();

/**
 * Projects a normalized-device-coordinate screen point onto the y=0 ground
 * plane using the active R3F camera.
 *
 * @param x - NDC x coordinate (-1 to 1, left to right).
 * @param y - NDC y coordinate (-1 to 1, bottom to top).
 * @returns The world-space intersection point, or `null` if no camera is
 *   active or the ray does not intersect the ground plane.
 */
export function projectScreenPointToGround(x: number, y: number) {
  const cam = getActiveCamera();
  if (!cam) return null;
  placementPointer.set(x, y);
  placementRaycaster.setFromCamera(placementPointer, cam);
  const hit = new THREE.Vector3();
  if (!placementRaycaster.ray.intersectPlane(placementPlane, hit)) {
    return null;
  }
  return hit;
}

/**
 * Projects a world-space position to pixel coordinates in the viewport using
 * the active R3F camera.
 *
 * @param worldPosition - The 3D world position to project.
 * @param viewport - The current viewport dimensions in pixels.
 * @returns An object with `x`/`y` pixel coordinates and a `visible` flag, or
 *   `null` if no camera is active.
 */
export function projectWorldPointToScreen(
  worldPosition: { x: number; y: number; z: number },
  viewport: { width: number; height: number },
) {
  const cam = getActiveCamera();
  if (!cam) return null;
  const projected = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z).project(
    cam,
  );

  return {
    x: ((projected.x + 1) / 2) * viewport.width,
    y: ((1 - projected.y) / 2) * viewport.height,
    visible:
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1.2 &&
      projected.x <= 1.2 &&
      projected.y >= -1.2 &&
      projected.y <= 1.2,
  };
}

/**
 * Bridges ECS Particle entities into the ParticlePool InstancedMesh.
 * Each frame, reads new ECS Particle entities, spawns them into the pool,
 * and destroys the ECS entity so the pool owns the lifecycle.
 */
function ParticlePoolBridge() {
  const pool = useParticlePool();
  const particles = useQuery(Particle, Position);
  const processedRef = useRef(new Set<number>());

  useFrame(() => {
    for (const entity of particles) {
      const id = entity.id() as number;
      if (processedRef.current.has(id)) continue;
      processedRef.current.add(id);

      const p = entity.get(Particle);
      const pos = entity.get(Position);
      if (!p || !pos) continue;

      const colorStr = typeof p.color === 'string' ? p.color : '#ffffff';
      pool.spawnBurst([
        {
          x: pos.x,
          y: pos.y,
          z: pos.z,
          vx: p.vx,
          vy: p.vy,
          vz: p.vz,
          life: p.life,
          color: colorStr,
        },
      ]);
    }

    // Clean up processed set for entities no longer alive
    const aliveIds = new Set(particles.map((e) => e.id() as number));
    for (const id of processedRef.current) {
      if (!aliveIds.has(id)) processedRef.current.delete(id);
    }
  });

  return null;
}

function GameLoop() {
  useFrame((_state, delta) => {
    stepRunWorld(delta);
  });

  return null;
}

const _scatterObj = new THREE.Object3D();

/** Seeded LCG for deterministic scenery placement. */
function createScatterRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Number of small rocks scattered along road edges for visual detail. */
const ROAD_EDGE_ROCK_COUNT = 80;

/** Number of magic crystals scattered near the sanctuary. */
const CRYSTAL_COUNT = 20;

/** Helper to extract the first mesh geometry + material from a GLB scene. */
function extractMeshData(scene: THREE.Object3D) {
  let geo: THREE.BufferGeometry | undefined;
  let mat: THREE.Material | undefined;
  scene.traverse((child) => {
    if (!geo && (child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      geo = mesh.geometry;
      mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    }
  });
  return { geo, mat };
}

/**
 * GLB-model environment scatter: uses KayKit TD Kit detail models via
 * InstancedMesh for performant rendering. Mixes small and large variants
 * of trees, rocks, dirt patches, and crystals for visual variety. Also
 * scatters small rocks along road edges and crystals near the sanctuary
 * for magical atmosphere. All positions are deterministically seeded from
 * the run ID for reproducible scenery across sessions.
 */
function EnvironmentScatter() {
  const session = useTrait(gameWorld, GameSession);

  // Load both small and large variants for trees and rocks
  const treeSmallGltf = useGLTF(DETAIL_MODEL_PATHS.treeSmall);
  const treeLargeGltf = useGLTF(DETAIL_MODEL_PATHS.treeLarge);
  const rocksSmallGltf = useGLTF(DETAIL_MODEL_PATHS.rocksSmall);
  const rocksLargeGltf = useGLTF(DETAIL_MODEL_PATHS.rocksLarge);
  const crystalSmallGltf = useGLTF(DETAIL_MODEL_PATHS.crystalSmall);
  const dirtSmallGltf = useGLTF(DETAIL_MODEL_PATHS.dirtSmall);

  // Refs for each InstancedMesh layer
  const treeSmallRef = useRef<THREE.InstancedMesh>(null);
  const treeLargeRef = useRef<THREE.InstancedMesh>(null);
  const rocksSmallRef = useRef<THREE.InstancedMesh>(null);
  const rocksLargeRef = useRef<THREE.InstancedMesh>(null);
  const roadEdgeRef = useRef<THREE.InstancedMesh>(null);
  const crystalRef = useRef<THREE.InstancedMesh>(null);
  const dirtRef = useRef<THREE.InstancedMesh>(null);

  const { treeCount, rockCount, scatterRadius, minRoadClearance } = mapConfig.scenery;
  const mapSize = session?.mapSize ?? mapConfig.size;

  // Split counts: 60% small, 40% large for natural variety
  const treeSmallCount = Math.floor(treeCount * 0.6);
  const treeLargeCount = treeCount - treeSmallCount;
  const rockSmallCount = Math.floor(rockCount * 0.6);
  const rockLargeCount = rockCount - rockSmallCount;
  const dirtCount = 40;

  const treeSmallData = useMemo(() => extractMeshData(treeSmallGltf.scene), [treeSmallGltf]);
  const treeLargeData = useMemo(() => extractMeshData(treeLargeGltf.scene), [treeLargeGltf]);
  const rocksSmallData = useMemo(() => extractMeshData(rocksSmallGltf.scene), [rocksSmallGltf]);
  const rocksLargeData = useMemo(() => extractMeshData(rocksLargeGltf.scene), [rocksLargeGltf]);
  const crystalSmallData = useMemo(() => extractMeshData(crystalSmallGltf.scene), [crystalSmallGltf]);
  const dirtSmallData = useMemo(() => extractMeshData(dirtSmallGltf.scene), [dirtSmallGltf]);

  const initialized = useRef(false);
  useMemo(() => {
    initialized.current = false;
  }, [session?.runId, session?.mapSize]);

  useFrame(() => {
    if (initialized.current) return;
    if (
      !treeSmallRef.current ||
      !treeLargeRef.current ||
      !rocksSmallRef.current ||
      !rocksLargeRef.current ||
      !roadEdgeRef.current ||
      !crystalRef.current ||
      !dirtRef.current
    )
      return;
    if (!treeSmallData.geo || !treeLargeData.geo || !rocksSmallData.geo || !rocksLargeData.geo)
      return;

    let seedNum = session?.runId ? Number.parseInt(session.runId.substring(0, 8), 16) : 12345;
    if (Number.isNaN(seedNum)) seedNum = 12345;
    const random = createScatterRng(seedNum);

    const halfMap = mapSize * scatterRadius;
    let treeSmallIdx = 0;
    let treeLargeIdx = 0;
    let rockSmallIdx = 0;
    let rockLargeIdx = 0;
    let dirtIdx = 0;

    const totalNeeded = treeCount + rockCount + dirtCount;
    const candidates = totalNeeded + 300;
    for (let i = 0; i < candidates; i++) {
      const x = (random() - 0.5) * 2 * halfMap;
      const z = (random() - 0.5) * 2 * halfMap;

      // Check road clearance
      const point = new THREE.Vector3(x, 0, z);
      let minDist = Number.POSITIVE_INFINITY;
      for (let t = 0; t <= 1; t += 0.05) {
        const roadPt = roadSpline.getPoint(t);
        const d = point.distanceTo(roadPt);
        if (d < minDist) minDist = d;
      }
      if (minDist < minRoadClearance) continue;

      const rotY = random() * Math.PI * 2;
      const roll = random();

      // Distribute: trees, rocks, then dirt patches
      const totalTreesPlaced = treeSmallIdx + treeLargeIdx;
      const totalRocksPlaced = rockSmallIdx + rockLargeIdx;
      const allTreesDone = totalTreesPlaced >= treeCount;
      const allRocksDone = totalRocksPlaced >= rockCount;
      const allDirtDone = dirtIdx >= dirtCount;

      if (!allTreesDone && (allRocksDone || roll > 0.33)) {
        // Place a tree -- alternate between small and large
        const scale = 1.5 + random() * 1.5;
        _scatterObj.position.set(x, 0, z);
        _scatterObj.rotation.set(0, rotY, 0);
        _scatterObj.scale.set(scale, scale, scale);
        _scatterObj.updateMatrix();
        if (treeSmallIdx < treeSmallCount) {
          treeSmallRef.current.setMatrixAt(treeSmallIdx, _scatterObj.matrix);
          treeSmallIdx++;
        } else if (treeLargeIdx < treeLargeCount) {
          treeLargeRef.current.setMatrixAt(treeLargeIdx, _scatterObj.matrix);
          treeLargeIdx++;
        }
      } else if (!allRocksDone) {
        const scale = 0.6 + random() * 0.8;
        _scatterObj.position.set(x, scale * 0.2, z);
        _scatterObj.rotation.set(random() * 0.3, rotY, random() * 0.3);
        _scatterObj.scale.set(scale, scale * 0.7, scale);
        _scatterObj.updateMatrix();
        if (rockSmallIdx < rockSmallCount) {
          rocksSmallRef.current.setMatrixAt(rockSmallIdx, _scatterObj.matrix);
          rockSmallIdx++;
        } else if (rockLargeIdx < rockLargeCount) {
          rocksLargeRef.current.setMatrixAt(rockLargeIdx, _scatterObj.matrix);
          rockLargeIdx++;
        }
      } else if (!allDirtDone) {
        // Scatter dirt patches for ground detail
        const scale = 0.8 + random() * 0.6;
        _scatterObj.position.set(x, 0.05, z);
        _scatterObj.rotation.set(0, rotY, 0);
        _scatterObj.scale.set(scale, scale * 0.4, scale);
        _scatterObj.updateMatrix();
        dirtRef.current.setMatrixAt(dirtIdx, _scatterObj.matrix);
        dirtIdx++;
      }

      if (allTreesDone && allRocksDone && allDirtDone) break;
    }

    // Scatter small rocks along road edges for detail
    let edgeIdx = 0;
    for (let i = 0; i < ROAD_EDGE_ROCK_COUNT; i++) {
      const t = random();
      const roadPt = roadSpline.getPointAt(t);
      const tangent = roadSpline.getTangentAt(t);
      const perpX = -tangent.z;
      const perpZ = tangent.x;
      const len = Math.sqrt(perpX * perpX + perpZ * perpZ);
      const offset = (5 + random() * 2) * (random() > 0.5 ? 1 : -1);
      const ex = roadPt.x + (perpX / len) * offset;
      const ez = roadPt.z + (perpZ / len) * offset;
      const scale = 0.15 + random() * 0.25;
      _scatterObj.position.set(ex, scale * 0.1, ez);
      _scatterObj.rotation.set(random() * 0.5, random() * Math.PI * 2, random() * 0.5);
      _scatterObj.scale.set(scale, scale * 0.6, scale);
      _scatterObj.updateMatrix();
      roadEdgeRef.current.setMatrixAt(edgeIdx, _scatterObj.matrix);
      edgeIdx++;
    }

    // Scatter crystals near the sanctuary for magical atmosphere
    const sanctX = sanctuaryPosition.x;
    const sanctZ = sanctuaryPosition.z;
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const angle = random() * Math.PI * 2;
      const dist = 8 + random() * 20;
      const cx = sanctX + Math.cos(angle) * dist;
      const cz = sanctZ + Math.sin(angle) * dist;
      const scale = 0.5 + random() * 1.0;
      _scatterObj.position.set(cx, 0, cz);
      _scatterObj.rotation.set(0, random() * Math.PI * 2, random() * 0.2);
      _scatterObj.scale.set(scale, scale * 1.2, scale);
      _scatterObj.updateMatrix();
      crystalRef.current.setMatrixAt(i, _scatterObj.matrix);
    }

    treeSmallRef.current.instanceMatrix.needsUpdate = true;
    treeLargeRef.current.instanceMatrix.needsUpdate = true;
    rocksSmallRef.current.instanceMatrix.needsUpdate = true;
    rocksLargeRef.current.instanceMatrix.needsUpdate = true;
    roadEdgeRef.current.instanceMatrix.needsUpdate = true;
    crystalRef.current.instanceMatrix.needsUpdate = true;
    dirtRef.current.instanceMatrix.needsUpdate = true;

    initialized.current = true;
  });

  if (
    !treeSmallData.geo ||
    !treeSmallData.mat ||
    !treeLargeData.geo ||
    !treeLargeData.mat ||
    !rocksSmallData.geo ||
    !rocksSmallData.mat ||
    !rocksLargeData.geo ||
    !rocksLargeData.mat ||
    !crystalSmallData.geo ||
    !crystalSmallData.mat ||
    !dirtSmallData.geo ||
    !dirtSmallData.mat
  )
    return null;

  return (
    <>
      {/* Small trees */}
      <instancedMesh
        ref={treeSmallRef}
        args={[treeSmallData.geo, treeSmallData.mat, treeSmallCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Large trees */}
      <instancedMesh
        ref={treeLargeRef}
        args={[treeLargeData.geo, treeLargeData.mat, treeLargeCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Small rocks */}
      <instancedMesh
        ref={rocksSmallRef}
        args={[rocksSmallData.geo, rocksSmallData.mat, rockSmallCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Large rocks */}
      <instancedMesh
        ref={rocksLargeRef}
        args={[rocksLargeData.geo, rocksLargeData.mat, rockLargeCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Small rocks along road edges */}
      <instancedMesh
        ref={roadEdgeRef}
        args={[rocksSmallData.geo, rocksSmallData.mat, ROAD_EDGE_ROCK_COUNT]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Magic crystals near sanctuary */}
      <instancedMesh
        ref={crystalRef}
        args={[crystalSmallData.geo, crystalSmallData.mat, CRYSTAL_COUNT]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      {/* Ground dirt patches */}
      <instancedMesh
        ref={dirtRef}
        args={[dirtSmallData.geo, dirtSmallData.mat, dirtCount]}
        receiveShadow
        frustumCulled={false}
      />
    </>
  );
}

/**
 * PBR grass terrain -- a large plane with tiled grass textures (color, normal,
 * roughness, AO, displacement) for photorealistic ground rendering. The plane
 * extends well beyond the play area so the horizon shows grass, not void.
 * Dense tiling (30x30) avoids visible pattern repetition at the camera's
 * default perspective angle.
 */
function PBRTerrain() {
  const textures = useTexture(PBR_TEXTURE_PATHS.grass);

  useMemo(() => {
    for (const tex of Object.values(textures)) {
      (tex as THREE.Texture).wrapS = THREE.RepeatWrapping;
      (tex as THREE.Texture).wrapT = THREE.RepeatWrapping;
      (tex as THREE.Texture).repeat.set(30, 30);
    }
  }, [textures]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[400, 400, 128, 128]} />
      <meshStandardMaterial {...textures} displacementScale={1.5} />
    </mesh>
  );
}

/**
 * Creates a flat ribbon BufferGeometry by sampling a CatmullRomCurve3 spline
 * and extruding perpendicular left/right vertices on the XZ plane.
 *
 * @param spline - The road center-line spline.
 * @param width - Total width of the ribbon in world units.
 * @param segments - Number of cross-sections along the spline.
 * @param yHeight - Y position of the ribbon surface.
 * @returns A flat BufferGeometry strip suitable for road rendering.
 */
function createRoadGeometry(
  spline: THREE.CatmullRomCurve3,
  width: number,
  segments: number,
  yHeight: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = spline.getPointAt(t);
    const tangent = spline.getTangentAt(t);

    // Perpendicular to tangent on XZ plane
    const perpX = -tangent.z;
    const perpZ = tangent.x;
    const len = Math.sqrt(perpX * perpX + perpZ * perpZ);
    const nx = (perpX / len) * (width / 2);
    const nz = (perpZ / len) * (width / 2);

    // Left and right vertices
    positions.push(point.x - nx, yHeight, point.z - nz);
    positions.push(point.x + nx, yHeight, point.z + nz);

    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(t * segments * 0.5, 0, t * segments * 0.5, 1);

    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * PBR stone road -- flat ribbon geometry built from the procedural
 * CatmullRom spline path. Uses perpendicular extrusion to create a proper
 * flat road surface instead of cylindrical TubeGeometry. Includes a wider
 * dark edge border strip beneath the main surface for visual definition.
 */
function PBRRoad() {
  const session = useTrait(gameWorld, GameSession);
  const [roadGeo, setRoadGeo] = useState<THREE.BufferGeometry | null>(null);
  const [edgeGeo, setEdgeGeo] = useState<THREE.BufferGeometry | null>(null);

  const roadTextures = useTexture(PBR_TEXTURE_PATHS.road);

  useMemo(() => {
    for (const tex of Object.values(roadTextures)) {
      (tex as THREE.Texture).wrapS = THREE.RepeatWrapping;
      (tex as THREE.Texture).wrapT = THREE.RepeatWrapping;
      (tex as THREE.Texture).repeat.set(12, 1);
    }
  }, [roadTextures]);

  useEffect(() => {
    // Main road surface -- flat ribbon at y=0.2
    const geometry = createRoadGeometry(roadSpline, 8, 128, 0.2);
    setRoadGeo(geometry);

    // Edge border -- wider, darker strip underneath for definition
    const edgeGeometry = createRoadGeometry(roadSpline, 10, 128, 0.1);
    setEdgeGeo(edgeGeometry);

    return () => {
      geometry.dispose();
      edgeGeometry.dispose();
    };
  }, [session?.runId]);

  if (!roadGeo) return null;

  return (
    <>
      {/* Dark edge border strip for road definition */}
      {edgeGeo && (
        <mesh geometry={edgeGeo} receiveShadow>
          <meshStandardMaterial color="#2a1e15" roughness={0.9} metalness={0.1} />
        </mesh>
      )}
      {/* Main road surface */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial {...roadTextures} displacementScale={0} />
      </mesh>
    </>
  );
}

/**
 * Semi-transparent building placement ghost with a pulsing breathe animation
 * and green/red tint for valid/invalid placement feedback.
 */
function PlacementGhost({
  preview,
}: {
  preview: { x: number; y: number; z: number; valid: boolean } | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Pulse/breathe: scale oscillates 0.95 to 1.05
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    groupRef.current.scale.set(pulse, pulse, pulse);
    // Spin the ground ring indicator
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02;
    }
  });

  if (!preview) return null;

  const color = preview.valid ? '#22c55e' : '#ef4444';

  return (
    <group ref={groupRef} position={[preview.x, preview.y, preview.z]}>
      {/* Main ghost body */}
      <mesh>
        <boxGeometry args={[6, 3, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      {/* Roof peak for building silhouette */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {/* Ground ring indicator */}
      <mesh ref={ringRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.8, 4.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Top-level R3F scene component that renders the entire Grailguard battlefield.
 *
 * Composes environment lighting, terrain, the road spline, scattered
 * decorations, and all game-entity meshes (buildings, units, projectiles,
 * resource carts, particles, world effects). Also drives the per-frame game
 * loop, camera rig, and the semi-transparent placement ghost shown while the
 * player is positioning a new building.
 *
 * @param props.placementPreview - Current building placement ghost position and
 *   validity, or `null` when not placing.
 * @param props.selectedEntity - The currently selected entity (highlighted with
 *   a golden ring), or `null`.
 */
export function Arena({
  placementPreview,
  selectedEntity,
}: {
  placementPreview: { x: number; y: number; z: number; valid: boolean } | null;
  selectedEntity: Entity | null;
}) {
  const unitEntities = useQuery(Unit, Position, Facing);
  const buildingEntities = useQuery(Building, Position);
  const effectEntities = useQuery(WorldEffect, Position);
  const projectileEntities = useQuery(Projectile, Position);
  const cartEntities = useQuery(ResourceCart, Position);
  const session = useTrait(gameWorld, GameSession);

  useEffect(() => {
    if (session) {
      soundManager.playMusic(session.phase);
    }
  }, [session?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ParticlePool>
      <ParticlePoolBridge />
      {/* Alps Field HDRI as quarter-dome backdrop: rotated so mountains appear back-left */}
      <Environment
        files={HDRI_PATH}
        background
        environmentIntensity={0.8}
        environmentRotation={[0, -Math.PI / 4, 0]}
        backgroundRotation={[0, -Math.PI / 4, 0]}
      />
      {/* Depth fog — green-tinted to match grass, starts late to keep HDRI visible */}
      <fog attach="fog" args={['#5a7247', 100, 350]} />
      <DayNightCycle wave={session?.wave ?? 1} />
      <EnvironmentScatter />
      <CameraController />
      <GameLoop />
      <PBRTerrain />
      <PBRRoad />
      <Sanctuary
        position={[sanctuaryPosition.x, 0, sanctuaryPosition.z]}
        health={session?.health ?? 20}
        maxHealth={20}
      />
      <PlacementGhost preview={placementPreview} />

      {buildingEntities.map((entity) => (
        <BuildingMesh
          key={entity.id()}
          entity={entity}
          selected={selectedEntity?.id() === entity.id()}
        />
      ))}

      {unitEntities.map((entity) => (
        <UnitMesh
          key={entity.id()}
          entity={entity}
          selected={selectedEntity?.id() === entity.id()}
        />
      ))}

      {projectileEntities.map((entity) => (
        <ProjectileMesh key={entity.id()} entity={entity} />
      ))}

      {cartEntities.map((entity) => (
        <ResourceCartMesh key={entity.id()} entity={entity} />
      ))}

      {effectEntities.map((entity) => (
        <WorldEffectMesh key={entity.id()} entity={entity} />
      ))}
    </ParticlePool>
  );
}
