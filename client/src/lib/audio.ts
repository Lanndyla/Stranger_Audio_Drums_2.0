import * as Tone from "tone";

// Define the drum kit instruments
export type DrumInstrument = "kick" | "snare" | "hihat_closed" | "hihat_open" | "tom_1" | "tom_2" | "crash" | "ride";

export const DRUM_ROWS: { id: DrumInstrument; label: string }[] = [
  { id: "crash", label: "CRASH" },
  { id: "ride", label: "RIDE" },
  { id: "hihat_open", label: "HH OPEN" },
  { id: "hihat_closed", label: "HH CLSD" },
  { id: "tom_1", label: "TOM HI" },
  { id: "tom_2", label: "TOM LO" },
  { id: "snare", label: "SNARE" },
  { id: "kick", label: "KICK" },
];

class AudioEngine {
  private instruments: Record<DrumInstrument, Tone.Instrument<any> | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>;
  private isInitialized = false;

  constructor() {
    this.instruments = {} as any;
  }

  async init() {
    if (this.isInitialized) return;
    await Tone.start();

    // Reverb for atmosphere
    const reverb = new Tone.Reverb({ decay: 1.5, preDelay: 0.01 }).toDestination();
    reverb.wet.value = 0.2;

    // Compressor for punch
    const compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.005,
      release: 0.1
    }).connect(reverb);

    // Dist for metal grit
    const distortion = new Tone.Distortion(0.1).connect(compressor);

    // Kick: Punchy membrane synth
    this.instruments.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: 0
    }).connect(distortion);

    // Snare: Noise + Tone
    this.instruments.snare = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
    }).connect(distortion);
    this.instruments.snare.volume.value = -5;

    // HiHats: Metal Synth
    const hihatDist = new Tone.Distortion(0.05).connect(compressor);
    this.instruments.hihat_closed = new Tone.MetalSynth({
      frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).connect(hihatDist);
    this.instruments.hihat_closed.volume.value = -15;

    this.instruments.hihat_open = new Tone.MetalSynth({
      frequency: 200, envelope: { attack: 0.001, decay: 0.5, release: 0.1 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).connect(hihatDist);
    this.instruments.hihat_open.volume.value = -15;

    // Toms
    this.instruments.tom_1 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(distortion);
    
    this.instruments.tom_2 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(distortion);

    // Cymbals
    this.instruments.crash = new Tone.MetalSynth({
      frequency: 300, envelope: { attack: 0.001, decay: 1, release: 3 },
      harmonicity: 5.1, modulationIndex: 64, resonance: 3000, octaves: 1.5
    }).connect(reverb);
    this.instruments.crash.volume.value = -10;

    this.instruments.ride = new Tone.MetalSynth({
      frequency: 400, envelope: { attack: 0.001, decay: 1.5, release: 3 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5
    }).connect(reverb);
    this.instruments.ride.volume.value = -12;

    this.isInitialized = true;
  }

  playDrum(drum: DrumInstrument, velocity: number = 100, time?: number) {
    if (!this.isInitialized) return;
    
    // Convert 0-127 velocity to 0-1 volume scale (approx)
    // Tone.js uses decibels usually, but we can set velocity on trigger
    const vel = Math.max(0.1, velocity / 127);
    
    const t = time || Tone.now();

    switch(drum) {
      case "kick": (this.instruments.kick as Tone.MembraneSynth).triggerAttackRelease("C1", "8n", t, vel); break;
      case "snare": (this.instruments.snare as Tone.NoiseSynth).triggerAttackRelease("8n", t, vel); break;
      case "hihat_closed": (this.instruments.hihat_closed as Tone.MetalSynth).triggerAttackRelease("32n", t, vel); break;
      case "hihat_open": (this.instruments.hihat_open as Tone.MetalSynth).triggerAttackRelease("8n", t, vel); break;
      case "tom_1": (this.instruments.tom_1 as Tone.MembraneSynth).triggerAttackRelease("G2", "8n", t, vel); break;
      case "tom_2": (this.instruments.tom_2 as Tone.MembraneSynth).triggerAttackRelease("C2", "8n", t, vel); break;
      case "crash": (this.instruments.crash as Tone.MetalSynth).triggerAttackRelease("1n", t, vel); break;
      case "ride": (this.instruments.ride as Tone.MetalSynth).triggerAttackRelease("1n", t, vel); break;
    }
  }

  setBpm(bpm: number) {
    Tone.Transport.bpm.value = bpm;
  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear scheduled events
  }
}

export const audioEngine = new AudioEngine();
