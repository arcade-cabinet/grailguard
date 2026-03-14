/**
 * @module CameraController
 *
 * Perspective camera controller that reads game phase from ECS and smoothly
 * transitions between viewport presets (overview for build, action for defend).
 * Camera is positioned at a ~30-degree angle from horizontal for a
 * Kingdom-Rush-style bird's-eye view with visible horizon and HDRI sky.
 * Camera shake still applies on top of preset positions.
 *
 * Gesture zoom works by adjusting the camera distance (dolly) rather than
 * orthographic zoom factor, giving a natural diorama feel.
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
 * Base camera height and forward offset define the viewing angle.
 * With height=120 and z-offset=140, the camera looks down at roughly
 * 40 degrees from horizontal, showing the horizon at screen top ~20%.
 */
const BASE_HEIGHT = 120;
const BASE_Z_OFFSET = 140;

/**
 * Camera controller component. Manages perspective camera distance
 * (dolly zoom), smooth transitions between presets, camera shake,
 * and gesture pan/zoom offsets.
 */
export function CameraController() {
  const { camera } = useThree();
  const session = useTrait(gameWorld, GameSession);
  const currentZoom = useRef(viewportPresets.overview.zoom);
  const basePosition = useRef(new THREE.Vector3(0, BASE_HEIGHT, BASE_Z_OFFSET));

  // Register active camera
  useEffect(() => {
    setActiveCamera(camera);
    return () => {
      if (activeCamera === camera) {
        setActiveCamera(null);
      }
    };
  }, [camera]);

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

    // Perspective dolly: zoom factor scales camera distance inversely.
    // At zoom=50 the camera sits at the base distance; lower zooms pull
    // further back, higher zooms push closer.
    const distanceFactor = 50 / Math.max(1, clampedZoom);
    const height = BASE_HEIGHT * distanceFactor;
    const zOffset = BASE_Z_OFFSET * distanceFactor;

    // Base position with pan offset
    const shake = gameWorld.get(GameSession)?.cameraShake ?? 0;
    const targetX = cameraState.panX;
    const targetZ = cameraState.panZ;

    if (shake > 0) {
      camera.position.x = targetX + (Math.random() - 0.5) * shake;
      camera.position.y = height + (Math.random() - 0.5) * shake;
      camera.position.z = zOffset + targetZ;
    } else {
      basePosition.current.set(targetX, height, zOffset + targetZ);
      camera.position.lerp(basePosition.current, renderConfig.camera.shakeLerp);
    }
    camera.lookAt(targetX, 0, targetZ);
  });

  return null;
}
