/**
 * AudioBridge — Connects game events to audio playback.
 *
 * This module subscribes to Zustand store changes and fires the
 * appropriate SoundManager and AmbienceManager functions. It acts as
 * the sole connection between game state and audio, keeping the
 * engine and presentation layers decoupled.
 *
 * Usage: call `initAudioBridge()` once in the game screen component,
 * and `destroyAudioBridge()` on unmount.
 */
import type { GameState } from '../../store/useGameStore';
import { useGameStore } from '../../store/useGameStore';
import { setBuildPhase, setDefendPhase, startAmbience, stopAmbience } from './AmbienceManager';
import {
  disposeSounds,
  playBuildSound,
  playVictorySound,
  playWaveStartSound,
} from './SoundManager';

/** Unsubscribe function from Zustand */
let _unsubPhase: (() => void) | null = null;
let _unsubBuildings: (() => void) | null = null;
let _initialized = false;

/**
 * Initialize the audio bridge. Subscribes to game state changes
 * and routes them to the audio system.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initAudioBridge(): void {
  if (_initialized) return;
  _initialized = true;

  // Start ambient loop on first init
  startAmbience();

  // ── Phase transitions ────────────────────────────────────────────────────
  let prevPhase: GameState['phase'] = useGameStore.getState().phase;

  _unsubPhase = useGameStore.subscribe((state) => {
    // Wave start
    if (state.phase === 'defend' && prevPhase === 'build') {
      playWaveStartSound();
      setDefendPhase(state.wave);
    }

    // Wave end (defend → build)
    if (state.phase === 'build' && prevPhase === 'defend') {
      playVictorySound();
      setBuildPhase();
    }

    prevPhase = state.phase;
  });

  // ── Building placement ───────────────────────────────────────────────────
  let prevBuildingCount = Object.keys(useGameStore.getState().buildings).length;

  _unsubBuildings = useGameStore.subscribe((state) => {
    const count = Object.keys(state.buildings).length;
    if (count > prevBuildingCount) {
      playBuildSound();
    }
    prevBuildingCount = count;
  });
}

/**
 * Tear down the audio bridge and dispose all audio resources.
 */
export function destroyAudioBridge(): void {
  _unsubPhase?.();
  _unsubBuildings?.();
  _unsubPhase = null;
  _unsubBuildings = null;
  stopAmbience();
  disposeSounds();
  _initialized = false;
}
