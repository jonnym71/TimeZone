import { Injectable, signal } from '@angular/core';

const NOTE_HZ: Record<string, number> = {
  'D3': 146.83, 'E3': 164.81, 'F#3': 185.00, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C#4': 277.18, 'D4': 293.66, 'E4': 329.63, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00,
  'B4': 493.88, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00,
};

const RADETZKY_MELODY = [
  'D4', 'F#4', 'A4', 'D5',
  'D4', 'F#4', 'A4', 'D5',
  'F#5', 'D5', 'A4', 'F#4', 'D4', 'F#4', 'A4', 'D5',
  'F#5', 'D5', 'A4', 'F#4', 'D4', 'F#4', 'A4', 'D5',
  'A4', 'A4', 'A4', 'A4', 'B4', 'C#5', 'D5', 'E5',
  'F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'G4', 'F#4',
  'E4', 'D4', 'C#4', 'D4', 'E4', 'F#4', 'G4', 'A4',
  'D5', 'A4', 'F#4', 'D4', 'A3', 'D4', 'F#4', 'A4',
];

const RADETZKY_BASS = ['D3', 'A3', 'D3', 'A3', 'D3', 'A3', 'G3', 'A3', 'D3'];

const RADETZKY_NOTE_DUR = 0.2;

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly playing = signal(false);

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscs: OscillatorNode[] = [];
  private endTimer: number | null = null;

  private ensureContext(): void {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();
  }

  private scheduleNote(freq: number, startTime: number, duration: number, volume: number, type: OscillatorType = 'square'): OscillatorNode | null {
    if (!this.audioCtx || !this.masterGain) return null;
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.95);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    return osc;
  }

  playRadetzkymarsch(): void {
    this.stop();
    this.ensureContext();
    if (!this.audioCtx) return;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.masterGain.gain.setValueAtTime(0.55, this.audioCtx.currentTime);
    }

    const start = this.audioCtx.currentTime + 0.08;
    const dur = RADETZKY_NOTE_DUR;

    RADETZKY_MELODY.forEach((note, i) => {
      const freq = NOTE_HZ[note];
      if (!freq) return;
      const osc = this.scheduleNote(freq, start + i * dur, dur * 0.92, 0.09, 'triangle');
      if (osc) this.oscs.push(osc);
    });

    const beatsPerBass = Math.ceil(RADETZKY_MELODY.length / RADETZKY_BASS.length);
    RADETZKY_BASS.forEach((note, b) => {
      const freq = NOTE_HZ[note];
      if (!freq) return;
      const osc = this.scheduleNote(freq, start + b * beatsPerBass * dur, beatsPerBass * dur * 0.95, 0.06, 'sine');
      if (osc) this.oscs.push(osc);
    });

    this.playing.set(true);
    const totalMs = (RADETZKY_MELODY.length * dur + 0.5) * 1000;
    this.endTimer = window.setTimeout(() => {
      this.oscs = [];
      this.playing.set(false);
      this.endTimer = null;
    }, totalMs);
  }

  stop(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    for (const osc of this.oscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.oscs = [];
    this.playing.set(false);
  }

  toggle(): void {
    if (this.playing()) this.stop();
    else this.playRadetzkymarsch();
  }
}
