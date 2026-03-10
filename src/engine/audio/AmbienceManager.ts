/**
 * AmbienceManager — Adaptive ambient soundscape using Tone.js.
 *
 * Layers ambient loops that change based on game state:
 * - Build phase: peaceful medieval village ambience
 * - Defend phase: tense battle drone
 * - Wave intensity scales with wave number
 *
 * All sounds are synthesized procedurally — no audio files.
 */
import * as Tone from 'tone';

let _isRunning = false;
let _windNoise: Tone.Noise | null = null;
let _windFilter: Tone.AutoFilter | null = null;
let _bassDrone: Tone.Synth | null = null;
let _battleLoop: Tone.Loop | null = null;
let _battleSynth: Tone.FMSynth | null = null;

/**
 * Start the ambient soundscape. Should be called after user interaction
 * has started the Tone.js audio context.
 */
export async function startAmbience(): Promise<void> {
  if (_isRunning) return;

  try {
    await Tone.start();
  } catch {
    return;
  }

  // Wind — filtered pink noise with auto-panning for an outdoor feel
  _windFilter = new Tone.AutoFilter({
    frequency: 0.08,
    baseFrequency: 200,
    octaves: 3,
    depth: 0.8,
  })
    .toDestination()
    .start();

  _windNoise = new Tone.Noise({
    type: 'pink',
    volume: -28,
  }).connect(_windFilter);
  _windNoise.start();

  // Low drone — provides a tonal "base" for the soundscape
  _bassDrone = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 2, decay: 0, sustain: 1, release: 3 },
    volume: -30,
  }).toDestination();
  _bassDrone.triggerAttack('C2');

  // Battle loop — staccato low pulses, started when defend phase begins
  _battleSynth = new Tone.FMSynth({
    harmonicity: 1.5,
    modulationIndex: 3,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 },
    volume: -24,
  }).toDestination();

  _battleLoop = new Tone.Loop((time) => {
    _battleSynth?.triggerAttackRelease('D1', '16n', time);
  }, '4n');

  _isRunning = true;
}

/**
 * Transition to build-phase ambience (calm).
 */
export function setBuildPhase(): void {
  if (!_isRunning) return;
  _battleLoop?.stop();
  if (_windNoise) _windNoise.volume.rampTo(-28, 1);
  if (_bassDrone) _bassDrone.volume.rampTo(-30, 1);
}

/**
 * Transition to defend-phase ambience (tense).
 * @param wave - Current wave number, used to scale intensity
 */
export function setDefendPhase(wave: number): void {
  if (!_isRunning) return;

  // Start battle pulses
  _battleLoop?.start();

  // Intensity ramps with wave
  const intensityFactor = Math.min(wave * 0.5, 6);
  if (_windNoise) _windNoise.volume.rampTo(-22 + intensityFactor, 0.5);
  if (_bassDrone) _bassDrone.volume.rampTo(-24 + intensityFactor, 0.5);
  if (_battleSynth) _battleSynth.volume.rampTo(-22 + intensityFactor * 0.5, 0.5);
}

/**
 * Stop and dispose all ambient synths.
 */
export function stopAmbience(): void {
  _windNoise?.stop();
  _windNoise?.dispose();
  _windFilter?.stop();
  _windFilter?.dispose();
  _bassDrone?.triggerRelease();
  _bassDrone?.dispose();
  _battleLoop?.stop();
  _battleLoop?.dispose();
  _battleSynth?.dispose();

  _windNoise = null;
  _windFilter = null;
  _bassDrone = null;
  _battleLoop = null;
  _battleSynth = null;
  _isRunning = false;
}
