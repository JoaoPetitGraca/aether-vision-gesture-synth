/**
 * WebMidiController — Polyphonic Web MIDI Output with macOS IAC Driver Priority
 * Transmits single notes, 3/4-note chord voicings, 14-bit Pitch Bend, and CC#11 Expression
 */
export class WebMidiController {
  constructor() {
    this.midiAccess = null;
    this.outputs = [];
    this.selectedOutput = null;
    this.enabled = false;
    this.channel = 0; // MIDI Channel 1 (0-indexed)
    this.activeMidiNotes = new Set();
    this.lastCc11 = -1;
    this.lastCc74 = -1;
    this.lastBend14 = 8192;
  }

  async init(onPortsChanged) {
    if (!navigator.requestMIDIAccess) {
      return { supported: false, outputs: [] };
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.refreshOutputs();
      this.midiAccess.onstatechange = () => {
        this.refreshOutputs();
        if (onPortsChanged) onPortsChanged(this.outputs, this.selectedOutput);
      };
      return {
        supported: true,
        outputs: this.outputs,
        selectedOutput: this.selectedOutput
      };
    } catch (_err) {
      return { supported: false, outputs: [] };
    }
  }

  refreshOutputs() {
    if (!this.midiAccess) return;
    this.outputs = Array.from(this.midiAccess.outputs.values());

    if (this.outputs.length === 0) {
      this.selectedOutput = null;
      return;
    }

    // Prioritize macOS IAC Driver if present
    const iacPort = this.outputs.find((out) =>
      /iac|bus/i.test(out.name || '')
    );
    if (!this.selectedOutput || !this.outputs.some((o) => o.id === this.selectedOutput.id)) {
      this.selectedOutput = iacPort || this.outputs[0];
    }
  }

  selectOutputById(portId) {
    this.allNotesOff();
    this.selectedOutput = this.outputs.find((o) => o.id === portId) || null;
  }

  setEnabled(flag) {
    const next = Boolean(flag);
    if (!next && this.enabled) {
      this.allNotesOff();
    }
    this.enabled = next;
  }

  updateFromMusicalState(musicalState) {
    if (!this.enabled || !this.selectedOutput) return;

    if (musicalState.isMuted || !musicalState.hasHands || musicalState.volume <= 0.01) {
      this.allNotesOff();
      return;
    }

    const desiredNotes = musicalState.chordNotes || [];
    const desiredMidis = new Set(desiredNotes.map((n) => n.midi));
    const velocity = Math.max(24, Math.min(127, Math.round(musicalState.volume * 127)));

    // Send Note Off for released notes
    for (const activeMidi of this.activeMidiNotes) {
      if (!desiredMidis.has(activeMidi)) {
        this.sendNoteOff(activeMidi);
        this.activeMidiNotes.delete(activeMidi);
      }
    }

    // Send Note On for newly triggered notes
    for (const midi of desiredMidis) {
      if (!this.activeMidiNotes.has(midi)) {
        this.sendNoteOn(midi, velocity);
        this.activeMidiNotes.add(midi);
      }
    }

    // Send CC#11 Expression (Volume)
    const cc11 = Math.max(0, Math.min(127, Math.round(musicalState.volume * 127)));
    if (Math.abs(cc11 - this.lastCc11) >= 2) {
      this.selectedOutput.send([0xb0 | this.channel, 11, cc11]);
      this.lastCc11 = cc11;
    }

    // Send CC#74 Brightness (X-Axis Expression)
    const cc74 = Math.max(0, Math.min(127, Math.round((musicalState.expressionX || 0.5) * 127)));
    if (Math.abs(cc74 - this.lastCc74) >= 2) {
      this.selectedOutput.send([0xb0 | this.channel, 74, cc74]);
      this.lastCc74 = cc74;
    }

    // Send 14-bit Pitch Bend for smooth wrist rotation
    const bendRangeSemitones = 2;
    const normBend = Math.max(-1, Math.min(1, (musicalState.fineBend || 0) / bendRangeSemitones));
    const bend14 = Math.max(0, Math.min(16383, Math.round(8192 + normBend * 8191)));
    if (Math.abs(bend14 - this.lastBend14) >= 32) {
      const lsb = bend14 & 0x7f;
      const msb = (bend14 >> 7) & 0x7f;
      this.selectedOutput.send([0xe0 | this.channel, lsb, msb]);
      this.lastBend14 = bend14;
    }
  }

  sendNoteOn(midi, velocity = 100) {
    if (!this.selectedOutput) return;
    const safeMidi = Math.max(0, Math.min(127, midi));
    this.selectedOutput.send([0x90 | this.channel, safeMidi, velocity]);
  }

  sendNoteOff(midi) {
    if (!this.selectedOutput) return;
    const safeMidi = Math.max(0, Math.min(127, midi));
    this.selectedOutput.send([0x80 | this.channel, safeMidi, 0]);
  }

  allNotesOff() {
    if (!this.selectedOutput) {
      this.activeMidiNotes.clear();
      return;
    }
    for (const midi of this.activeMidiNotes) {
      this.sendNoteOff(midi);
    }
    this.activeMidiNotes.clear();
    // Send CC#123 All Notes Off
    try {
      this.selectedOutput.send([0xb0 | this.channel, 123, 0]);
    } catch (_e) {
      // Ignore disconnected port errors
    }
  }
}
