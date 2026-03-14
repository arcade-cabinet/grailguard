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
const _scatterColor = new THREE.Color();

/** Seeded LCG for deterministic scenery placement. */
function createScatterRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/**
 * GLB-model environment scatter: uses real tree.glb and boulder.glb models
 * via InstancedMesh for performant rendering of 100+ trees and 50+ rocks.
 * Positions are deterministically seeded from the run ID to ensure
 * reproducible scenery across sessions. Each instance gets slight scale
 * and rotation variation for a natural look.
 */
function EnvironmentScatter() {
  const session = useTrait(gameWorld, GameSession);
  const treeGltf = useGLTF('/assets/models/tree.glb');
  const boulderGltf = useGLTF('/assets/models/boulder.glb');

  const treeRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);

  const { treeCount, rockCount, scatterRadius, minRoadClearance } = mapConfig.scenery;
  const mapSize = session?.mapSize ?? mapConfig.size;

  // Extract the first mesh geometry and material from each GLB
  const treeData = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;
    treeGltf.scene.traverse((child) => {
      if (!geo && (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        geo = mesh.geometry;
        mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      }
    });
    return { geo: geo as THREE.BufferGeometry, mat: mat as THREE.Material };
  }, [treeGltf]);

  const boulderData = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;
    boulderGltf.scene.traverse((child) => {
      if (!geo && (child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        geo = mesh.geometry;
        mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      }
    });
    return { geo: geo as THREE.BufferGeometry, mat: mat as THREE.Material };
  }, [boulderGltf]);

  const initialized = useRef(false);
  useMemo(() => {
    initialized.current = false;
  }, [session?.runId, session?.mapSize]);

  useFrame(() => {
    if (initialized.current) return;
    if (!treeRef.current || !rockRef.current) return;
    if (!treeData.geo || !boulderData.geo) return;

    let seedNum = session?.runId ? Number.parseInt(session.runId.substring(0, 8), 16) : 12345;
    if (Number.isNaN(seedNum)) seedNum = 12345;
    const random = createScatterRng(seedNum);

    const halfMap = mapSize * scatterRadius;
    let treeIdx = 0;
    let rockIdx = 0;

    const candidates = treeCount + rockCount + 80;
    for (let i = 0; i < candidates; i++) {
      const x = (random() - 0.5) * 2 * halfMap;
      const z = (random() - 0.5) * 2 * halfMap;
      const isTree = treeIdx < treeCount && (rockIdx >= rockCount || random() > 0.33);

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

      if (isTree && treeIdx < treeCount) {
        const scale = 1.5 + random() * 1.5;
        _scatterObj.position.set(x, 0, z);
        _scatterObj.rotation.set(0, rotY, 0);
        _scatterObj.scale.set(scale, scale, scale);
        _scatterObj.updateMatrix();
        treeRef.current.setMatrixAt(treeIdx, _scatterObj.matrix);
        treeIdx++;
      } else if (!isTree && rockIdx < rockCount) {
        const scale = 0.6 + random() * 0.8;
        _scatterObj.position.set(x, scale * 0.2, z);
        _scatterObj.rotation.set(random() * 0.3, rotY, random() * 0.3);
        _scatterObj.scale.set(scale, scale * 0.7, scale);
        _scatterObj.updateMatrix();
        rockRef.current.setMatrixAt(rockIdx, _scatterObj.matrix);
        rockIdx++;
      }

      if (treeIdx >= treeCount && rockIdx >= rockCount) break;
    }

    treeRef.current.instanceMatrix.needsUpdate = true;
    rockRef.current.instanceMatrix.needsUpdate = true;

    initialized.current = true;
  });

  if (!treeData.geo || !boulderData.geo) return null;

  return (
    <>
      <instancedMesh
        ref={treeRef}
        args={[treeData.geo, treeData.mat, treeCount]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={rockRef}
        args={[boulderData.geo, boulderData.mat, rockCount]}
        castShadow
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
  const textures = useTexture({
    map: '/assets/pbr/grass/Grass004_1K-JPG_Color.jpg',
    normalMap: '/assets/pbr/grass/Grass004_1K-JPG_NormalGL.jpg',
    roughnessMap: '/assets/pbr/grass/Grass004_1K-JPG_Roughness.jpg',
    aoMap: '/assets/pbr/grass/Grass004_1K-JPG_AmbientOcclusion.jpg',
    displacementMap: '/assets/pbr/grass/Grass004_1K-JPG_Displacement.jpg',
  });

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
      <meshStandardMaterial {...textures} displacementScale={0.4} />
    </mesh>
  );
}

/**
 * PBR stone road -- applies PavingStones textures to the road TubeGeometry
 * that follows the procedural CatmullRom spline path.
 */
function PBRRoad() {
  const session = useTrait(gameWorld, GameSession);
  const [tubeGeo, setTubeGeo] = useState<THREE.TubeGeometry | null>(null);

  const roadTextures = useTexture({
    map: '/assets/pbr/road/PavingStones003_1K-JPG_Color.jpg',
    normalMap: '/assets/pbr/road/PavingStones003_1K-JPG_NormalGL.jpg',
    roughnessMap: '/assets/pbr/road/PavingStones003_1K-JPG_Roughness.jpg',
    displacementMap: '/assets/pbr/road/PavingStones003_1K-JPG_Displacement.jpg',
  });

  useMemo(() => {
    for (const tex of Object.values(roadTextures)) {
      (tex as THREE.Texture).wrapS = THREE.RepeatWrapping;
      (tex as THREE.Texture).wrapT = THREE.RepeatWrapping;
      (tex as THREE.Texture).repeat.set(10, 1);
    }
  }, [roadTextures]);

  useEffect(() => {
    const geometry = new THREE.TubeGeometry(roadSpline, 128, 3.5, 8, false);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, 0.2);
    }
    setTubeGeo(geometry);

    return () => geometry.dispose();
  }, [session?.runId]);

  if (!tubeGeo) return null;

  return (
    <mesh geometry={tubeGeo} receiveShadow>
      <meshStandardMaterial {...roadTextures} displacementScale={0.1} />
    </mesh>
  );
}

function PlacementGhost({
  preview,
}: {
  preview: { x: number; y: number; z: number; valid: boolean } | null;
}) {
  if (!preview) return null;

  return (
    <mesh position={[preview.x, preview.y, preview.z]}>
      <boxGeometry args={[6, 3, 6]} />
      <meshBasicMaterial color={preview.valid ? '#22c55e' : '#ef4444'} transparent opacity={0.4} />
    </mesh>
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
        files="/assets/hdri/alps_field_1k.hdr"
        background
        environmentIntensity={0.8}
        environmentRotation={[0, -Math.PI / 4, 0]}
        backgroundRotation={[0, -Math.PI / 4, 0]}
      />
      {/* Depth fog — green-tinted to match grass, fades distant terrain */}
      <fog attach="fog" args={['#5a7247', 60, 200]} />
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
