/**
 * @module SoundManager
 *
 * Procedural audio engine for Grailguard built on top of Tone.js.
 * Provides three audio layers:
 *
 * 1. **Ambience** -- continuous pink/brown noise that adapts to the active biome.
 * 2. **BGM** -- a looping melodic phrase whose tempo and notes shift between
 *    the build and defend phases.
 * 3. **SFX** -- one-shot sounds for UI clicks, building placement, combat
 *    hits, and game-over.
 *
 * All synthesis is done in-browser; no audio assets are required.
 *
 * Usage: import the pre-instantiated {@link soundManager} singleton rather
 * than constructing `AudioEngine` directly.
 */

import * as Tone from 'tone';
import { audioBus } from './audio/audioBridge';

/**
 * Manages all procedural audio for the game. Wraps Tone.js synthesizers for
 * ambience, background music, and sound effects behind a high-level API
 * consumed by the game engine and UI.
 *
 * Instantiated once as the module-level {@link soundManager} singleton.
 */
class AudioEngine {
  private inited = false;
  private ambienceSynth: Tone.NoiseSynth | null = null;
  private bgmSynth: Tone.PolySynth | null = null;
  private sfxSynth: Tone.Synth | null = null;
  private melodyPart: Tone.Part | null = null;
  private soundEnabled = true;
  private musicEnabled = true;

  private ambienceStarted = false;

