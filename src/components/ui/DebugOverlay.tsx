/**
 * @module DebugOverlay
 *
 * Development-only overlay that displays runtime telemetry values
 * (FPS, entity count, particles, projectiles, units, frame time).
 * Only rendered when `__DEV__` is true. Positioned absolute top-left
 * with a semi-transparent background so it doesn't obscure gameplay.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
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
    <View
      style={{
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
      pointerEvents="none"
    >
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        FPS: {snapshot.fps.toFixed(0)}
      </Text>
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Entities: {snapshot.entityCount}
      </Text>
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Particles: {snapshot.activeParticles}
      </Text>
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Projectiles: {snapshot.activeProjectiles}
      </Text>
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Units: {snapshot.activeUnits}
      </Text>
      <Text style={{ color: '#00ff88', fontSize: 10, fontFamily: 'monospace' }}>
        Frame: {snapshot.frameTimeMs.toFixed(1)}ms
      </Text>
    </View>
  );
}
