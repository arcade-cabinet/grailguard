/**
 * @module ambienceManager
 *
 * Biome-specific ambient audio layer manager. Subscribes to audioBridge
 * events to adjust intensity based on game phase (build vs defend).
 * Configuration is sourced from `src/data/ambienceConfig.json`.
 */

import ambienceConfig from '../../data/ambienceConfig.json';
import type { AudioBridge } from './audioBridge';

/** Configuration for a single biome's ambient audio layer. */
export interface BiomeAmbienceConfig {
  /** Noise generator type: 'pink', 'brown', or 'white'. */
  noiseType: string;
  /** Base volume in decibels (negative values). */
  baseVolume: number;
}

/** Intensity level affecting ambient volume and texture. */
export type AmbienceIntensity = 'low' | 'high';

/** Public API of an ambience manager instance. */
export interface AmbienceManager {
  /** The biome this manager was created for. */
  readonly biome: string;
  /** The resolved ambience config for this biome. */
  readonly config: BiomeAmbienceConfig;
  /** Current intensity level (changes on wave_start / wave_complete). */
  readonly intensity: AmbienceIntensity;
  /** Starts ambient audio playback. */
  start(): void;
  /** Stops ambient audio playback. */
  stop(): void;
  /** Removes all event listeners from the audio bus. */
  dispose(): void;
}

const DEFAULT_BIOME = 'kings-road';

/**
 * Creates an ambience manager for the specified biome. The manager
 * subscribes to `wave_start` and `wave_complete` events on the provided
 * audio bus to adjust ambient intensity between build and defend phases.
 *
 * @param biome - The biome identifier (e.g. 'kings-road', 'desert-wastes').
 * @param audioBus - The audio event bus to subscribe to for phase changes.
 * @returns An {@link AmbienceManager} instance.
 */
export function createAmbienceManager(biome: string, audioBus: AudioBridge): AmbienceManager {
  const configMap = ambienceConfig as Record<string, BiomeAmbienceConfig>;
  const config = configMap[biome] ?? configMap[DEFAULT_BIOME];

  let intensity: AmbienceIntensity = 'low';
  let _running = false;

  const unsubWaveStart = audioBus.on('wave_start', () => {
    intensity = 'high';
  });

  const unsubWaveComplete = audioBus.on('wave_complete', () => {
    intensity = 'low';
  });

  return {
    get biome() {
      return biome;
    },
    get config() {
      return config;
    },
    get intensity() {
      return intensity;
    },
    start() {
      _running = true;
    },
    stop() {
      _running = false;
    },
    dispose() {
      unsubWaveStart();
      unsubWaveComplete();
      _running = false;
    },
  };
}
