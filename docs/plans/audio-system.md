# Audio System — Design & Implementation

> **Status**: Code written, pending `pnpm add tone` and CombatController wiring.

## Architecture

```text
┌──────────────────────────────────────────────────┐
│                 Game Events                       │
│  (Zustand store changes, useFrame combat loop)   │
├──────────────────────────────────────────────────┤
│              AudioBridge.ts                       │
│  Subscribes to store → routes to audio modules   │
├──────────────────┬───────────────────────────────┤
│  SoundManager.ts │     AmbienceManager.ts        │
│  10 synth sounds │  Adaptive ambient layers      │
│  (one-shots)     │  (continuous loops)           │
└──────────────────┴───────────────────────────────┘
         │                    │
         └────── Tone.js ─────┘
```

## Files

| File | Purpose |
| --- | --- |
| `src/engine/audio/SoundManager.ts` | 10 procedural synth sounds (no audio files) |
| `src/engine/audio/AmbienceManager.ts` | Adaptive ambient loops (wind, drone, battle) |
| `src/engine/audio/AudioBridge.ts` | Zustand subscriber that routes events to audio |

## SoundManager — Synth Catalog

All sounds are procedurally generated using Tone.js synthesizers. No audio files needed.

| Function | Synth Type | Sound | Trigger Point |
| --- | --- | --- | --- |
| `playBuildSound()` | PolySynth (triangle) | C-E-G arpeggio | Building placed |
| `playHitSound()` | MembraneSynth | Low percussive thud | Attack hits target |
| `playKillSound()` | MetalSynth | Metallic clang | Enemy dies |
| `playHealSound()` | AMSynth | Soft angelic tone | Cleric heals ally |
| `playSmiteSound()` | NoiseSynth (white) | Lightning crack | Divine Smite ability |
| `playWaveStartSound()` | FMSynth | Deep war horn sweep | Wave begins |
| `playVictorySound()` | PolySynth (sine) | C5-E5-G5-C6 ascend | Wave cleared |
| `playBreachSound()` | MembraneSynth | Deep impact drum | Enemy reaches Sanctuary |
| `playBossAoESound()` | Membrane + Metal | Layered impact | Boss AoE attack |
| `playUIClick()` | Synth (sine) | Tiny A5 blip | Button press |

## AmbienceManager — Ambient Layers

| Layer | Type | Build Phase | Defend Phase |
| --- | --- | --- | --- |
| Wind | Pink noise + AutoFilter | -28 dB (soft breeze) | -22 dB + wave scaling |
| Bass Drone | Sine synth (C2) | -30 dB (subtle) | -24 dB + wave scaling |
| Battle Pulse | FMSynth loop (D1, quarter notes) | Stopped | Running, volume scales with wave |

Wave intensity formula: `volume += min(wave * 0.5, 6)` dB

## AudioBridge — Event Routing

The bridge subscribes to two Zustand selectors:

1. **Phase transitions** (`state.phase`):
   - `build → defend`: `playWaveStartSound()` + `setDefendPhase(wave)`
   - `defend → build`: `playVictorySound()` + `setBuildPhase()`

2. **Building count** (`Object.keys(state.buildings).length`):
   - Count increases: `playBuildSound()`

## Remaining Wiring (CombatController)

These sounds need to be called directly from `CombatController.tsx` inside the `useFrame` loop, because they fire per-entity per-frame:

```typescript
// In CombatController.tsx, inside the attack resolution block:
import { playHitSound, playKillSound, playHealSound, playBreachSound, playBossAoESound } from '../../engine/audio/SoundManager';

// After a successful attack:
playHitSound();

// After an enemy dies (hp <= 0):
playKillSound();

// After a heal:
playHealSound();

// After a sanctuary breach:
playBreachSound();

// After boss AoE:
playBossAoESound();
```

## Game Screen Integration

```typescript
// In src/app/game.tsx:
import { initAudioBridge, destroyAudioBridge } from '../engine/audio/AudioBridge';

useEffect(() => {
  initAudioBridge();
  return () => destroyAudioBridge();
}, []);
```

## Setup Steps

1. **Install Tone.js**: `pnpm add tone`
2. **Wire CombatController**: Add `playHitSound/playKillSound/playBreachSound` calls
3. **Wire game.tsx**: Call `initAudioBridge()` in useEffect
4. **Wire smite button**: Call `playSmiteSound()` in the smite action handler
5. **Test**: Start game, toggle auto-governor, verify sounds play on all events
