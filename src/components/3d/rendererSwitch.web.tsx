/**
 * @module rendererSwitch.web
 *
 * Web renderer that wraps the existing R3F Canvas + Arena.
 * Uses Three.js WebGL for rendering the 3D scene with perspective
 * camera, ACES filmic tone mapping, and retina-aware DPR.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import { Arena } from './Arena';
import type { ArenaRendererProps } from './rendererSwitch';

/**
 * Web arena renderer using R3F Canvas with Three.js WebGL.
 * Canvas fills its container absolutely for full-viewport rendering.
 * Uses perspective camera at a ~30-degree angle for Kingdom-Rush-style
 * bird's-eye view with visible horizon and HDRI sky.
 */
export function WebArenaRenderer({ placementPreview, selectedEntity }: ArenaRendererProps) {
  return (
    <Canvas
      camera={{
        fov: 45,
        position: [0, 120, 140],
        near: 1,
        far: 500,
      }}
      shadows="soft"
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Arena placementPreview={placementPreview} selectedEntity={selectedEntity} />
      </Suspense>
    </Canvas>
  );
}
