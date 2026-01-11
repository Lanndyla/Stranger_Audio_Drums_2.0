import type { DrumInstrument } from "./audio";

type MidiCallback = (drum: DrumInstrument, velocity: number) => void;

const MIDI_NOTE_MAP: Record<number, DrumInstrument> = {
  36: "kick",
  38: "snare",
  40: "snare",
  42: "hihat_closed",
  44: "hihat_closed",
  46: "hihat_open",
  48: "tom_1",
  50: "tom_1",
  45: "tom_2",
  47: "tom_2",
  49: "crash",
  57: "crash",
  51: "ride",
  53: "ride",
};

const DRUM_TO_MIDI: Record<DrumInstrument, number> = {
  kick: 36,
  snare: 38,
  hihat_closed: 42,
  hihat_open: 46,
  tom_1: 48,
  tom_2: 45,
  crash: 49,
  ride: 51,
};

class MidiHandler {
  private midiAccess: MIDIAccess | null = null;
  private selectedInputId: string | null = null;
  private selectedOutputId: string | null = null;
  private onNoteCallback: MidiCallback | null = null;
  private isInitialized = false;

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported in this browser");
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.isInitialized = true;
      console.log("MIDI Handler Initialized");
      return true;
    } catch (err) {
      console.error("Failed to access MIDI devices:", err);
      return false;
    }
  }

  getInputs(): { id: string; name: string }[] {
    if (!this.midiAccess) return [];
    const inputs: { id: string; name: string }[] = [];
    this.midiAccess.inputs.forEach((input) => {
      inputs.push({ id: input.id, name: input.name || "Unknown Device" });
    });
    return inputs;
  }

  getOutputs(): { id: string; name: string }[] {
    if (!this.midiAccess) return [];
    const outputs: { id: string; name: string }[] = [];
    this.midiAccess.outputs.forEach((output) => {
      outputs.push({ id: output.id, name: output.name || "Unknown Device" });
    });
    return outputs;
  }

  setInput(inputId: string | null) {
    if (this.selectedInputId && this.midiAccess) {
      const oldInput = this.midiAccess.inputs.get(this.selectedInputId);
      if (oldInput) {
        oldInput.onmidimessage = null;
      }
    }

    this.selectedInputId = inputId;

    if (inputId && this.midiAccess) {
      const input = this.midiAccess.inputs.get(inputId);
      if (input) {
        input.onmidimessage = this.handleMidiMessage.bind(this);
        console.log("MIDI Input connected:", input.name);
      }
    }
  }

  setOutput(outputId: string | null) {
    this.selectedOutputId = outputId;
    if (outputId && this.midiAccess) {
      const output = this.midiAccess.outputs.get(outputId);
      if (output) {
        console.log("MIDI Output connected:", output.name);
      }
    }
  }

  getSelectedInputId(): string | null {
    return this.selectedInputId;
  }

  getSelectedOutputId(): string | null {
    return this.selectedOutputId;
  }

  onNote(callback: MidiCallback) {
    this.onNoteCallback = callback;
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    const data = event.data ? Array.from(event.data) : [];
    const [status, note, velocity] = data;
    
    if ((status & 0xf0) === 0x90 && velocity > 0) {
      const drum = MIDI_NOTE_MAP[note];
      if (drum && this.onNoteCallback) {
        this.onNoteCallback(drum, velocity);
      }
    }
  }

  sendNote(drum: DrumInstrument, velocity: number = 100, channel: number = 10) {
    if (!this.midiAccess || !this.selectedOutputId) return;
    
    const output = this.midiAccess.outputs.get(this.selectedOutputId);
    if (!output) return;

    const note = DRUM_TO_MIDI[drum];
    const midiChannel = Math.max(0, Math.min(15, channel - 1));
    
    output.send([0x90 | midiChannel, note, velocity]);
    
    setTimeout(() => {
      output.send([0x80 | midiChannel, note, 0]);
    }, 50);
  }

  isSupported(): boolean {
    return !!navigator.requestMIDIAccess;
  }
}

export const midiHandler = new MidiHandler();
