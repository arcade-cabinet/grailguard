/**
 * @module telemetry
 *
 * Lightweight runtime telemetry for Grailguard. Provides a shared mutable
 * object that engine systems write to on each frame and the DebugOverlay
 * reads from. No React state involved -- the overlay polls via useFrame.
 */

/** Shape of the runtime telemetry snapshot. */
export interface GrailguardTelemetry {
  /** Frames per second (smoothed). */
  fps: number;
  /** Total live entities in the ECS world. */
  entityCount: number;
  /** Active particle entities. */
  activeParticles: number;
  /** Active projectile entities. */
  activeProjectiles: number;
  /** Active unit entities (allies + enemies). */
  activeUnits: number;
  /** Wall-clock time for the last simulation frame, in milliseconds. */
  frameTimeMs: number;
}

/**
 * Singleton telemetry object. Engine systems write here each frame;
 * the DebugOverlay reads from it. Mutate in place for zero-allocation updates.
 */
export const telemetry: GrailguardTelemetry = {
  fps: 0,
  entityCount: 0,
  activeParticles: 0,
  activeProjectiles: 0,
  activeUnits: 0,
  frameTimeMs: 0,
};

/**
 * Merge partial telemetry data into the singleton.
 *
 * @param data - Partial telemetry fields to update.
 */
export function updateTelemetry(data: Partial<GrailguardTelemetry>): void {
  Object.assign(telemetry, data);
}
