/**
 * @module DayNightCycle
 *
 * Dynamic lighting system that cycles through 4 atmosphere presets
 * (dawn, day, dusk, night) based on the current wave number. Each wave
 * transition smoothly lerps ambient and directional light colors and
 * intensities via useFrame, driven by data in lightingConfig.json.
 */
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import lightingConfig from '../../data/lightingConfig.json';

const PRESET_ORDER = ['dawn', 'day', 'dusk', 'night'] as const;
type PresetName = (typeof PRESET_ORDER)[number];

interface LightingPreset {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
}

const presets = lightingConfig.presets as Record<PresetName, LightingPreset>;

// Pre-parsed color objects for lerping
const presetColors: Record<PresetName, { ambient: THREE.Color; directional: THREE.Color }> = {
  dawn: {
    ambient: new THREE.Color(presets.dawn.ambientColor),
    directional: new THREE.Color(presets.dawn.directionalColor),
  },
  day: {
    ambient: new THREE.Color(presets.day.ambientColor),
    directional: new THREE.Color(presets.day.directionalColor),
  },
  dusk: {
    ambient: new THREE.Color(presets.dusk.ambientColor),
    directional: new THREE.Color(presets.dusk.directionalColor),
  },
  night: {
    ambient: new THREE.Color(presets.night.ambientColor),
    directional: new THREE.Color(presets.night.directionalColor),
  },
};

/** Props for the day/night cycle lighting controller. */
export interface DayNightCycleProps {
  /** Current wave number (1-based). Maps wave % 4 to a preset. */
  wave: number;
}

/**
 * Renders hemisphere + directional lights that smoothly lerp between
 * dawn/day/dusk/night presets. Preset is determined by `wave % 4`.
 * Smooth transitions happen per-frame at a configurable speed.
 */
export function DayNightCycle({ wave }: DayNightCycleProps) {
  const ambientRef = useRef<THREE.HemisphereLight>(null);
  const directionalRef = useRef<THREE.DirectionalLight>(null);

  // Track current interpolated values via refs (no useState for per-frame)
  const currentAmbientColor = useRef(new THREE.Color(presets.day.ambientColor));
  const currentDirColor = useRef(new THREE.Color(presets.day.directionalColor));
  const currentAmbientIntensity = useRef(presets.day.ambientIntensity);
  const currentDirIntensity = useRef(presets.day.directionalIntensity);

  useFrame((_state, delta) => {
    const presetIdx = (wave - 1) % 4;
    const presetName = PRESET_ORDER[presetIdx];
    const target = presets[presetName];
    const targetColors = presetColors[presetName];

    const speed = lightingConfig.transitionSpeed;
    const t = Math.min(1, delta * speed);

    // Lerp colors
    currentAmbientColor.current.lerp(targetColors.ambient, t);
    currentDirColor.current.lerp(targetColors.directional, t);

    // Lerp intensities
    currentAmbientIntensity.current +=
      (target.ambientIntensity - currentAmbientIntensity.current) * t;
    currentDirIntensity.current += (target.directionalIntensity - currentDirIntensity.current) * t;

    // Apply to lights
    if (ambientRef.current) {
      ambientRef.current.color.copy(currentAmbientColor.current);
      ambientRef.current.intensity = currentAmbientIntensity.current;
    }
    if (directionalRef.current) {
      directionalRef.current.color.copy(currentDirColor.current);
      directionalRef.current.intensity = currentDirIntensity.current;
    }
  });

  return (
    <>
      <hemisphereLight ref={ambientRef} args={['#ffffff', '#444444', 0.7]} />
      {/* Sun light positioned at an angle for dramatic shadows with warm tint */}
      <directionalLight
        ref={directionalRef}
        position={[50, 80, 30]}
        color="#fff5e0"
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.001}
      />
    </>
  );
}
