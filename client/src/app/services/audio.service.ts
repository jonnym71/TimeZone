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

const NOTE_DUR = 0.4;

const MELODY = [
  'D4', 'F#4', 'A4', 'D5', 'C#4', 'E4', 'A4', 'C#5',
  'B3', 'D4', 'F#4', 'B4', 'F#3', 'A3', 'C#4', 'F#4',
  'G3', 'B3', 'D4', 'G4', 'D4', 'F#4', 'A4', 'D5',
  'G3', 'B3', 'D4', 'G4', 'A3', 'C#4', 'E4', 'A4',
];

const BASS = ['D3', 'A3', 'B3', 'F#3', 'G3', 'D3', 'G3', 'A3'];

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly playing = signal(false);
  readonly radetzkyPlaying = signal(false);

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;
  private scheduleTimer: number | null = null;

  private radetzkyOscs: OscillatorNode[] = [];
  private radetzkyEndTimer: number | null = null;

  private playNote(freq: number, startTime: number, duration: number, volume: number): void {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const env = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(volume, startTime + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.95);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  private scheduleNotes = (): void => {
    if (!this.playing() || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (this.nextNoteTime < now) this.nextNoteTime = now + 0.05;

    while (this.nextNoteTime < now + 1.5 && this.playing()) {
      const note = MELODY[this.noteIndex];
      const freq = NOTE_HZ[note];
      if (freq) {
        this.playNote(freq, this.nextNoteTime, NOTE_DUR, 0.06);
        if (this.noteIndex % 4 === 0) {
          const bassNote = BASS[Math.floor(this.noteIndex / 4) % BASS.length];
          const bassFreq = NOTE_HZ[bassNote];
          if (bassFreq) this.playNote(bassFreq, this.nextNoteTime, NOTE_DUR * 4 * 0.95, 0.04);
        }
      }
      this.nextNoteTime += NOTE_DUR;
      this.noteIndex = (this.noteIndex + 1) % MELODY.length;
    }
    this.scheduleTimer = window.setTimeout(this.scheduleNotes, 250);
  };

  start(): void {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.35;
      const lp = this.audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      lp.Q.value = 0.7;
      this.masterGain.connect(lp);
      lp.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();
    this.playing.set(true);
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.noteIndex = 0;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.35, this.audioCtx.currentTime + 1.5);
    }
    this.scheduleNotes();
  }

  stop(): void {
    this.playing.set(false);
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.4);
    }
  }

  toggle(): void {
    if (this.playing()) this.stop();
    else this.start();
  }

  private ensureContext(): void {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctx();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.35;
      const lp = this.audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      lp.Q.value = 0.7;
      this.masterGain.connect(lp);
      lp.connect(this.audioCtx.destination);
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
    if (this.playing()) this.stop();
    this.stopRadetzkymarsch();
    this.ensureContext();
    if (!this.audioCtx) return;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.masterGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
    }

    const start = this.audioCtx.currentTime + 0.08;
    const dur = RADETZKY_NOTE_DUR;

    RADETZKY_MELODY.forEach((note, i) => {
      const freq = NOTE_HZ[note];
      if (!freq) return;
      const osc = this.scheduleNote(freq, start + i * dur, dur * 0.92, 0.09, 'triangle');
      if (osc) this.radetzkyOscs.push(osc);
    });

    const beatsPerBass = Math.ceil(RADETZKY_MELODY.length / RADETZKY_BASS.length);
    RADETZKY_BASS.forEach((note, b) => {
      const freq = NOTE_HZ[note];
      if (!freq) return;
      const osc = this.scheduleNote(freq, start + b * beatsPerBass * dur, beatsPerBass * dur * 0.95, 0.06, 'sine');
      if (osc) this.radetzkyOscs.push(osc);
    });

    this.radetzkyPlaying.set(true);
    const totalMs = (RADETZKY_MELODY.length * dur + 0.5) * 1000;
    this.radetzkyEndTimer = window.setTimeout(() => {
      this.radetzkyOscs = [];
      this.radetzkyPlaying.set(false);
      this.radetzkyEndTimer = null;
    }, totalMs);
  }

  stopRadetzkymarsch(): void {
    if (this.radetzkyEndTimer !== null) {
      clearTimeout(this.radetzkyEndTimer);
      this.radetzkyEndTimer = null;
    }
    for (const osc of this.radetzkyOscs) {
      try { osc.stop(); } catch {
        // ignore — already stopped
      }
    }
    this.radetzkyOscs = [];
    this.radetzkyPlaying.set(false);
  }
}
