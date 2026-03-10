import * as Tone from 'tone';
import {
  disposeSounds,
  playBossAoESound,
  playBreachSound,
  playBuildSound,
  playHealSound,
  playHitSound,
  playKillSound,
  playSmiteSound,
  playUIClick,
  playVictorySound,
  playWaveStartSound,
} from '../../../engine/audio/SoundManager';

// Mock Tone.js
jest.mock('tone', () => {
  const triggerAttackReleaseMock = jest.fn();
  const disposeMock = jest.fn();
  const toDestinationMock = jest.fn().mockReturnThis();
  const connectMock = jest.fn().mockReturnThis();

  const mockSynth = jest.fn().mockImplementation(() => ({
    toDestination: toDestinationMock,
    connect: connectMock,
    triggerAttackRelease: triggerAttackReleaseMock,
    dispose: disposeMock,
    volume: { value: 0 },
  }));

  return {
    start: jest.fn().mockResolvedValue(undefined),
    now: jest.fn().mockReturnValue(0),
    PolySynth: mockSynth,
    MembraneSynth: mockSynth,
    MetalSynth: mockSynth,
    NoiseSynth: mockSynth,
    FMSynth: mockSynth,
    AMSynth: mockSynth,
    Synth: mockSynth,
    Filter: mockSynth,
    __triggerAttackReleaseMock: triggerAttackReleaseMock,
    __disposeMock: disposeMock,
  };
});

describe('SoundManager', () => {
  let triggerAttackReleaseMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    triggerAttackReleaseMock = (Tone as any).__triggerAttackReleaseMock;
    const disposeMock = (Tone as any).__disposeMock;
    disposeMock.mockClear();

    // Reset private variables in SoundManager to ensure clean state
    disposeSounds();
    disposeMock.mockClear(); // Clear again because disposeSounds just called it
  });

  it('initializes context and plays hit sound', async () => {
    await playHitSound();
    expect(Tone.start).toHaveBeenCalled();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('C1', '32n');
  });

  it('plays kill sound', async () => {
    await playKillSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith(200, '16n');
  });

  it('plays multi-note sounds (build, victory)', async () => {
    await playBuildSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledTimes(3);

    triggerAttackReleaseMock.mockClear();

    await playVictorySound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledTimes(4);
  });

  it('plays boss AoE composite sound', async () => {
    await playBossAoESound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledTimes(2);
    // Breach synth part
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('E1', '8n', 0);
    // Kill synth part
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith(200, '16n', 0.05);
  });

  it('plays various single shot sounds', async () => {
    await playHealSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('E5', '8n');
    triggerAttackReleaseMock.mockClear();

    await playSmiteSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('8n');
    triggerAttackReleaseMock.mockClear();

    await playWaveStartSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('A2', '2n');
    triggerAttackReleaseMock.mockClear();

    await playBreachSound();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('C1', '8n');
    triggerAttackReleaseMock.mockClear();

    await playUIClick();
    expect(triggerAttackReleaseMock).toHaveBeenCalledWith('A5', '32n');
  });

  it('disposes all synths correctly', async () => {
    // Play something to instantiate synths
    await playHitSound();
    await playWaveStartSound();

    disposeSounds();
    const disposeMock = (Tone as any).__disposeMock;
    // Two synths were created, both should be disposed
    expect(disposeMock).toHaveBeenCalledTimes(2);
  });
});
