/**
 * @module rendererSwitch.web
 *
 * Web renderer that wraps the existing R3F Canvas + Arena.
 * Uses Three.js WebGL for rendering the 3D scene.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Arena } from './Arena';
import type { ArenaRendererProps } from './rendererSwitch';

/**
 * Web arena renderer using R3F Canvas with Three.js WebGL.
 * Matches the original game.tsx Canvas configuration.
 */
export function WebArenaRenderer({ placementPreview, selectedEntity }: ArenaRendererProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 100, 70], zoom: 1, near: 0.1, far: 1000 }}
      shadows
      style={{ flex: 1 }}
    >
      <Suspense fallback={null}>
        <Arena placementPreview={placementPreview} selectedEntity={selectedEntity} />
      </Suspense>
    </Canvas>
  );
}
