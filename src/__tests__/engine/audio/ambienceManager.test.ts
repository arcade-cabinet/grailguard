/**
 * @module ambienceManager.test
 *
 * TDD tests for the biome-specific ambience manager (US-071).
 */

import ambienceConfig from '../../../data/ambienceConfig.json';
import { createAmbienceManager } from '../../../engine/audio/ambienceManager';
import { AudioBridge } from '../../../engine/audio/audioBridge';

describe('ambience manager (US-071)', () => {
  describe('ambienceConfig.json', () => {
    it('contains kings-road with pink noise and volume -20', () => {
      const config = ambienceConfig['kings-road'];
      expect(config.noiseType).toBe('pink');
      expect(config.baseVolume).toBe(-20);
    });

    it('contains desert-wastes with brown noise and volume -25', () => {
      const config = ambienceConfig['desert-wastes'];
      expect(config.noiseType).toBe('brown');
      expect(config.baseVolume).toBe(-25);
    });

    it('contains frost-peaks with white noise and volume -30', () => {
      const config = ambienceConfig['frost-peaks'];
      expect(config.noiseType).toBe('white');
      expect(config.baseVolume).toBe(-30);
    });
  });

  describe('createAmbienceManager', () => {
    it('creates a manager with start and stop methods', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('kings-road', bus);
      expect(typeof manager.start).toBe('function');
      expect(typeof manager.stop).toBe('function');
    });

    it('returns the current biome from the manager', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('desert-wastes', bus);
      expect(manager.biome).toBe('desert-wastes');
    });

    it('returns the config for the current biome', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('frost-peaks', bus);
      expect(manager.config.noiseType).toBe('white');
      expect(manager.config.baseVolume).toBe(-30);
    });

    it('subscribes to wave_start events on the audio bus', () => {
      const bus = new AudioBridge();
      const initialCount = bus.listenerCount('wave_start');
      createAmbienceManager('kings-road', bus);
      expect(bus.listenerCount('wave_start')).toBe(initialCount + 1);
    });

    it('subscribes to wave_complete events on the audio bus', () => {
      const bus = new AudioBridge();
      const initialCount = bus.listenerCount('wave_complete');
      createAmbienceManager('kings-road', bus);
      expect(bus.listenerCount('wave_complete')).toBe(initialCount + 1);
    });

    it('tracks intensity changes when wave_start is emitted', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('kings-road', bus);
      bus.emit({ type: 'wave_start' });
      expect(manager.intensity).toBe('high');
    });

    it('tracks intensity changes when wave_complete is emitted', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('kings-road', bus);
      bus.emit({ type: 'wave_start' });
      bus.emit({ type: 'wave_complete' });
      expect(manager.intensity).toBe('low');
    });

    it('dispose removes listeners from audio bus', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('kings-road', bus);
      const countBefore = bus.listenerCount('wave_start');
      manager.dispose();
      expect(bus.listenerCount('wave_start')).toBe(countBefore - 1);
    });

    it('defaults to unknown biome gracefully', () => {
      const bus = new AudioBridge();
      const manager = createAmbienceManager('unknown-biome', bus);
      // Should use kings-road as fallback
      expect(manager.config.noiseType).toBe('pink');
    });
  });
});
