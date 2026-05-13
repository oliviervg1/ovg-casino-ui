import type { ThemeType } from './themeManifesto';

/** localStorage key shared with AudioControlsContext. Both layers persist
 *  the muted flag here; SoundEngine reads it once at module load to seed
 *  initial gain (the React context then drives runtime updates via setMuted). */
export const AUDIO_MUTED_STORAGE_KEY = 'ovg-audio-muted';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.baseVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private muted: boolean = (() => {
    try { return localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true'; } catch { return false; }
  })();
  private baseVolume = 0.5;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.baseVolume;
    }
  }

  /** Test-only: read the current master-gain value. Not for production callers. */
  __getMasterGainValue(): number {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }

  private getThemeConfig(theme: ThemeType) {
    const configs: Record<ThemeType, { wave: OscillatorType, baseFreq: number, scale: number[] }> = {
      sweets: { wave: 'sine', baseFreq: 523.25, scale: [0, 4, 7, 12] },
      egypt: { wave: 'triangle', baseFreq: 261.63, scale: [0, 3, 7, 8] },
      space: { wave: 'sine', baseFreq: 587.33, scale: [0, 6, 7, 12] },
      west: { wave: 'square', baseFreq: 196.00, scale: [0, 2, 4, 7] },
      ocean: { wave: 'sine', baseFreq: 329.63, scale: [0, 4, 7, 12] },
      jungle: { wave: 'triangle', baseFreq: 220.00, scale: [0, 5, 10, 15] },
      vampire: { wave: 'sawtooth', baseFreq: 130.81, scale: [0, 3, 6, 9] },
      ninja: { wave: 'triangle', baseFreq: 440.00, scale: [0, 2, 3, 7] },
    };
    return configs[theme] || configs.sweets;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number, slideTo?: number, volMult: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);
    }
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1 * volMult, startTime + Math.min(0.05, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.01);
    gain.gain.setValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    return osc;
  }

  playWin(theme: ThemeType) {
    this.init();
    if (!this.ctx) return;
    const config = this.getThemeConfig(theme);
    const now = this.ctx.currentTime;
    
    config.scale.forEach((semitones, i) => {
      const freq = config.baseFreq * Math.pow(2, semitones / 12);
      this.playTone(freq, config.wave, 0.3, now + i * 0.1);
    });
    
    config.scale.forEach((semitones) => {
      const freq = config.baseFreq * Math.pow(2, semitones / 12);
      this.playTone(freq, config.wave, 1.5, now + config.scale.length * 0.1);
    });
  }

  playLose(theme: ThemeType) {
    this.init();
    if (!this.ctx) return;
    const config = this.getThemeConfig(theme);
    const now = this.ctx.currentTime;
    
    const loseScale = [6, 5, 3, 0];
    loseScale.forEach((semitones, i) => {
      const freq = (config.baseFreq * 0.5) * Math.pow(2, semitones / 12);
      this.playTone(freq, config.wave, 0.4, now + i * 0.2, i === loseScale.length - 1 ? freq * 0.8 : undefined);
    });
  }

  playRouletteSpin(theme: ThemeType, durationMs: number) {
    this.init();
    if (!this.ctx) return;
    const config = this.getThemeConfig(theme);
    const now = this.ctx.currentTime;
    const durationSec = durationMs / 1000;
    
    let time = now;
    let interval = 0.05;
    while (time < now + durationSec) {
      this.playTone(config.baseFreq * 1.5, 'square', 0.03, time, undefined, 0.3);
      time += interval;
      interval *= 1.08; 
    }
  }
  
  playSlotSpin(theme: ThemeType, durationMs: number) {
    this.init();
    if (!this.ctx) return;
    const config = this.getThemeConfig(theme);
    const now = this.ctx.currentTime;
    const durationSec = durationMs / 1000;
    
    let time = now;
    let i = 0;
    while (time < now + durationSec) {
      const freq = config.baseFreq * Math.pow(2, config.scale[i % config.scale.length] / 12);
      this.playTone(freq, config.wave, 0.1, time, undefined, 0.2);
      time += 0.1;
      i++;
    }
  }

  playBingoDraw(theme: ThemeType) {
    this.init();
    if (!this.ctx) return;
    const config = this.getThemeConfig(theme);
    const now = this.ctx.currentTime;
    
    this.playTone(config.baseFreq * 2, config.wave, 0.3, now);
  }
}

export const soundEngine = new SoundEngine();
