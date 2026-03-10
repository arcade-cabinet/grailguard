import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Day/Night lighting stages (kept for directional light cycling)
const SUN_COLORS: [number, number, number][] = [
  [1.0, 0.95, 0.8], // Day
  [1.0, 0.5, 0.2], // Dusk
  [0.1, 0.1, 0.4], // Night (moon)
  [0.8, 0.5, 0.3], // Dawn
];

const SUN_INTENSITIES = [2.0, 1.0, 0.2, 0.8];
const AMBIENT_BASES = [0.5, 0.3, 0.08, 0.25];

/**
 * Module-level time-of-day accumulator — purely visual, no Zustand updates.
 */
let _timeOfDay = 0;

function lerp3(a: [number, number, number], b: [number, number, number], t: number): THREE.Color {
  return new THREE.Color(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  );
}

/**
 * Scene environment with real HDRI skybox and animated day/night lighting cycle.
 * Uses AmbientCG CC0 HDRI tonemapped JPG as equirectangular background.
 */
export function Environment() {
  const dirLight = useRef<THREE.DirectionalLight>(null);
  const ambLight = useRef<THREE.AmbientLight>(null);
  const { scene } = useThree();

  // Load the HDRI skyboxes as equirectangular textures
  const [dayHdri, eveningHdri, nightHdri] = useTexture([
    '/assets/hdri/day.jpg',
    '/assets/hdri/evening.jpg',
    '/assets/hdri/night.jpg',
  ]);

  // Apply mapping and color space
  useEffect(() => {
    dayHdri.mapping = THREE.EquirectangularReflectionMapping;
    dayHdri.colorSpace = THREE.SRGBColorSpace;
    eveningHdri.mapping = THREE.EquirectangularReflectionMapping;
    eveningHdri.colorSpace = THREE.SRGBColorSpace;
    nightHdri.mapping = THREE.EquirectangularReflectionMapping;
    nightHdri.colorSpace = THREE.SRGBColorSpace;
    return () => {
      scene.background = null;
      scene.environment = null;
    };
  }, [dayHdri, eveningHdri, nightHdri, scene]);

  useFrame((_state, delta) => {
    _timeOfDay = (_timeOfDay + delta * 0.01) % 1.0;

    const stage = _timeOfDay * 4;
    const stageIdx = Math.floor(stage) % 4;
    const nextIdx = (stageIdx + 1) % 4;
    const frac = stage - Math.floor(stage);

    const sunColor = lerp3(SUN_COLORS[stageIdx], SUN_COLORS[nextIdx], frac);
    const intensity =
      SUN_INTENSITIES[stageIdx] + (SUN_INTENSITIES[nextIdx] - SUN_INTENSITIES[stageIdx]) * frac;
    const ambBase =
      AMBIENT_BASES[stageIdx] + (AMBIENT_BASES[nextIdx] - AMBIENT_BASES[stageIdx]) * frac;

    if (dirLight.current) {
      dirLight.current.color.copy(sunColor);
      dirLight.current.intensity = intensity;
    }
    if (ambLight.current) {
      ambLight.current.intensity = ambBase;
    }

    // HDRI swap
    let currentHdri = dayHdri;
    if (_timeOfDay > 0.25 && _timeOfDay <= 0.5) {
      currentHdri = eveningHdri;
    } else if (_timeOfDay > 0.5 && _timeOfDay <= 0.75) {
      currentHdri = nightHdri;
    } else if (_timeOfDay > 0.75) {
      currentHdri = dayHdri; // dawn uses day
    }

    if (scene.background !== currentHdri) {
      scene.background = currentHdri;
      scene.environment = currentHdri;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#87ceeb', 40, 100]} />
      <ambientLight ref={ambLight} intensity={0.5} />
      <directionalLight
        ref={dirLight}
        position={[15, 25, 10]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <hemisphereLight args={['#87ceeb', '#4a3728', 0.4]} />
    </>
  );
}
