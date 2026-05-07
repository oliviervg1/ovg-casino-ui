import { describe, it, expect, beforeEach } from 'vitest';

// jsdom doesn't define AudioContext; provide a minimal stub for the init() path.
(globalThis as any).AudioContext = class {
  state = 'running';
  createGain() { return { gain: { value: 0 }, connect() {} }; }
  get destination() { return {}; }
  resume() {}
};

import { soundEngine } from './SoundEngine';

describe('SoundEngine.setMuted', () => {
  beforeEach(() => {
    soundEngine.setMuted(false);
  });

  it('exposes setMuted() that does not throw before init', () => {
    expect(() => soundEngine.setMuted(true)).not.toThrow();
    expect(() => soundEngine.setMuted(false)).not.toThrow();
  });

  it('sets masterGain to 0 when muted, restores when unmuted (after init)', () => {
    soundEngine.init();
    soundEngine.setMuted(true);
    expect(soundEngine.__getMasterGainValue()).toBe(0);
    soundEngine.setMuted(false);
    expect(soundEngine.__getMasterGainValue()).toBeGreaterThan(0);
  });
});
