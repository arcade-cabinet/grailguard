/**
 * @module CameraController
 *
 * Camera controller that reads game phase from ECS and smoothly transitions
 * between viewport presets (overview for build, action for defend).
 * Camera shake still applies on top of preset zoom levels.
 *
 * Replaces the inline CameraRig from Arena.tsx with a more capable controller
 * that supports zoom presets and pan/zoom offsets.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useTrait } from 'koota/react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import renderConfig from '../../data/renderConfig.json';
import viewportPresets from '../../data/viewportPresets.json';
import { GameSession, gameWorld } from '../../engine/GameEngine';

/** Externally settable camera reference for raycasting. */
let activeCamera: THREE.Camera | null = null;

/** Returns the active R3F camera (for raycasting in Arena). */
export function getActiveCamera(): THREE.Camera | null {
  return activeCamera;
}

/** Sets the active camera reference. Called internally. */
export function setActiveCamera(cam: THREE.Camera | null) {
  activeCamera = cam;
}

type PresetKey = keyof typeof viewportPresets;

function getPresetForPhase(phase: string): PresetKey {
  switch (phase) {
    case 'build':
      return 'overview';
    case 'defend':
      return 'action';
    case 'game_over':
      return 'cinematic';
    default:
      return 'overview';
  }
}

export interface CameraControllerState {
  /** Current pan offset in world XZ. Set by gesture handler. */
  panX: number;
  panZ: number;
  /** Zoom override from pinch gesture. -1 means use preset. */
  gestureZoom: number;
}

/** Shared mutable state for gesture input to camera. */
export const cameraState: CameraControllerState = {
  panX: 0,
  panZ: 0,
  gestureZoom: -1,
};

/**
 * Camera controller component. Manages orthographic camera sizing,
 * zoom transitions between presets, camera shake, and gesture offsets.
 */
export function CameraController() {
  const { camera, size } = useThree();
  const session = useTrait(gameWorld, GameSession);
  const currentZoom = useRef(viewportPresets.overview.zoom);
  const basePosition = useRef(new THREE.Vector3(0, 100, 70));

  // Register active camera
  useEffect(() => {
    setActiveCamera(camera);
    return () => {
      if (activeCamera === camera) {
        setActiveCamera(null);
      }
    };
  }, [camera]);

  // Set up orthographic projection
  useEffect(() => {
    if (camera.type === 'OrthographicCamera') {
      const mapSize = session?.mapSize ?? 100;
      const aspect = size.width / size.height;
      let viewSize = mapSize * 1.2;
      if (aspect < 1) viewSize = (mapSize * 1.2) / aspect;

      const ortho = camera as THREE.OrthographicCamera;
      ortho.left = (-viewSize * aspect) / 2;
      ortho.right = (viewSize * aspect) / 2;
      ortho.top = viewSize / 2;
      ortho.bottom = -viewSize / 2;
      ortho.updateProjectionMatrix();
    }
  }, [camera, size, session?.mapSize]);

  useFrame((_state, delta) => {
    const phase = session?.phase ?? 'build';
    const presetKey = getPresetForPhase(phase);
    const preset = viewportPresets[presetKey];
    const targetZoom = cameraState.gestureZoom >= 0 ? cameraState.gestureZoom : preset.zoom;

    // Smooth lerp toward target zoom
    const lerpSpeed = 1 / Math.max(0.1, preset.transitionDuration);
    const t = Math.min(1, delta * lerpSpeed);
    currentZoom.current += (targetZoom - currentZoom.current) * t;

    // Clamp zoom to config bounds
    const clampedZoom = Math.max(
      renderConfig.camera.zoomMin,
      Math.min(renderConfig.camera.zoomMax, currentZoom.current),
    );

    // Apply zoom to ortho camera
    if (camera.type === 'OrthographicCamera') {
      const ortho = camera as THREE.OrthographicCamera;
      ortho.zoom = clampedZoom / 50; // normalize: 50 = 1x zoom
      ortho.updateProjectionMatrix();
    }

    // Base position with pan offset
    const shake = gameWorld.get(GameSession)?.cameraShake ?? 0;
    const targetX = cameraState.panX;
    const targetZ = cameraState.panZ;

    if (shake > 0) {
      camera.position.x = targetX + (Math.random() - 0.5) * shake;
      camera.position.y = 100 + (Math.random() - 0.5) * shake;
      camera.position.z = 70 + targetZ;
    } else {
      basePosition.current.set(targetX, 100, 70 + targetZ);
      camera.position.lerp(basePosition.current, renderConfig.camera.shakeLerp);
    }
    camera.lookAt(targetX, 0, targetZ);
  });

  return null;
}
