/**
 * @module FilamentArena
 *
 * Native 3D scene using react-native-filament (Metal on iOS, Vulkan on Android).
 * This is the native equivalent of Arena.tsx which uses R3F for web.
 *
 * Filament replaces expo-gl which is broken on Expo SDK 55 New Architecture.
 * The R3F Arena is kept for web-only rendering via the rendererSwitch module.
 */
import type { Entity } from 'koota';
import { useQuery, useTrait } from 'koota/react';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  FilamentScene,
  FilamentView,
  Light,
  Model,
  type RenderCallback,
  Skybox,
} from 'react-native-filament';
import lightingConfig from '../../data/lightingConfig.json';
import {
  Building,
  Facing,
  GameSession,
  gameWorld,
  Position,
  stepRunWorld,
  Unit,
} from '../../engine/GameEngine';
import { soundManager } from '../../engine/SoundManager';
import { cameraState } from './CameraController';
import { BUILDING_MODEL_PATHS, UNIT_MODEL_PATHS } from './modelPaths';

// ---------------------------------------------------------------------------
// Lighting presets (match DayNightCycle.tsx)
// ---------------------------------------------------------------------------
const PRESET_ORDER = ['dawn', 'day', 'dusk', 'night'] as const;
type PresetName = (typeof PRESET_ORDER)[number];

interface LightingPreset {
  ambientColor: string;
  ambientIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
}

const presets = lightingConfig.presets as Record<PresetName, LightingPreset>;

function hexToKelvin(hex: string): number {
  // Approximate color temperature from hex color.
  // Warm colors -> lower Kelvin, cool colors -> higher Kelvin.
  const c = hex.replace('#', '');
  const r = Number.parseInt(c.substring(0, 2), 16) / 255;
  const b = Number.parseInt(c.substring(4, 6), 16) / 255;

  // Simple heuristic: warm (high R) -> 3000K, neutral -> 5500K, cool (high B) -> 8000K
  const warmth = r - b;
  return Math.round(5500 - warmth * 2500);
}

function getPresetForWave(wave: number): PresetName {
  return PRESET_ORDER[(wave - 1) % 4];
}

// ---------------------------------------------------------------------------
// Camera configuration
// ---------------------------------------------------------------------------
// Use a long-focal-length perspective camera positioned high to approximate
// orthographic/isometric view. This works around Filament only supporting
// perspective cameras.
const CAMERA_HEIGHT = 120;
const CAMERA_Z_OFFSET = 80;
const CAMERA_NEAR = 1;
const CAMERA_FAR = 500;
// Long focal length produces a narrow FOV that flattens perspective,
// approximating orthographic projection. ~200mm on a 24mm sensor.
const FOCAL_LENGTH_MM = 200;

// ---------------------------------------------------------------------------
// Skybox color per biome
// ---------------------------------------------------------------------------
function getSkyboxColor(biome?: string): string {
  switch (biome) {
    case 'dark-forest':
      return '#1a2a2a';
    case 'desert-wastes':
      return '#c4a67a';
    default:
      return '#87CEEB';
  }
}

