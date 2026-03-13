import { AudioBridge, type AudioEventPayload } from '../../../engine/audio/audioBridge';

describe('AudioBridge', () => {
  let bridge: AudioBridge;

  beforeEach(() => {
    bridge = new AudioBridge();
  });

  it('calls registered listeners when an event is emitted', () => {
    const listener = jest.fn();
    bridge.on('combat_hit', listener);

    const event: AudioEventPayload = { type: 'combat_hit' };
    bridge.emit(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('does not call listeners for other event types', () => {
    const listener = jest.fn();
    bridge.on('combat_hit', listener);

    bridge.emit({ type: 'wave_start' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple listeners for the same event', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    bridge.on('building_placed', listener1);
    bridge.on('building_placed', listener2);

    bridge.emit({ type: 'building_placed' });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('supports listeners for different event types', () => {
    const combatListener = jest.fn();
    const waveListener = jest.fn();
    bridge.on('combat_hit', combatListener);
    bridge.on('wave_start', waveListener);

    bridge.emit({ type: 'combat_hit' });

    expect(combatListener).toHaveBeenCalledTimes(1);
    expect(waveListener).not.toHaveBeenCalled();
  });

  it('unsubscribe function removes the listener', () => {
    const listener = jest.fn();
    const unsub = bridge.on('unit_death', listener);

    bridge.emit({ type: 'unit_death' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    bridge.emit({ type: 'unit_death' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('passes position and detail through the payload', () => {
    const listener = jest.fn();
    bridge.on('spell_cast', listener);

    const event: AudioEventPayload = {
      type: 'spell_cast',
      position: { x: 10, y: 0, z: 5 },
      detail: 'smite',
    };
    bridge.emit(event);

    expect(listener).toHaveBeenCalledWith(event);
    const received = listener.mock.calls[0][0] as AudioEventPayload;
    expect(received.position).toEqual({ x: 10, y: 0, z: 5 });
    expect(received.detail).toBe('smite');
  });

  it('clear() removes all listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    bridge.on('combat_hit', listener1);
    bridge.on('game_over', listener2);

    bridge.clear();

    bridge.emit({ type: 'combat_hit' });
    bridge.emit({ type: 'game_over' });

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });

  it('listenerCount() returns accurate counts', () => {
    expect(bridge.listenerCount('boss_spawn')).toBe(0);

    const unsub1 = bridge.on('boss_spawn', jest.fn());
    expect(bridge.listenerCount('boss_spawn')).toBe(1);

    bridge.on('boss_spawn', jest.fn());
    expect(bridge.listenerCount('boss_spawn')).toBe(2);

    unsub1();
    expect(bridge.listenerCount('boss_spawn')).toBe(1);
  });

  it('handles all defined event types', () => {
    const allTypes = [
      'combat_hit', 'unit_death', 'building_placed', 'building_sold',
      'wave_start', 'wave_complete', 'boss_spawn', 'spell_cast',
      'game_over', 'ui_click',
    ] as const;

    for (const type of allTypes) {
      const listener = jest.fn();
      bridge.on(type, listener);
      bridge.emit({ type });
      expect(listener).toHaveBeenCalledTimes(1);
    }
  });

  it('emitting with no listeners does not throw', () => {
    expect(() => bridge.emit({ type: 'wave_complete' })).not.toThrow();
  });
});
