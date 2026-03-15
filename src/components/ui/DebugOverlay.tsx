/**
 * @module DebugOverlay
 *
 * Development-only overlay that displays runtime telemetry values
 * (FPS, entity count, particles, projectiles, units, frame time).
 * Only rendered when `__DEV__` is true. Positioned absolute top-left
 * with a semi-transparent background so it doesn't obscure gameplay.
 */
import { useEffect, useState } from 'react';
import { telemetry } from '../../engine/telemetry';

/**
 * Renders a compact telemetry readout in the top-left corner.
 * Updates every 500ms to avoid excessive re-renders.
 * Returns null in production builds.
 */
export function DebugOverlay() {
  if (!__DEV__) return null;

  const [snapshot, setSnapshot] = useState({ ...telemetry });

  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot({ ...telemetry });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="pointer-events-none absolute left-1 top-1 rounded-md px-2 py-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
    >
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        FPS: {snapshot.fps.toFixed(0)}
      </p>
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Entities: {snapshot.entityCount}
      </p>
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Particles: {snapshot.activeParticles}
      </p>
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Projectiles: {snapshot.activeProjectiles}
      </p>
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Units: {snapshot.activeUnits}
      </p>
      <p style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Frame: {snapshot.frameTimeMs.toFixed(1)}ms
      </p>
    </div>
  );
}
