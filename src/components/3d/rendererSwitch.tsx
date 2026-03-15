/**
 * @module rendererSwitch
 *
 * Renderer switch for the arena. In the Capacitor + Vite architecture,
 * we always use the web R3F renderer (WebGL/WebGPU via Three.js).
 * Native rendering (Filament) is no longer needed since Capacitor wraps
 * the web build.
 */
import type { Entity } from 'koota';
import type { ComponentType } from 'react';
import { WebArenaRenderer } from './rendererSwitch.web';

/** Props shared by arena renderers. */
export interface ArenaRendererProps {
  placementPreview: { x: number; y: number; z: number; valid: boolean } | null;
  selectedEntity: Entity | null;
}

/**
 * Returns the R3F Canvas + Arena renderer for web.
 */
export function getArenaRenderer(): ComponentType<ArenaRendererProps> {
  return WebArenaRenderer;
}
