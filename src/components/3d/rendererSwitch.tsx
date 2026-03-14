/**
 * @module rendererSwitch
 *
 * Platform-aware renderer switch. On native platforms (iOS/Android),
 * renders the Filament-based FilamentArena. On web, renders the R3F Arena
 * inside a Three.js Canvas.
 *
 * This exists because expo-gl is broken on Expo SDK 55 New Architecture.
 * Filament uses Metal (iOS) / Vulkan (Android) for native GPU rendering.
 * R3F + Three.js continues to work on web via WebGL/WebGPU.
 */
import type { Entity } from 'koota';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

/** Props shared by both native and web arena renderers. */
export interface ArenaRendererProps {
  placementPreview: { x: number; y: number; z: number; valid: boolean } | null;
  selectedEntity: Entity | null;
}

/**
 * Lazy-loaded renderer component. On native, loads FilamentArena.
 * On web, loads the R3F Canvas + Arena combo.
 *
 * We use a conditional require to ensure Metro/webpack only bundles
 * the appropriate renderer per platform.
 */
let NativeArenaRenderer: ComponentType<ArenaRendererProps> | null = null;
let WebArenaRenderer: ComponentType<ArenaRendererProps> | null = null;

/**
 * Returns the appropriate Arena renderer for the current platform.
 *
 * - Native (iOS/Android): FilamentArena (Metal/Vulkan)
 * - Web: R3F Canvas + Arena (WebGL)
 */
export function getArenaRenderer(): ComponentType<ArenaRendererProps> {
  if (Platform.OS === 'web') {
    if (!WebArenaRenderer) {
      const mod = require('./rendererSwitch.web');
      WebArenaRenderer = mod.WebArenaRenderer;
    }
    return WebArenaRenderer as ComponentType<ArenaRendererProps>;
  }

  if (!NativeArenaRenderer) {
    const { FilamentArena } = require('./FilamentArena');
    NativeArenaRenderer = FilamentArena;
  }
  return NativeArenaRenderer as ComponentType<ArenaRendererProps>;
}
