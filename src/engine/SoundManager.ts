import * as Tone from 'tone';

class AudioEngine {
  private inited = false;
  private ambienceSynth: Tone.NoiseSynth | null = null;
  private bgmSynth: Tone.PolySynth | null = null;
  private sfxSynth: Tone.Synth | null = null;
  private melodyPart: Tone.Part | null = null;
  private soundEnabled = true;
  private musicEnabled = true;

  private ambienceStarted = false;

  async init(soundEnabled: boolean, musicEnabled: boolean) {
    if (this.inited) {
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
  }

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

  stopAmbience() {
    if (this.ambienceStarted) {
      this.ambienceSynth?.triggerRelease();
      this.ambienceStarted = false;
    }
  }

  playMusic(phase: 'build' | 'defend' | 'game_over') {
    if (!this.musicEnabled) {
      this.stopMusic();
      return;
    }

    Tone.Transport.stop();
    this.melodyPart?.dispose();

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

  stopMusic() {
    Tone.Transport.stop();
    this.melodyPart?.dispose();
    this.melodyPart = null;
  }

  playUiClick() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('C5', '32n');
  }

  playBuild() {
    if (!this.soundEnabled || !this.inited) return;
    this.sfxSynth?.triggerAttackRelease('G4', '16n');
  }

  playCombat() {
    if (!this.soundEnabled || !this.inited) return;
    // Don't overwhelm, randomly skip
    if (Math.random() > 0.3) return;
    this.sfxSynth?.triggerAttackRelease('C3', '32n');
  }

  playGameOver() {
    if (!this.soundEnabled || !this.inited) return;
    this.stopMusic();
    this.stopAmbience();
    this.bgmSynth?.triggerAttackRelease(['C2', 'Eb2', 'G2'], '2m');
  }
}

export const soundManager = new AudioEngine();
