import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

// Day/Night color stages
const SKY_COLORS: [number, number, number][] = [
  [0.53, 0.81, 0.98], // Day
  [0.98, 0.55, 0.27], // Dusk
  [0.05, 0.05, 0.15], // Night
  [0.4, 0.3, 0.6], // Dawn
];

const SUN_COLORS: [number, number, number][] = [
  [1.0, 0.95, 0.8], // Day
  [1.0, 0.5, 0.2], // Dusk
  [0.1, 0.1, 0.4], // Night (moon)
  [0.8, 0.5, 0.3], // Dawn
];

const SUN_INTENSITIES = [2.0, 1.0, 0.2, 0.8];

function lerp3(a: [number, number, number], b: [number, number, number], t: number): THREE.Color {
  return new THREE.Color(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}

export function Environment() {
  const dirLight = useRef<THREE.DirectionalLight>(null);
  const ambLight = useRef<THREE.AmbientLight>(null);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);

  useFrame((state, delta) => {
    const t = useGameStore.getState().timeOfDay;
    const newT = (t + delta * 0.01) % 1.0;
    setTimeOfDay(newT);

    // 4-stage cycle
    const stage = newT * 4;
    const stageIdx = Math.floor(stage) % 4;
    const nextIdx = (stageIdx + 1) % 4;
    const frac = stage - Math.floor(stage);

    const skyColor = lerp3(SKY_COLORS[stageIdx], SKY_COLORS[nextIdx], frac);
    const sunColor = lerp3(SUN_COLORS[stageIdx], SUN_COLORS[nextIdx], frac);
    const intensity =
      SUN_INTENSITIES[stageIdx] + (SUN_INTENSITIES[nextIdx] - SUN_INTENSITIES[stageIdx]) * frac;

    state.scene.background = skyColor;
    if (state.scene.fog instanceof THREE.FogExp2 || state.scene.fog instanceof THREE.Fog) {
      (state.scene.fog as THREE.Fog).color.copy(skyColor);
    }

    if (dirLight.current) {
      dirLight.current.color.copy(sunColor);
      dirLight.current.intensity = intensity;
    }
    if (ambLight.current) {
      ambLight.current.intensity = 0.1 + intensity * 0.3;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#87ceeb', 30, 80]} />
      <ambientLight ref={ambLight} intensity={0.4} />
      <directionalLight
        ref={dirLight}
        position={[10, 20, 10]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={60}
      />
      <hemisphereLight args={['#87ceeb', '#4a3728', 0.3]} />
    </>
  );
}