// ---------------------------------------------------------------------------
// FilamentGameLoop -- drives ECS step each frame
// ---------------------------------------------------------------------------
function FilamentGameLoop() {
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const now = Date.now();
      const delta = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      stepRunWorld(delta);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// FilamentBuilding -- renders a building entity
// ---------------------------------------------------------------------------
function FilamentBuilding({ entity }: { entity: Entity }) {
  const building = entity.get(Building);
  const position = entity.get(Position);

  if (!building || !position) return null;

  const modelPath = BUILDING_MODEL_PATHS[building.type];
  if (!modelPath) return null;

  let scale: [number, number, number] = [0.8, 0.8, 0.8];
  if (building.type === 'wall') scale = [0.5, 0.5, 0.5];
  if (building.type === 'track') scale = [0.8, 0.8, 0.8];
  if (building.type === 'mine_ore') scale = [1.2, 1.2, 1.2];
  if (building.type === 'mine_gem') scale = [1.5, 1.5, 1.5];
  if (building.type === 'sentry') scale = [0.5, 0.5, 0.5];
  if (building.type === 'obelisk') scale = [0.6, 0.6, 0.6];
  if (building.type === 'mint') scale = [0.6, 0.4, 0.6];
  if (building.type === 'lumber') scale = [0.7, 0.6, 0.7];
  if (building.type === 'catapult') scale = [0.6, 0.6, 0.6];
  if (building.type === 'sorcerer') scale = [0.5, 0.7, 0.5];
  if (building.type === 'vault') scale = [0.8, 0.6, 0.8];

  return (
    <Model
      source={modelPath as number}
      translate={[position.x, position.y, position.z]}
      scale={scale}
    />
  );
}

// ---------------------------------------------------------------------------
// FilamentUnit -- renders a unit entity
// ---------------------------------------------------------------------------
function FilamentUnit({ entity }: { entity: Entity }) {
  const unit = entity.get(Unit);
  const position = entity.get(Position);
  const facing = entity.get(Facing);

  if (!unit || !position) return null;

  const modelPath = UNIT_MODEL_PATHS[unit.type];
  if (!modelPath) return null;

  const s = (() => {
    switch (unit.type) {
      case 'wall':
        return 0.5;
      case 'boss':
        return 1.5;
      case 'troll':
        return 1.2;
      case 'orc':
        return 0.8;
      case 'goblin':
        return 0.6;
      case 'knight':
        return 0.9;
      case 'militia':
        return 0.8;
      default:
        return 0.7;
    }
  })();

  return (
    <Model
      source={modelPath as number}
      translate={[position.x, position.y, position.z]}
      scale={[s, s, s]}
      rotate={[0, facing?.y ?? 0, 0]}
    />
  );
}

// ---------------------------------------------------------------------------
// FilamentProjectile -- renders a projectile as a small sphere model
// (Filament doesn't have built-in primitives; we skip projectiles for now
// since they're tiny spheres -- a future improvement can use RenderableManager)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// FilamentSceneContent -- inner component with access to useFilamentContext
// ---------------------------------------------------------------------------
function FilamentSceneContent({
  placementPreview: _placementPreview,
  selectedEntity: _selectedEntity,
}: {
  placementPreview: { x: number; y: number; z: number; valid: boolean } | null;
  selectedEntity: Entity | null;
}) {
  const session = useTrait(gameWorld, GameSession);
  const unitEntities = useQuery(Unit, Position, Facing);
  const buildingEntities = useQuery(Building, Position);
  const wave = session?.wave ?? 1;
  const biome = session?.biome;

  // Lighting based on wave
  const presetName = getPresetForWave(wave);
  const preset = presets[presetName];

  // Filament uses lux for directional lights.
  // Map our 0-2 intensity range to Filament's lux scale.
  const sunIntensity = Math.round(preset.directionalIntensity * 70000);
  const sunKelvin = hexToKelvin(preset.directionalColor);

  // Sound manager phase sync
  useEffect(() => {
    if (session) {
      soundManager.playMusic(session.phase);
    }
  }, [session?.phase, session]);

  // Camera position with pan offset
  const camPosition: [number, number, number] = [
    cameraState.panX,
    CAMERA_HEIGHT,
    CAMERA_Z_OFFSET + cameraState.panZ,
  ];
  const camTarget: [number, number, number] = [cameraState.panX, 0, cameraState.panZ];

  // RenderCallback runs as worklet on the UI thread every frame
  const renderCallback: RenderCallback = useCallback(() => {
    'worklet';
    // Filament handles rendering internally
  }, []);

  return (
    <FilamentView style={styles.filamentView} renderCallback={renderCallback}>
      {/* Sky background matching biome */}
      <Skybox colorInHex={getSkyboxColor(biome)} />

      {/* Camera: high perspective with long focal length to approximate isometric */}
      <Camera
        cameraPosition={camPosition}
        cameraTarget={camTarget}
        near={CAMERA_NEAR}
        far={CAMERA_FAR}
        focalLengthInMillimeters={FOCAL_LENGTH_MM}
      />

      {/* Sun (key light) */}
      <Light
        type="sun"
        intensity={sunIntensity}
        direction={[-0.4, -0.8, -0.4]}
        colorKelvin={sunKelvin}
        castShadows={true}
      />

      {/* Fill light */}
      <Light
        type="directional"
        intensity={Math.round(sunIntensity * 0.3)}
        direction={[0.6, -0.5, 0.4]}
        colorKelvin={7000}
      />

      {/* Buildings */}
      {buildingEntities.map((entity) => (
        <FilamentBuilding key={entity.id()} entity={entity} />
      ))}

      {/* Units */}
      {unitEntities.map((entity) => (
        <FilamentUnit key={entity.id()} entity={entity} />
      ))}
    </FilamentView>
  );
}

// ---------------------------------------------------------------------------
// Public FilamentArena
// ---------------------------------------------------------------------------

/**
 * Root Filament scene for native platforms.
 * Replaces the R3F Arena on iOS/Android where expo-gl is broken.
 *
 * @param props.placementPreview - Building placement ghost, or null.
 * @param props.selectedEntity - Currently selected entity, or null.
 */
export function FilamentArena({
  placementPreview,
  selectedEntity,
}: {
  placementPreview: { x: number; y: number; z: number; valid: boolean } | null;
  selectedEntity: Entity | null;
}) {
  return (
    <FilamentScene>
      <FilamentGameLoop />
      <FilamentSceneContent placementPreview={placementPreview} selectedEntity={selectedEntity} />
    </FilamentScene>
  );
}

const styles = StyleSheet.create({
  filamentView: { flex: 1 },
});