  /**
   * Initializes the Tone.js audio context and creates all synthesizer
   * instances. Safe to call multiple times -- subsequent calls only update
   * the enabled flags without re-creating synthesizers.
   *
   * Must be invoked from a user-gesture handler (e.g. a click) to satisfy
   * browser autoplay policies.
   *
   * @param soundEnabled - Whether SFX and ambience should play.
   * @param musicEnabled - Whether background music should play.
   */
  async init(soundEnabled: boolean, musicEnabled: boolean) {
    if (this.inited) {
      // Stop active playback when re-initializing with changed flags
      if (!soundEnabled && this.soundEnabled && this.ambienceStarted) {
        this.stopAmbience();
      }
      if (!musicEnabled && this.musicEnabled) {
        this.stopMusic();
      }
      this.soundEnabled = soundEnabled;
      this.musicEnabled = musicEnabled;
      return;
    }
    this.inited = true;
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;

    await Tone.start();

    // Ambience (Wind/Nature)
    this.ambienceSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
      volume: -20,
    }).toDestination();

    // BGM
    this.bgmSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.2, release: 1 },
      volume: -15,
    }).toDestination();

    // SFX
    this.sfxSynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -10,
    }).toDestination();

    // Subscribe to game audio events
    this.subscribeToAudioBus();
  }

  /**
   * Starts or adjusts the ambient noise loop based on the current biome.
   * Uses pink noise for most biomes and brown noise for `'desert-wastes'`.
   *
   * @param biome - The active biome identifier (e.g. `'kings-road'`, `'desert-wastes'`).
   */
  playAmbience(biome: string) {
    if (!this.soundEnabled) return;
    if (!this.ambienceStarted) {
      this.ambienceSynth?.triggerAttack(0);
      this.ambienceStarted = true;
    }
    // Adjust tone based on biome
    if (this.ambienceSynth) {
      if (biome === 'desert-wastes') {
        this.ambienceSynth.noise.type = 'brown';
      } else {
        this.ambienceSynth.noise.type = 'pink';
      }
    }
  }

  /** Stops the ambient noise loop with a release envelope. */
  stopAmbience() {
    if (this.ambienceStarted) {
      this.ambienceSynth?.triggerRelease();
      this.ambienceStarted = false;
    }
  }

  /**
   * Switches the background music loop to match the current game phase.
   * - `'build'`     -- calm arpeggio at 80 BPM (C-E-G-C4)
   * - `'defend'`    -- driving minor pattern at 120 BPM
   * - `'game_over'` -- stops playback entirely
   *
   * If music is disabled, any currently playing loop is stopped.
   *
   * @param phase - The game phase to score.
   */
  playMusic(phase: 'build' | 'defend' | 'game_over') {
    if (!this.musicEnabled) {
      this.stopMusic();
      return;
    }

    this.stopMusic();

    if (phase === 'game_over') return;

    Tone.Transport.bpm.value = phase === 'build' ? 80 : 120;

    const notes =
      phase === 'build'
        ? [
            { time: '0:0:0', note: 'C3', dur: '4n' },
            { time: '0:1:0', note: 'E3', dur: '4n' },
            { time: '0:2:0', note: 'G3', dur: '4n' },
            { time: '0:3:0', note: 'C4', dur: '4n' },
          ]
        : [
            { time: '0:0:0', note: 'C2', dur: '8n' },
            { time: '0:0:2', note: 'G2', dur: '8n' },
            { time: '0:1:0', note: 'C3', dur: '8n' },
            { time: '0:1:2', note: 'Eb3', dur: '8n' },
            { time: '0:2:0', note: 'G3', dur: '8n' },
            { time: '0:2:2', note: 'C4', dur: '8n' },
          ];

    this.melodyPart = new Tone.Part((time, value) => {
      this.bgmSynth?.triggerAttackRelease(value.note, value.dur, time);
    }, notes).start(0);

    this.melodyPart.loop = true;
    this.melodyPart.loopEnd = '1m';
    Tone.Transport.start();
  }

  /** Immediately stops background music and disposes the active Tone.Part. */
  stopMusic() {
    Tone.Transport.stop();
    this.melodyPart?.dispose();
    this.melodyPart = null;
  }

  /** Plays a short high-pitched click for UI button presses. */
  playUiClick() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('C5', '32n');
  }

  /** Plays a mid-tone "thud" when a structure is placed. */
  playBuild() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('G4', '16n');
  }

  /**
   * Plays a low-pitched combat hit sound. Randomly skips 70% of calls to
   * avoid overwhelming the audio output during large battles.
   */
  playCombat() {
    if (!this.soundEnabled || !this.inited) return;
    // Don't overwhelm, randomly skip
    if (Math.random() > 0.3) return;
    this.sfxSynth?.triggerAttackRelease('C3', '32n');
  }

  /** Plays a rising fanfare to mark a new wave starting. */
  playWaveStart() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('E4', '16n');
  }

  /** Plays a triumphant note to mark a wave completed. */
  playWaveComplete() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('G5', '8n');
  }

  /** Plays a deep rumble for boss spawn. */
  playBossSpawn() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('C2', '4n');
  }

  /** Plays a sparkle sound for spell cast. */
  playSpellCast() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('A5', '16n');
  }

  /** Plays a short low thud for enemy death. Randomly skips 50% to avoid spam. */
  playUnitDeath() {
    if (!this.soundEnabled || !this.inited) return;
    if (Math.random() > 0.5) return;
    this.sfxSynth?.triggerAttackRelease('E2', '32n');
  }

  /**
   * Plays a dramatic minor chord and silences all other audio layers to
   * signal the end of the game.
   */
  playGameOver() {
    if (!this.soundEnabled || !this.inited) return;
    this.stopMusic();
    this.stopAmbience();
    this.bgmSynth?.triggerAttackRelease(['C2', 'Eb2', 'G2'], '2m');
  }

  /** Subscribes to audioBus events. Should be called once during init. */
  private subscribeToAudioBus() {
    audioBus.on('combat_hit', () => this.playCombat());
    audioBus.on('unit_death', () => this.playUnitDeath());
    audioBus.on('building_placed', () => this.playBuild());
    audioBus.on('wave_start', () => this.playWaveStart());
    audioBus.on('wave_complete', () => this.playWaveComplete());
    audioBus.on('boss_spawn', () => this.playBossSpawn());
    audioBus.on('game_over', () => this.playGameOver());
    audioBus.on('spell_cast', () => this.playSpellCast());
  }

  dispose() {
    this.stopMusic();
    this.stopAmbience();
    this.ambienceSynth?.dispose();
    this.bgmSynth?.dispose();
    this.sfxSynth?.dispose();
    this.ambienceSynth = null;
    this.bgmSynth = null;
    this.sfxSynth = null;
    this.melodyPart = null;
    this.inited = false;
  }
}

/**
 * Pre-instantiated singleton audio engine. All engine and UI code should
 * import this rather than constructing a new `AudioEngine`.
 */
export const soundManager = new AudioEngine();
