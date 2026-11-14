import * as Tone from 'tone';

export const VOICE_PRESETS = {
  'Serum Lush Super-Saw': {
    name: 'Serum Lush Super-Saw',
    category: 'Serum Rich Textures & Synths',
    oscAWave: 'fatsawtooth',
    oscBWave: 'fatsawtooth',
    unisonVoices: 6,
    unisonSpread: 38,
    oscMix: 0.45,
    oscBDetune: 14,
    subLevel: 0.42,
    subWave: 'sine',
    cutoff: 4800,
    resonance: 1.8,
    attack: 0.018,
    release: 0.35,
    grit: 0.12,
    lfoRate: 3.2,
    lfoDepth: 0.08
  },
  'Serum Liquid Pluck / Pad': {
    name: 'Serum Liquid Pluck / Pad',
    category: 'Serum Rich Textures & Synths',
    oscAWave: 'fatsawtooth',
    oscBWave: 'fatsquare',
    unisonVoices: 5,
    unisonSpread: 28,
    oscMix: 0.5,
    oscBDetune: -9,
    subLevel: 0.35,
    subWave: 'triangle',
    cutoff: 2600,
    resonance: 4.2,
    attack: 0.01,
    release: 0.55,
    grit: 0.08,
    lfoRate: 4.5,
    lfoDepth: 0.16
  },
  'Cyberpunk Reese Bass / Lead': {
    name: 'Cyberpunk Reese Bass / Lead',
    category: 'Serum Rich Textures & Synths',
    oscAWave: 'fatsawtooth',
    oscBWave: 'pulse',
    unisonVoices: 7,
    unisonSpread: 52,
    oscMix: 0.52,
    oscBDetune: 22,
    subLevel: 0.72,
    subWave: 'sine',
    cutoff: 1950,
    resonance: 3.1,
    attack: 0.012,
    release: 0.25,
    grit: 0.48,
    lfoRate: 2.1,
    lfoDepth: 0.14
  },
  'CS-80 Blade Brass': {
    name: 'CS-80 Blade Brass',
    category: 'Serum Rich Textures & Synths',
    oscAWave: 'fatsawtooth',
    oscBWave: 'sawtooth',
    unisonVoices: 4,
    unisonSpread: 22,
    oscMix: 0.38,
    oscBDetune: 8,
    subLevel: 0.28,
    subWave: 'sine',
    cutoff: 3400,
    resonance: 2.2,
    attack: 0.065,
    release: 0.48,
    grit: 0.18,
    lfoRate: 5.4,
    lfoDepth: 0.12
  },
  'Ethereal Vocal Choir Pad': {
    name: 'Ethereal Vocal Choir Pad',
    category: 'Serum Rich Textures & Synths',
    oscAWave: 'fatsawtooth',
    oscBWave: 'triangle',
    unisonVoices: 8,
    unisonSpread: 44,
    oscMix: 0.58,
    oscBDetune: -12,
    subLevel: 0.25,
    subWave: 'sine',
    cutoff: 2200,
    resonance: 3.6,
    attack: 0.12,
    release: 0.85,
    grit: 0.04,
    lfoRate: 3.8,
    lfoDepth: 0.18
  },
  'Gentle Whistle': {
    name: 'Gentle Whistle',
    category: 'Classic & Organic Poly-Adapted Voices',
    oscAWave: 'sine',
    oscBWave: 'triangle',
    unisonVoices: 2,
    unisonSpread: 8,
    oscMix: 0.2,
    oscBDetune: 3,
    subLevel: 0.1,
    subWave: 'sine',
    cutoff: 3200,
    resonance: 1.2,
    attack: 0.045,
    release: 0.3,
    grit: 0.0,
    lfoRate: 5.2,
    lfoDepth: 0.1
  },
  'Windy Flute': {
    name: 'Windy Flute',
    category: 'Classic & Organic Poly-Adapted Voices',
    oscAWave: 'triangle',
    oscBWave: 'sine',
    unisonVoices: 3,
    unisonSpread: 14,
    oscMix: 0.35,
    oscBDetune: 6,
    subLevel: 0.15,
    subWave: 'sine',
    cutoff: 2800,
    resonance: 1.6,
    attack: 0.055,
    release: 0.35,
    grit: 0.03,
    lfoRate: 4.8,
    lfoDepth: 0.14
  },
  'Ambient Celeste': {
    name: 'Ambient Celeste',
    category: 'Classic & Organic Poly-Adapted Voices',
    oscAWave: 'sine',
    oscBWave: 'fatsquare',
    unisonVoices: 4,
    unisonSpread: 18,
    oscMix: 0.25,
    oscBDetune: 12,
    subLevel: 0.2,
    subWave: 'sine',
    cutoff: 5200,
    resonance: 2.0,
    attack: 0.008,
    release: 0.75,
    grit: 0.02,
    lfoRate: 3.0,
    lfoDepth: 0.06
  },
  'Moog Etherwave Poly': {
    name: 'Moog Etherwave Poly',
    category: 'Classic & Organic Poly-Adapted Voices',
    oscAWave: 'sawtooth',
    oscBWave: 'triangle',
    unisonVoices: 3,
    unisonSpread: 16,
    oscMix: 0.42,
    oscBDetune: 7,
    subLevel: 0.45,
    subWave: 'sine',
    cutoff: 2900,
    resonance: 2.8,
    attack: 0.02,
    release: 0.32,
    grit: 0.22,
    lfoRate: 5.8,
    lfoDepth: 0.12
  },
  '1929 RCA Original': {
    name: '1929 RCA Original',
    category: 'Classic & Organic Poly-Adapted Voices',
    oscAWave: 'sine',
    oscBWave: 'sawtooth',
    unisonVoices: 1,
    unisonSpread: 0,
    oscMix: 0.28,
    oscBDetune: 2,
    subLevel: 0.3,
    subWave: 'sine',
    cutoff: 2100,
    resonance: 2.4,
    attack: 0.03,
    release: 0.28,
    grit: 0.15,
    lfoRate: 6.0,
    lfoDepth: 0.15
  }
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class PolySerumSynth {
  constructor() {
    this.isInitialized = false;
    this.isKilled = false;     // Emergency Kill Sound (Esc / M)
    this.droneHold = false;    // Chord / Drone Hold Sustain

    // Current synth state (matches Default Safe Instrument State: Serum Lush Super-Saw)
    this.currentPresetName = 'Serum Lush Super-Saw';
    this.params = {
      ...VOICE_PRESETS['Serum Lush Super-Saw'],
      expressionTarget: 'cutoff' // 'cutoff' | 'unison' | 'vibrato' | 'delay' | 'reverb' | 'none'
    };

    // 5-Pedal Boss-Style Stompbox State (Default: All 5 Bypassed per PRD)
    this.pedals = {
      oc3: {
        enabled: false,
        sub1: 0.65,
        sub2: 0.35,
        direct: 0.85
      },
      ps6: {
        enabled: false,
        shiftSemitones: 7, // +7 semitones (Perfect 5th)
        detune: 15,
        mix: 0.45
      },
      fz2: {
        enabled: false,
        drive: 0.65,
        tone: 3200,
        level: 0.8
      },
      dd7: {
        enabled: false,
        time: 0.32,
        feedback: 0.42,
        mix: 0.38
      },
      rv6: {
        enabled: false,
        decay: 3.2,
        shimmer: 4800,
        mix: 0.42
      }
    };

    // Active polyphonic MIDI note tracking
    this.activeMidis = new Set();
    this.activeRootMidi = null;

    // Studio Recorder state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  async init() {
    if (this.isInitialized) {
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }
      return true;
    }

    await Tone.start();
    const ctx = Tone.getContext();
    ctx.lookAhead = 0.01; // Zero-latency local processing (lookAhead = 0.01s per PRD)

    // 1. Dual 6-Voice Polyphonic Oscillators (Osc A + Osc B) + Dedicated -1 Oct Sub Osc
    this.polyOscA = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: {
        type: this.params.oscAWave,
        count: this.params.unisonVoices,
        spread: this.params.unisonSpread
      },
      envelope: {
        attack: this.params.attack,
        decay: 0.2,
        sustain: 0.85,
        release: this.params.release
      }
    });

    this.polyOscB = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      oscillator: {
        type: this.params.oscBWave,
        count: this.params.unisonVoices,
        spread: this.params.unisonSpread
      },
      envelope: {
        attack: this.params.attack,
        decay: 0.2,
        sustain: 0.85,
        release: this.params.release
      }
    });

    this.subOsc = new Tone.Synth({
      oscillator: { type: this.params.subWave },
      envelope: {
        attack: this.params.attack,
        decay: 0.2,
        sustain: 0.9,
        release: this.params.release
      }
    });

    this.oscAGain = new Tone.Gain(1 - this.params.oscMix);
    this.oscBGain = new Tone.Gain(this.params.oscMix);
    this.subGain = new Tone.Gain(this.params.subLevel * 0.55);

    this.polyOscA.connect(this.oscAGain);
    this.polyOscB.connect(this.oscBGain);
    this.subOsc.connect(this.subGain);

    // 2. Voice Summing Bus -> Tube Grit Waveshaper -> Expressive Lowpass Filter -> Tremolo/Vibrato -> VCA Gate
    this.voiceBus = new Tone.Gain(0.55);
    this.oscAGain.connect(this.voiceBus);
    this.oscBGain.connect(this.voiceBus);
    this.subGain.connect(this.voiceBus);

    this.tubeGrit = new Tone.Distortion({
      distortion: this.params.grit,
      oversample: '2x',
      wet: this.params.grit > 0.01 ? 0.65 : 0
    });

    this.mainFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: this.params.cutoff,
      Q: this.params.resonance,
      rolloff: -24
    });

    this.vibratoFx = new Tone.Vibrato({
      frequency: this.params.lfoRate,
      depth: this.params.lfoDepth,
      wet: 1
    });

    // Dedicated Stereo Tremolo stage driven by Left-Hand (Note Hand) X-Axis Shake
    this.tremoloFx = new Tone.Tremolo({
      frequency: 6.0,
      depth: 0,
      spread: 45,
      wet: 1
    }).start();

    // 5ms VCA Gate for expressive hand volume and instant fist/pinch mute
    this.vcaGate = new Tone.Gain(0);

    this.voiceBus.chain(
      this.tubeGrit,
      this.mainFilter,
      this.vibratoFx,
      this.tremoloFx,
      this.vcaGate
    );

    // 3. 5-Pedal Boss-Style Stompbox Series Chain:
    // PolySerumSynth -> OC-3 Super Octave -> PS-6 Harmonist -> FZ-2 Fuzz Drive -> DD-7 Digital Delay -> RV-6 Digital Reverb -> Master Limiter (-1 dB)

    // Pedal 1: OC-3 Super Octave (PitchShift -12 & -24 mixed with Direct)
    this.oc3Pitch1 = new Tone.PitchShift({
      pitch: -12,
      windowSize: 0.05,
      wet: 0
    });
    this.oc3Pitch2 = new Tone.PitchShift({
      pitch: -24,
      windowSize: 0.06,
      wet: 0
    });

    // Pedal 2: PS-6 Harmonist
    this.ps6Pitch = new Tone.PitchShift({
      pitch: this.pedals.ps6.shiftSemitones,
      windowSize: 0.05,
      wet: 0
    });
    this.ps6Chorus = new Tone.Chorus({
      frequency: 1.8,
      delayTime: 3.5,
      depth: 0.4,
      wet: 0
    }).start();

    // Pedal 3: FZ-2 Hyper Fuzz Drive
    this.fz2Dist = new Tone.Distortion({
      distortion: this.pedals.fz2.drive,
      oversample: '2x',
      wet: 0
    });
    this.fz2Filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 12000,
      Q: 1.0
    });

    // Pedal 4: DD-7 Digital Delay
    this.dd7Delay = new Tone.FeedbackDelay({
      delayTime: this.pedals.dd7.time,
      feedback: this.pedals.dd7.feedback,
      wet: 0
    });

    // Pedal 5: RV-6 Digital Reverb (Schroeder / Freeverb FDN Tank + Tone Filter)
    this.rv6Tone = new Tone.Filter({
      type: 'lowpass',
      frequency: this.pedals.rv6.shimmer
    });
    this.rv6Reverb = new Tone.Freeverb({
      roomSize: clamp(this.pedals.rv6.decay / 6, 0.15, 0.96),
      dampening: this.pedals.rv6.shimmer,
      wet: 0
    });

    // Master Limiter (-1 dB) + Waveform Analyzer + MediaStream Recorder Destination
    this.masterLimiter = new Tone.Limiter(-1);
    this.waveformAnalyzer = new Tone.Waveform(256);

    const rawCtx = Tone.getContext().rawContext;
    this.recordDest = rawCtx.createMediaStreamDestination();

    this.vcaGate.chain(
      this.oc3Pitch1,
      this.oc3Pitch2,
      this.ps6Pitch,
      this.ps6Chorus,
      this.fz2Dist,
      this.fz2Filter,
      this.dd7Delay,
      this.rv6Tone,
      this.rv6Reverb,
      this.masterLimiter,
      this.waveformAnalyzer,
      Tone.getDestination()
    );

    this.masterLimiter.connect(this.recordDest);

    this.applySynthParams();
    this.applyAllPedals();
    this.isInitialized = true;
    return true;
  }

  /**
   * Apply current Dual-Oscillator, Unison, Filter, Envelope & LFO parameters to Tone nodes
   */
  applySynthParams() {
    if (!this.isInitialized) return;

    const p = this.params;
    const count = clamp(Math.round(p.unisonVoices), 1, 8);
    const spread = clamp(p.unisonSpread, 0, 60);

    // Resolve oscillator types with unison support
    const resolveOscType = (wave, uCount) => {
      if (uCount <= 1) {
        if (wave === 'fatsawtooth') return 'sawtooth';
        if (wave === 'fatsquare') return 'square';
        return wave;
      }
      if (wave === 'sawtooth' || wave === 'fatsawtooth') return 'fatsawtooth';
      if (wave === 'square' || wave === 'fatsquare') return 'fatsquare';
      if (wave === 'triangle') return 'fattriangle';
      if (wave === 'sine') return 'fatsine';
      return wave;
    };

    const typeA = resolveOscType(p.oscAWave, count);
    const typeB = resolveOscType(p.oscBWave, count);

    try {
      this.polyOscA.set({
        oscillator: {
          type: typeA,
          ...(typeA.startsWith('fat') ? { count, spread } : {})
        },
        envelope: {
          attack: clamp(p.attack, 0.005, 2.0),
          release: clamp(p.release, 0.02, 4.0)
        }
      });

      this.polyOscB.set({
        oscillator: {
          type: typeB,
          ...(typeB.startsWith('fat') ? { count, spread } : {})
        },
        detune: p.oscBDetune,
        envelope: {
          attack: clamp(p.attack, 0.005, 2.0),
          release: clamp(p.release, 0.02, 4.0)
        }
      });

      this.subOsc.set({
        oscillator: { type: p.subWave || 'sine' },
        envelope: {
          attack: clamp(p.attack, 0.005, 2.0),
          release: clamp(p.release, 0.02, 4.0)
        }
      });
    } catch (_err) {
      // Safe guard during oscillator hot-swap
    }

    const mix = clamp(p.oscMix, 0, 1);
    this.oscAGain.gain.rampTo(1 - mix * 0.75, 0.03);
    this.oscBGain.gain.rampTo(mix, 0.03);
    this.subGain.gain.rampTo(clamp(p.subLevel, 0, 1) * 0.55, 0.03);

    this.tubeGrit.distortion = clamp(p.grit, 0, 1);
    this.tubeGrit.wet.rampTo(p.grit > 0.01 ? clamp(p.grit * 0.85, 0.05, 0.9) : 0, 0.03);

    this.mainFilter.frequency.rampTo(clamp(p.cutoff, 200, 12000), 0.03);
    this.mainFilter.Q.rampTo(clamp(p.resonance, 0.5, 12), 0.03);

    this.vibratoFx.frequency.rampTo(clamp(p.lfoRate, 0.5, 15), 0.04);
    this.vibratoFx.depth.rampTo(clamp(p.lfoDepth, 0, 1) * 0.45, 0.04);
  }

  /**
   * Apply all 5 Stompbox Pedals
   */
  applyAllPedals() {
    if (!this.isInitialized) return;

    // 1. OC-3 Super Octave
    const oc3 = this.pedals.oc3;
    this.oc3Pitch1.wet.rampTo(oc3.enabled ? clamp(oc3.sub1 * 0.65, 0, 0.85) : 0, 0.03);
    this.oc3Pitch2.wet.rampTo(oc3.enabled ? clamp(oc3.sub2 * 0.5, 0, 0.7) : 0, 0.03);

    // 2. PS-6 Harmonist
    const ps6 = this.pedals.ps6;
    this.ps6Pitch.pitch = ps6.shiftSemitones;
    this.ps6Pitch.wet.rampTo(ps6.enabled ? clamp(ps6.mix, 0, 0.9) : 0, 0.03);
    this.ps6Chorus.wet.rampTo(
      ps6.enabled ? clamp((ps6.detune / 40) * 0.65, 0, 0.75) : 0,
      0.03
    );

    // 3. FZ-2 Hyper Fuzz
    const fz2 = this.pedals.fz2;
    this.fz2Dist.distortion = clamp(fz2.drive, 0.05, 1);
    this.fz2Dist.wet.rampTo(fz2.enabled ? clamp(fz2.level, 0.1, 0.95) : 0, 0.03);
    this.fz2Filter.frequency.rampTo(fz2.enabled ? clamp(fz2.tone, 600, 9000) : 12000, 0.03);

    // 4. DD-7 Digital Delay
    const dd7 = this.pedals.dd7;
    this.dd7Delay.delayTime.rampTo(clamp(dd7.time, 0.05, 0.8), 0.04);
    this.dd7Delay.feedback.rampTo(clamp(dd7.feedback, 0, 0.88), 0.04);
    this.dd7Delay.wet.rampTo(dd7.enabled ? clamp(dd7.mix, 0, 0.9) : 0, 0.03);

    // 5. RV-6 Digital Reverb
    const rv6 = this.pedals.rv6;
    this.rv6Reverb.roomSize.rampTo(clamp(rv6.decay / 6, 0.15, 0.96), 0.05);
    this.rv6Tone.frequency.rampTo(
      rv6.enabled ? clamp(rv6.shimmer, 1200, 10000) : 12000,
      0.04
    );
    this.rv6Reverb.wet.rampTo(rv6.enabled ? clamp(rv6.mix, 0, 0.95) : 0, 0.03);
  }

  /**
   * Load one of the 10 built-in PolySerumSynth voice presets
   */
  loadVoicePreset(presetName) {
    const preset = VOICE_PRESETS[presetName];
    if (!preset) return false;
    this.currentPresetName = presetName;
    Object.assign(this.params, preset);
    this.applySynthParams();
    return true;
  }

  /**
   * Update real-time synthesis from GestureStageEngine musical state
   */
  updateFromMusicalState(musicalState) {
    if (!this.isInitialized) return;

    if (this.isKilled) {
      this.releaseAllImmediate();
      return;
    }

    // Handle Drone / Chord Hold Sustain when hands leave frame
    if (!musicalState.hasHands && this.droneHold && this.activeMidis.size > 0) {
      this.vcaGate.gain.rampTo(0.65, 0.04);
      return;
    }

    if (musicalState.isMuted || !musicalState.hasHands || musicalState.volume <= 0.005) {
      // Instant 5ms VCA gate mute per PRD Section 3.2 & 3.4
      this.vcaGate.gain.rampTo(0, 0.005);
      if (this.activeMidis.size > 0) {
        this.releaseAllVoices();
      }
      return;
    }

    // Desired MIDI notes (1 note in Single-Note Mode, 3 or 4 notes in Chords Mode)
    const desiredNotes = musicalState.chordNotes || [];
    const desiredMidiSet = new Set(desiredNotes.map((n) => n.midi));

    // Release any notes no longer in the chord/melody
    for (const oldMidi of this.activeMidis) {
      if (!desiredMidiSet.has(oldMidi)) {
        const freq = midiToFreq(oldMidi);
        this.polyOscA.triggerRelease(freq);
        this.polyOscB.triggerRelease(freq);
        this.activeMidis.delete(oldMidi);
      }
    }

    // Trigger newly added notes
    for (const noteObj of desiredNotes) {
      if (!this.activeMidis.has(noteObj.midi)) {
        const freq = midiToFreq(noteObj.midi);
        this.polyOscA.triggerAttack(freq);
        this.polyOscB.triggerAttack(freq);
        this.activeMidis.add(noteObj.midi);
      }
    }

    // Sub-Oscillator tracks -1 Octave below the root note
    const rootMidi = musicalState.rootNote?.midi ?? null;
    if (rootMidi !== null) {
      const subFreq = midiToFreq(rootMidi - 12);
      if (this.activeRootMidi === null) {
        this.subOsc.triggerAttack(subFreq);
      } else if (this.activeRootMidi !== rootMidi) {
        this.subOsc.frequency.rampTo(subFreq, 0.015);
      }
      this.activeRootMidi = rootMidi;
    }

    // Continuous wrist-roll pitch bend + Left-Hand X-Shake live phase-locked micro-vibrato (cents)
    const shake = clamp(musicalState.shakeIntensity || 0, 0, 1);
    const shakeWave = clamp(musicalState.shakeWave || 0, -1, 1);
    const shakeBendCents = shakeWave * 42; // ±42 cents expressive string/vocal vibrato
    const bendCents = (musicalState.fineBend || 0) * 100 + shakeBendCents;

    this.polyOscA.set({ detune: bendCents });
    this.polyOscB.set({ detune: this.params.oscBDetune + bendCents });
    this.subOsc.detune.rampTo(bendCents, 0.015);

    // Left-Hand X-Shake Vibrato LFO + Stereo Tremolo Swell
    const baseVibDepth = clamp(this.params.lfoDepth, 0, 1) * 0.45;
    const baseVibRate = clamp(this.params.lfoRate, 0.5, 15);
    const shakeVibDepth = clamp(baseVibDepth + shake * 0.48, 0, 0.88);
    const shakeVibRate = clamp(baseVibRate + shake * 3.6, 0.5, 14);

    if (this.params.expressionTarget !== 'vibrato' || musicalState.playMode !== 'single') {
      this.vibratoFx.depth.rampTo(shakeVibDepth, 0.025);
      this.vibratoFx.frequency.rampTo(shakeVibRate, 0.025);
    }

    // Stereo Amplitude Tremolo driven by Note-Hand X-Shake
    this.tremoloFx.depth.rampTo(clamp(shake * 0.72, 0, 0.78), 0.025);
    this.tremoloFx.frequency.rampTo(5.4 + shake * 3.4, 0.025);

    // VCA Volume Gate
    const targetGain = clamp(musicalState.volume, 0, 1) * 0.85;
    this.vcaGate.gain.rampTo(targetGain, 0.016);

    // Assignable X-Axis Expression Modulation in Single-Note Mode
    if (musicalState.playMode === 'single') {
      this.applyExpressionModulation(musicalState.expressionX, shake);
    } else if (shake > 0.02) {
      // Emotional filter shimmer in Chords Mode when shaking Note Hand
      const chordModFreq = clamp(this.params.cutoff * (1 + shake * 0.45), 200, 12000);
      this.mainFilter.frequency.rampTo(chordModFreq, 0.025);
    }
  }

  applyExpressionModulation(exprX, shake = 0) {
    const x = clamp(exprX, 0, 1);
    const target = this.params.expressionTarget;

    if (target === 'cutoff') {
      const modFreq = clamp(
        this.params.cutoff * (0.25 + x * 1.65 + shake * 0.35),
        200,
        12000
      );
      this.mainFilter.frequency.rampTo(modFreq, 0.025);
    } else if (target === 'unison') {
      const modDetune = this.params.oscBDetune + (x - 0.5) * 45;
      this.polyOscB.set({ detune: modDetune });
    } else if (target === 'vibrato') {
      this.vibratoFx.depth.rampTo(clamp(x * 0.5 + shake * 0.45, 0, 0.88), 0.03);
      this.vibratoFx.frequency.rampTo(2 + x * 8 + shake * 3, 0.03);
    } else if (target === 'delay' && this.pedals.dd7.enabled) {
      this.dd7Delay.feedback.rampTo(clamp(0.15 + x * 0.7, 0.1, 0.86), 0.03);
    } else if (target === 'reverb' && this.pedals.rv6.enabled) {
      this.rv6Reverb.wet.rampTo(clamp(0.15 + x * 0.75, 0.1, 0.9), 0.03);
    }
  }

  releaseAllVoices() {
    if (!this.isInitialized) return;
    this.polyOscA.releaseAll();
    this.polyOscB.releaseAll();
    this.subOsc.triggerRelease();
    this.activeMidis.clear();
    this.activeRootMidi = null;
  }

  releaseAllImmediate() {
    if (!this.isInitialized) return;
    this.vcaGate.gain.rampTo(0, 0.005);
    this.releaseAllVoices();
  }

  toggleKillSound(forceState) {
    this.isKilled = typeof forceState === 'boolean' ? forceState : !this.isKilled;
    if (this.isKilled) {
      this.releaseAllImmediate();
    }
    return this.isKilled;
  }

  getWaveformArray() {
    if (!this.isInitialized || !this.waveformAnalyzer) {
      return new Float32Array(256);
    }
    return this.waveformAnalyzer.getValue();
  }

  /**
   * 1-Click Post-Limiter Studio Audio Recorder
   */
  toggleRecording(onFinishedCallback) {
    if (!this.isInitialized || !this.recordDest) return false;

    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      return false;
    }

    this.recordedChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.recordDest.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `aether-vision-session-${stamp}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (onFinishedCallback) onFinishedCallback();
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    return true;
  }
}
