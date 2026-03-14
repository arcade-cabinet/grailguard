/**
 * @module rendererSwitch.web
 *
 * Web-only renderer that wraps the existing R3F Canvas + Arena.
 * This file is only loaded on web platforms via the rendererSwitch module.
 * Metro's platform-specific resolution (.web.tsx) ensures this is never
 * bundled on native.
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
