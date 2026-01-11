import * as Tone from "tone";

// Define the drum kit instruments
export type DrumInstrument = "kick" | "snare" | "hihat_closed" | "hihat_open" | "tom_1" | "tom_2" | "crash" | "ride";

export type DrumKit = "modern_metal" | "vintage_rock" | "808_trap" | "acoustic";

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

export const DRUM_KITS: { id: DrumKit; label: string }[] = [
  { id: "modern_metal", label: "Modern Metal" },
  { id: "vintage_rock", label: "Vintage Rock" },
  { id: "808_trap", label: "808 Trap" },
  { id: "acoustic", label: "Acoustic" },
];

// Kit-specific settings
const KIT_SETTINGS: Record<DrumKit, {
  kickPitch: string;
  kickDecay: number;
  snareDecay: number;
  distortion: number;
  reverb: number;
  hihatFreq: number;
}> = {
  modern_metal: {
    kickPitch: "C1",
    kickDecay: 0.4,
    snareDecay: 0.2,
    distortion: 0.15,
    reverb: 0.15,
    hihatFreq: 200
  },
  vintage_rock: {
    kickPitch: "D1",
    kickDecay: 0.5,
    snareDecay: 0.3,
    distortion: 0.05,
    reverb: 0.3,
    hihatFreq: 180
  },
  "808_trap": {
    kickPitch: "F0",
    kickDecay: 0.8,
    snareDecay: 0.15,
    distortion: 0.02,
    reverb: 0.1,
    hihatFreq: 250
  },
  acoustic: {
    kickPitch: "E1",
    kickDecay: 0.35,
    snareDecay: 0.25,
    distortion: 0,
    reverb: 0.4,
    hihatFreq: 190
  }
};

class AudioEngine {
  private instruments: Record<DrumInstrument, Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>;
  private isInitialized = false;
  private currentKit: DrumKit = "modern_metal";
  private reverb: Tone.Reverb | null = null;
  private distortion: Tone.Distortion | null = null;
  private compressor: Tone.Compressor | null = null;

  constructor() {
    this.instruments = {} as any;
  }

  async init() {
    if (this.isInitialized) return;
    await Tone.start();

    // Reverb for atmosphere
    this.reverb = new Tone.Reverb({ decay: 1.5, preDelay: 0.01 }).toDestination();
    this.reverb.wet.value = 0.2;

    // Compressor for punch
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.005,
      release: 0.1
    }).connect(this.reverb);

    // Dist for metal grit
    this.distortion = new Tone.Distortion(0.1).connect(this.compressor);

    this.createInstruments();
    this.isInitialized = true;
  }

  private createInstruments() {
    const settings = KIT_SETTINGS[this.currentKit];
    
    // Kick: Punchy membrane synth
    this.instruments.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: this.currentKit === "808_trap" ? 8 : 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: settings.kickDecay, sustain: 0.01, release: 1.4 },
      volume: 0
    }).connect(this.distortion!);

    // Snare: Noise + Tone
    this.instruments.snare = new Tone.NoiseSynth({
      noise: { type: this.currentKit === "808_trap" ? "pink" : "white" },
      envelope: { attack: 0.001, decay: settings.snareDecay, sustain: 0 }
    }).connect(this.distortion!);
    this.instruments.snare.volume.value = -5;

    // HiHats: Metal Synth
    const hihatDist = new Tone.Distortion(0.05).connect(this.compressor!);
    this.instruments.hihat_closed = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).connect(hihatDist);
    (this.instruments.hihat_closed as Tone.MetalSynth).frequency.value = settings.hihatFreq;
    this.instruments.hihat_closed.volume.value = -12;

    this.instruments.hihat_open = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.5, release: 0.1 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
    }).connect(hihatDist);
    (this.instruments.hihat_open as Tone.MetalSynth).frequency.value = settings.hihatFreq;
    this.instruments.hihat_open.volume.value = -12;

    // Toms
    this.instruments.tom_1 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(this.distortion!);
    
    this.instruments.tom_2 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(this.distortion!);

    // Cymbals
    this.instruments.crash = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1, release: 3 },
      harmonicity: 5.1, modulationIndex: 64, resonance: 3000, octaves: 1.5
    }).connect(this.reverb!);
    (this.instruments.crash as Tone.MetalSynth).frequency.value = 300;
    this.instruments.crash.volume.value = -8;

    this.instruments.ride = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.5, release: 3 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 3000, octaves: 1.5
    }).connect(this.reverb!);
    (this.instruments.ride as Tone.MetalSynth).frequency.value = 400;
    this.instruments.ride.volume.value = -10;
  }

  setKit(kit: DrumKit) {
    if (kit === this.currentKit) return;
    this.currentKit = kit;
    
    if (this.isInitialized) {
      // Dispose old instruments
      Object.values(this.instruments).forEach(inst => {
        if (inst && 'dispose' in inst) inst.dispose();
      });
      
      // Update effects based on kit
      const settings = KIT_SETTINGS[kit];
      if (this.distortion) this.distortion.distortion = settings.distortion;
      if (this.reverb) this.reverb.wet.value = settings.reverb;
      
      // Recreate instruments
      this.createInstruments();
    }
  }

  getKit(): DrumKit {
    return this.currentKit;
  }

  playDrum(drum: DrumInstrument, velocity: number = 100, time?: number) {
    if (!this.isInitialized) return;
    
    const vel = Math.max(0.1, velocity / 127);
    const t = time || Tone.now();
    const settings = KIT_SETTINGS[this.currentKit];

    switch(drum) {
      case "kick": (this.instruments.kick as Tone.MembraneSynth).triggerAttackRelease(settings.kickPitch, "8n", t, vel); break;
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
    Tone.Transport.cancel();
  }
}

export const audioEngine = new AudioEngine();
