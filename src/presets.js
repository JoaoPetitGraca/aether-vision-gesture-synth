const STORAGE_KEY = 'aether_vision_gesture_workstation_patches_v1';

const STARTER_PATCHES = [
  {
    id: 'factory-lush-supersaw',
    name: '01 • Serum Lush Init (Safe Default)',
    createdAt: '2026-11-13T20:00:00.000Z',
    state: {
      voicePreset: 'Serum Lush Super-Saw',
      playMode: 'single',
      swapHands: false,
      scaleRoot: 'A',
      scaleName: 'Natural Minor',
      octaveCount: 3,
      octaveTranspose: 0,
      wristRollMode: 'step',
      synthParams: {
        oscAWave: 'fatsawtooth',
        oscBWave: 'fatsawtooth',
        unisonVoices: 6,
        unisonSpread: 38,
        oscMix: 0.45,
        oscBDetune: 14,
        subLevel: 0.42,
        cutoff: 4800,
        resonance: 1.8,
        attack: 0.018,
        release: 0.35,
        grit: 0.12,
        lfoRate: 3.2,
        lfoDepth: 0.08,
        expressionTarget: 'cutoff'
      },
      pedals: {
        oc3: { enabled: false, sub1: 0.65, sub2: 0.35, direct: 0.85 },
        ps6: { enabled: false, shiftSemitones: 7, detune: 15, mix: 0.45 },
        fz2: { enabled: false, drive: 0.65, tone: 3200, level: 0.8 },
        dd7: { enabled: false, time: 0.32, feedback: 0.42, mix: 0.38 },
        rv6: { enabled: false, decay: 3.2, shimmer: 4800, mix: 0.42 }
      }
    }
  },
  {
    id: 'factory-Blade-chords',
    name: '02 • Vangelis 6-Quadrant Chord Matrix',
    createdAt: '2026-11-13T20:01:00.000Z',
    state: {
      voicePreset: 'CS-80 Blade Brass',
      playMode: 'chords',
      swapHands: false,
      scaleRoot: 'C',
      scaleName: 'Major',
      octaveCount: 3,
      octaveTranspose: 0,
      wristRollMode: 'step',
      synthParams: {
        oscAWave: 'fatsawtooth',
        oscBWave: 'sawtooth',
        unisonVoices: 6,
        unisonSpread: 28,
        oscMix: 0.42,
        oscBDetune: 10,
        subLevel: 0.35,
        cutoff: 3800,
        resonance: 2.2,
        attack: 0.06,
        release: 0.65,
        grit: 0.16,
        lfoRate: 4.6,
        lfoDepth: 0.12,
        expressionTarget: 'cutoff'
      },
      pedals: {
        oc3: { enabled: false, sub1: 0.65, sub2: 0.35, direct: 0.85 },
        ps6: { enabled: false, shiftSemitones: 7, detune: 15, mix: 0.45 },
        fz2: { enabled: false, drive: 0.5, tone: 3200, level: 0.7 },
        dd7: { enabled: true, time: 0.36, feedback: 0.45, mix: 0.32 },
        rv6: { enabled: true, decay: 4.5, shimmer: 5400, mix: 0.52 }
      }
    }
  },
  {
    id: 'factory-cyberpunk-reese',
    name: '03 • Cyberpunk Reese Lead + Fuzz/Octave',
    createdAt: '2026-11-13T20:02:00.000Z',
    state: {
      voicePreset: 'Cyberpunk Reese Bass / Lead',
      playMode: 'single',
      swapHands: false,
      scaleRoot: 'E',
      scaleName: 'Minor Pentatonic',
      octaveCount: 3,
      octaveTranspose: -1,
      wristRollMode: 'smooth',
      synthParams: {
        oscAWave: 'fatsawtooth',
        oscBWave: 'pulse',
        unisonVoices: 7,
        unisonSpread: 52,
        oscMix: 0.52,
        oscBDetune: 22,
        subLevel: 0.72,
        cutoff: 2400,
        resonance: 3.4,
        attack: 0.012,
        release: 0.28,
        grit: 0.48,
        lfoRate: 2.4,
        lfoDepth: 0.14,
        expressionTarget: 'cutoff'
      },
      pedals: {
        oc3: { enabled: true, sub1: 0.7, sub2: 0.3, direct: 0.9 },
        ps6: { enabled: false, shiftSemitones: 7, detune: 15, mix: 0.45 },
        fz2: { enabled: true, drive: 0.68, tone: 3400, level: 0.75 },
        dd7: { enabled: true, time: 0.28, feedback: 0.35, mix: 0.28 },
        rv6: { enabled: false, decay: 3.0, shimmer: 4500, mix: 0.35 }
      }
    }
  }
];

export class UserPatchBank {
  constructor() {
    this.patches = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(STARTER_PATCHES));
        return [...STARTER_PATCHES];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...STARTER_PATCHES];
    } catch (_err) {
      return [...STARTER_PATCHES];
    }
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.patches));
    } catch (err) {
      console.warn('Could not save patches to localStorage:', err);
    }
  }

  getAll() {
    return this.patches;
  }

  getById(id) {
    return this.patches.find((p) => p.id === id) || null;
  }

  savePatch(name, stateSnapshot) {
    const cleanName = (name || '').trim() || `User Patch ${this.patches.length + 1}`;
    const patch = {
      id: `patch-${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      state: structuredClone(stateSnapshot)
    };
    this.patches.unshift(patch);
    this.persist();
    return patch;
  }

  deletePatch(id) {
    const idx = this.patches.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.patches.splice(idx, 1);
    if (this.patches.length === 0) {
      this.patches = [...STARTER_PATCHES];
    }
    this.persist();
    return true;
  }

  exportToJsonFile() {
    const payload = JSON.stringify(this.patches, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `aether-vision-patches-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async importFromJsonFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = Array.isArray(parsed) ? parsed : [parsed];
    const valid = incoming.filter((item) => item && item.name && item.state);
    if (valid.length === 0) {
      throw new Error('No valid Aether-Vision patch objects found in JSON file.');
    }
    this.patches = [...valid, ...this.patches];
    this.persist();
    return valid.length;
  }
}
