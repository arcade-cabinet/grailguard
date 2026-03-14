/**
 * @module Arena
 *
 * Root React Three Fiber scene for the Grailguard game. Assembles the full 3D
 * battlefield: terrain, road, environment scatter (trees/rocks), lighting,
 * camera rig, and all entity meshes (buildings, units, projectiles, particles,
 * resource carts, and world effects). Also exposes helper functions for
 * projecting between screen coordinates and the ground plane.
 */
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useQuery, useTrait } from 'koota/react';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  Building,
  Facing,
  GameSession,
  gameWorld,
  Position,
  Projectile,
  ResourceCart,
  roadSpline,
  stepRunWorld,
  Unit,
  WorldEffect,
} from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';
import { BuildingMesh } from './Entities/BuildingMesh';
import { ProjectileMesh } from './Entities/ProjectileMesh';
import { ResourceCartMesh } from './Entities/ResourceCartMesh';
import { UnitMesh } from './Entities/UnitMesh';
import { WorldEffectMesh } from './Entities/WorldEffectMesh';
import { ParticlePool } from './ParticlePool';
import { TerrainGrid } from './TerrainGrid';

let activeCamera: THREE.Camera | null = null;
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
  if (!activeCamera) return null;
  placementPointer.set(x, y);
  placementRaycaster.setFromCamera(placementPointer, activeCamera);
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
  if (!activeCamera) return null;
  const projected = new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z).project(
    activeCamera,
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

function GameLoop() {
  useFrame((_state, delta) => {
    stepRunWorld(delta);
  });

  return null;
}

function Environment() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#444444', 0.7]} />
      <directionalLight
        position={[40, 100, -40]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
    </>
  );
}

function CameraRig() {
  const { camera, size } = useThree();
  const session = useTrait(gameWorld, GameSession);

  useEffect(() => {
    activeCamera = camera;
    return () => {
      if (activeCamera === camera) {
        activeCamera = null;
      }
    };
  }, [camera]);

  useEffect(() => {
    if (camera.type === 'OrthographicCamera') {
      const mapSize = session?.mapSize ?? 100;
      const aspect = size.width / size.height;
      let viewSize = mapSize * 1.2;
      if (aspect < 1) viewSize = (mapSize * 1.2) / aspect; // Scale to fit width on vertical screens

      const ortho = camera as THREE.OrthographicCamera;
      ortho.left = (-viewSize * aspect) / 2;
      ortho.right = (viewSize * aspect) / 2;
      ortho.top = viewSize / 2;
      ortho.bottom = -viewSize / 2;
      ortho.updateProjectionMatrix();
    }
  }, [camera, size, session?.mapSize]);

  useFrame(() => {
    const shake = gameWorld.get(GameSession)?.cameraShake ?? 0;
    if (shake > 0) {
      camera.position.x = (Math.random() - 0.5) * shake;
      camera.position.y = 100 + (Math.random() - 0.5) * shake;
    } else {
      camera.position.lerp(new THREE.Vector3(0, 100, 70), 0.1);
    }
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function EnvironmentScatter() {
  const session = useTrait(gameWorld, GameSession);
  // We can just use the path as string for useGLTF, assuming it's preloaded or metro resolves it.
  const treeModel = useGLTF(require('../../../public/assets/models/tree.glb') as string);
  const rockModel = useGLTF(require('../../../public/assets/models/rock.glb') as string);

  const instances = useMemo(() => {
    let seed = session?.runId ? parseInt(session.runId.substring(0, 8), 16) : 12345;
    const mapSize = session?.mapSize ?? 100;
    if (Number.isNaN(seed)) seed = 12345;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const items = [];
    const numItems = 150;

    for (let i = 0; i < numItems; i++) {
      const x = (random() - 0.5) * mapSize;
      const z = (random() - 0.5) * mapSize;

      const point = new THREE.Vector3(x, 0, z);
      let minDistance = Infinity;
      for (let t = 0; t <= 1; t += 0.05) {
        const roadPoint = roadSpline.getPoint(t);
        const dist = point.distanceTo(roadPoint);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }

      if (minDistance > 5) {
        items.push({
          id: i,
          type: random() > 0.3 ? 'tree' : 'rock',
          position: [x, 0, z],
          rotation: [0, random() * Math.PI * 2, 0],
          scale: 0.8 + random() * 0.4,
        });
      }
    }
    return items;
  }, [session?.runId, session?.mapSize]);

  return (
    <>
      {instances.map((item) => (
        <group
          key={item.id}
          position={item.position as [number, number, number]}
          rotation={item.rotation as [number, number, number]}
          scale={item.scale}
        >
          <Clone
            object={item.type === 'tree' ? treeModel.scene : rockModel.scene}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </>
  );
}

/** @deprecated Replaced by TerrainGrid InstancedMesh implementation. */

function Road() {
  const session = useTrait(gameWorld, GameSession);
  const color =
    session?.biome === 'dark-forest'
      ? '#5c4033'
      : session?.biome === 'desert-wastes'
        ? '#d2a679'
        : '#8b5a2b';
  const [tubeGeo, setTubeGeo] = useState<THREE.TubeGeometry | null>(null);

  useEffect(() => {
    const geometry = new THREE.TubeGeometry(roadSpline, 128, 3.5, 8, false);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, 0.2);
    }
    setTubeGeo(geometry);

    return () => geometry.dispose();
  }, [session?.runId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tubeGeo) return null;

  return (
    <mesh geometry={tubeGeo} receiveShadow>
      <meshStandardMaterial color={color} />
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
      <Environment />
      <EnvironmentScatter />
      <CameraRig />
      <GameLoop />
      <TerrainGrid biome={session?.biome} seed={session?.runId ?? session?.seed} />
      <Road />
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
