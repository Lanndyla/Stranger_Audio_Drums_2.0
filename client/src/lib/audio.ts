import * as Tone from "tone";

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

const KIT_SETTINGS: Record<DrumKit, {
  kickPitch: string;
  kickDecay: number;
  snareDecay: number;
  distortion: number;
  reverb: number;
}> = {
  modern_metal: {
    kickPitch: "C1",
    kickDecay: 0.4,
    snareDecay: 0.2,
    distortion: 0.15,
    reverb: 0.15
  },
  vintage_rock: {
    kickPitch: "D1",
    kickDecay: 0.5,
    snareDecay: 0.3,
    distortion: 0.05,
    reverb: 0.3
  },
  "808_trap": {
    kickPitch: "F0",
    kickDecay: 0.8,
    snareDecay: 0.15,
    distortion: 0.02,
    reverb: 0.1
  },
  acoustic: {
    kickPitch: "E1",
    kickDecay: 0.35,
    snareDecay: 0.25,
    distortion: 0,
    reverb: 0.4
  }
};

class AudioEngine {
  private kick: Tone.MembraneSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private hihatClosed: Tone.NoiseSynth | null = null;
  private hihatOpen: Tone.NoiseSynth | null = null;
  private tom1: Tone.MembraneSynth | null = null;
  private tom2: Tone.MembraneSynth | null = null;
  private crash: Tone.NoiseSynth | null = null;
  private ride: Tone.NoiseSynth | null = null;
  
  private isInitialized = false;
  private currentKit: DrumKit = "modern_metal";
  private reverb: Tone.Reverb | null = null;
  private distortion: Tone.Distortion | null = null;
  private compressor: Tone.Compressor | null = null;
  
  private hihatFilter: Tone.Filter | null = null;
  private crashFilter: Tone.Filter | null = null;
  private rideFilter: Tone.Filter | null = null;

  async init() {
    if (this.isInitialized) return;
    await Tone.start();

    this.reverb = new Tone.Reverb({ decay: 1.5, preDelay: 0.01 }).toDestination();
    this.reverb.wet.value = 0.2;

    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.005,
      release: 0.1
    }).connect(this.reverb);

    this.distortion = new Tone.Distortion(0.1).connect(this.compressor);

    this.createInstruments();
    this.isInitialized = true;
    console.log("Audio Engine Initialized");
  }

  private createInstruments() {
    const settings = KIT_SETTINGS[this.currentKit];
    
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: this.currentKit === "808_trap" ? 8 : 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: settings.kickDecay, sustain: 0.01, release: 1.4 },
      volume: 0
    }).connect(this.distortion!);

    this.snare = new Tone.NoiseSynth({
      noise: { type: this.currentKit === "808_trap" ? "pink" : "white" },
      envelope: { attack: 0.001, decay: settings.snareDecay, sustain: 0 },
      volume: -5
    }).connect(this.distortion!);

    this.hihatFilter = new Tone.Filter({ frequency: 8000, type: "highpass" }).connect(this.compressor!);
    
    this.hihatClosed = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
      volume: -8
    }).connect(this.hihatFilter);

    this.hihatOpen = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1 },
      volume: -8
    }).connect(this.hihatFilter);

    this.tom1 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -3
    }).connect(this.distortion!);
    
    this.tom2 = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: -3
    }).connect(this.distortion!);

    this.crashFilter = new Tone.Filter({ frequency: 5000, type: "highpass" }).connect(this.reverb!);
    
    this.crash = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 1.0, sustain: 0.2 },
      volume: -6
    }).connect(this.crashFilter);

    this.rideFilter = new Tone.Filter({ frequency: 6000, type: "highpass" }).connect(this.reverb!);
    
    this.ride = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.15 },
      volume: -8
    }).connect(this.rideFilter);
  }

  setKit(kit: DrumKit) {
    if (kit === this.currentKit) return;
    this.currentKit = kit;
    
    if (this.isInitialized) {
      [this.kick, this.snare, this.hihatClosed, this.hihatOpen, this.tom1, this.tom2, this.crash, this.ride].forEach(inst => {
        if (inst) inst.dispose();
      });
      [this.hihatFilter, this.crashFilter, this.rideFilter].forEach(f => {
        if (f) f.dispose();
      });
      
      const settings = KIT_SETTINGS[kit];
      if (this.distortion) this.distortion.distortion = settings.distortion;
      if (this.reverb) this.reverb.wet.value = settings.reverb;
      
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
      case "kick": 
        this.kick?.triggerAttackRelease(settings.kickPitch, "8n", t, vel); 
        break;
      case "snare": 
        this.snare?.triggerAttackRelease("8n", t, vel); 
        break;
      case "hihat_closed": 
        this.hihatClosed?.triggerAttackRelease("32n", t, vel); 
        break;
      case "hihat_open": 
        this.hihatOpen?.triggerAttackRelease("8n", t, vel); 
        break;
      case "tom_1": 
        this.tom1?.triggerAttackRelease("G2", "8n", t, vel); 
        break;
      case "tom_2": 
        this.tom2?.triggerAttackRelease("C2", "8n", t, vel); 
        break;
      case "crash": 
        this.crash?.triggerAttackRelease("2n", t, vel); 
        break;
      case "ride": 
        this.ride?.triggerAttackRelease("4n", t, vel); 
        break;
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
