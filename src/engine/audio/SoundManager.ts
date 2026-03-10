/**
 * SoundManager — Procedural game audio using Tone.js synthesizers.
 *
 * All sounds are generated via synthesis (no audio files needed).
 * Uses lazy initialization — Tone.js context starts on first user interaction.
 */
import * as Tone from 'tone';

/** Whether the audio context has been started by a user gesture */
let _contextStarted = false;

/** Ensure Tone.js context is running (requires user gesture the first time) */
async function ensureContext(): Promise<boolean> {
  if (_contextStarted) return true;
  try {
    await Tone.start();
    _contextStarted = true;
    return true;
  } catch {
    return false;
  }
}

// ── Synth definitions (lazy-created) ──────────────────────────────────────────

let _buildSynth: Tone.PolySynth | null = null;
let _hitSynth: Tone.MembraneSynth | null = null;
let _killSynth: Tone.MetalSynth | null = null;
let _smiteSynth: Tone.NoiseSynth | null = null;
let _smiteFilter: Tone.Filter | null = null;
let _waveHorn: Tone.FMSynth | null = null;
let _victorySynth: Tone.PolySynth | null = null;
let _breachSynth: Tone.MembraneSynth | null = null;
let _healSynth: Tone.AMSynth | null = null;
let _uiClickSynth: Tone.Synth | null = null;

function getBuildSynth(): Tone.PolySynth {
  if (!_buildSynth) {
    _buildSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 },
      volume: -12,
    }).toDestination();
  }
  return _buildSynth;
}

function getHitSynth(): Tone.MembraneSynth {
  if (!_hitSynth) {
    _hitSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -16,
    }).toDestination();
  }
  return _hitSynth;
}

function getKillSynth(): Tone.MetalSynth {
  if (!_killSynth) {
    _killSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.3, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 3000,
      octaves: 1.5,
      volume: -18,
    }).toDestination();
  }
  return _killSynth;
}

function getSmiteSynth(): Tone.NoiseSynth {
  if (!_smiteSynth) {
    _smiteFilter = new Tone.Filter({ frequency: 2000, type: 'bandpass', Q: 2 }).toDestination();
    _smiteSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 0.1 },
      volume: -10,
    }).connect(_smiteFilter);
  }
  return _smiteSynth;
}

function getWaveHorn(): Tone.FMSynth {
  if (!_waveHorn) {
    _waveHorn = new Tone.FMSynth({
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.2, decay: 0.3, sustain: 0.4, release: 1.0 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.5, decay: 0.5, sustain: 1, release: 0.5 },
      volume: -8,
    }).toDestination();
  }
  return _waveHorn;
}

function getVictorySynth(): Tone.PolySynth {
  if (!_victorySynth) {
    _victorySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
      volume: -10,
    }).toDestination();
  }
  return _victorySynth;
}

function getBreachSynth(): Tone.MembraneSynth {
  if (!_breachSynth) {
    _breachSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -6,
    }).toDestination();
  }
  return _breachSynth;
}

function getHealSynth(): Tone.AMSynth {
  if (!_healSynth) {
    _healSynth = new Tone.AMSynth({
      harmonicity: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 0.4 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 },
      volume: -14,
    }).toDestination();
  }
  return _healSynth;
}

function getUIClickSynth(): Tone.Synth {
  if (!_uiClickSynth) {
    _uiClickSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -18,
    }).toDestination();
  }
  return _uiClickSynth;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Construction sound — rising arpeggio (triangle). Call when governor places a building. */
export async function playBuildSound(): Promise<void> {
  if (!(await ensureContext())) return;
  const synth = getBuildSynth();
  const now = Tone.now();
  synth.triggerAttackRelease('C4', '16n', now);
  synth.triggerAttackRelease('E4', '16n', now + 0.06);
  synth.triggerAttackRelease('G4', '16n', now + 0.12);
}

/** Hit sound — short percussive thud. Call on each ranged/melee attack hit. */
export async function playHitSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getHitSynth().triggerAttackRelease('C1', '32n');
}

/** Kill sound — metallic clang. Call when an enemy dies. */
export async function playKillSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getKillSynth().triggerAttackRelease(200, '16n');
}

/** Heal sound — soft angelic tone. Call when cleric heals. */
export async function playHealSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getHealSynth().triggerAttackRelease('E5', '8n');
}

/** Divine smite — lightning crack noise burst. */
export async function playSmiteSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getSmiteSynth().triggerAttackRelease('8n');
}

/** War horn — wave starts. Deep FM sweep. */
export async function playWaveStartSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getWaveHorn().triggerAttackRelease('A2', '2n');
}

/** Victory chime — wave ends. Ascending major chord. */
export async function playVictorySound(): Promise<void> {
  if (!(await ensureContext())) return;
  const synth = getVictorySynth();
  const now = Tone.now();
  synth.triggerAttackRelease('C5', '8n', now);
  synth.triggerAttackRelease('E5', '8n', now + 0.1);
  synth.triggerAttackRelease('G5', '8n', now + 0.2);
  synth.triggerAttackRelease('C6', '4n', now + 0.3);
}

/** Sanctuary breach — deep impact drum. Call when enemy reaches the sanctuary. */
export async function playBreachSound(): Promise<void> {
  if (!(await ensureContext())) return;
  getBreachSynth().triggerAttackRelease('C1', '8n');
}

/** UI click — tiny sine blip. Call on button presses. */
export async function playUIClick(): Promise<void> {
  if (!(await ensureContext())) return;
  getUIClickSynth().triggerAttackRelease('A5', '32n');
}

/** Boss AoE attack — layered impact. */
export async function playBossAoESound(): Promise<void> {
  if (!(await ensureContext())) return;
  const now = Tone.now();
  getBreachSynth().triggerAttackRelease('E1', '8n', now);
  getKillSynth().triggerAttackRelease(200, '16n', now + 0.05);
}

/** Dispose all synths. Call on unmount. */
export function disposeSounds(): void {
  _buildSynth?.dispose();
  _hitSynth?.dispose();
  _killSynth?.dispose();
  _smiteSynth?.dispose();
  _smiteFilter?.dispose();
  _waveHorn?.dispose();
  _victorySynth?.dispose();
  _breachSynth?.dispose();
  _healSynth?.dispose();
  _uiClickSynth?.dispose();

  _buildSynth = null;
  _hitSynth = null;
  _killSynth = null;
  _smiteSynth = null;
  _smiteFilter = null;
  _waveHorn = null;
  _victorySynth = null;
  _breachSynth = null;
  _healSynth = null;
  _uiClickSynth = null;
}
