/**
 * @module audioBridge
 *
 * Typed event bus that decouples the game engine from the audio system.
 * The engine emits semantic game events (combat hits, wave starts, etc.)
 * and the SoundManager subscribes to play the appropriate sounds, avoiding
 * direct `soundManager` imports in engine code.
 */

/** All audio event types the engine can emit. */
export type AudioEventType =
  | 'combat_hit'
  | 'unit_death'
  | 'building_placed'
  | 'building_sold'
  | 'wave_start'
  | 'wave_complete'
  | 'boss_spawn'
  | 'spell_cast'
  | 'game_over'
  | 'ui_click';

/** Payload data associated with an audio event. */
export interface AudioEventPayload {
  /** The event type identifier. */
  type: AudioEventType;
  /** Optional position in world space for spatial audio. */
  position?: { x: number; y: number; z: number };
  /** Optional additional context (spell name, unit type, etc.). */
  detail?: string;
}

/** Callback signature for audio event listeners. */
export type AudioEventListener = (event: AudioEventPayload) => void;

/**
 * Typed event emitter for game audio events. Provides a clean separation
 * between the simulation layer (which emits events) and the audio layer
 * (which consumes them).
 *
 * @example
 * ```ts
 * // In engine code:
 * audioBus.emit({ type: 'combat_hit', position: { x: 10, y: 0, z: 5 } });
 *
 * // In SoundManager setup:
 * audioBus.on('combat_hit', () => soundManager.playCombat());
 * ```
 */
export class AudioBridge {
  private listeners = new Map<AudioEventType, Set<AudioEventListener>>();

  /**
   * Registers a listener for a specific audio event type.
   *
   * @param type - The event type to listen for.
   * @param listener - The callback to invoke when the event fires.
   * @returns An unsubscribe function that removes this listener.
   */
  on(type: AudioEventType, listener: AudioEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * Emits an audio event, notifying all registered listeners for that type.
   *
   * @param event - The event payload to emit.
   */
  emit(event: AudioEventPayload): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        listener(event);
      }
    }
  }

  /**
   * Removes all listeners for all event types.
   * Useful for cleanup when tearing down the audio system.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Returns the number of listeners registered for a given event type.
   *
   * @param type - The event type to query.
   * @returns The listener count.
   */
  listenerCount(type: AudioEventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

/**
 * Singleton audio event bus instance. The game engine emits events here,
 * and the SoundManager subscribes to them.
 */
export const audioBus = new AudioBridge();
