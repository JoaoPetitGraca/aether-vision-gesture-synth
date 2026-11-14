import { HandTrackingEngine, GESTURE_DEFINITIONS } from './tracking.js';
import {
  GestureStageEngine,
  CHROMATIC_NOTES,
  NOTE_COLORS
} from './grid.js';
import { PolySerumSynth, VOICE_PRESETS } from './synth.js';
import { WebMidiController } from './midi.js';
import { UserPatchBank } from './presets.js';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

class AetherVisionWorkstationApp {
  constructor() {
    this.tracking = new HandTrackingEngine();
    this.stage = new GestureStageEngine();
    this.synth = new PolySerumSynth();
    this.midi = new WebMidiController();
    this.patchBank = new UserPatchBank();

    this.videoEl = document.getElementById('webcam-video');
    this.stageCanvas = document.getElementById('stage-canvas');
    this.stageCtx = this.stageCanvas.getContext('2d');
    this.scopeCanvas = document.getElementById('scope-canvas');
    this.scopeCtx = this.scopeCanvas.getContext('2d');

    this.cameraRunning = false;
    this.mouseSimEnabled = true; // Enabled by default so users can play immediately or start camera
    this.zenMode = false;

    // Frame rate telemetry
    this.frameCount = 0;
    this.lastFpsCheck = performance.now();
    this.currentFps = 60;

    this.initUI();
    this.startRenderLoop();
  }

  initUI() {
    this.buildGestureLegendBar();
    this.bindTransportBar();
    this.bindStageInteractions();
    this.bindKeyboardShortcuts();
    this.bindRackModules();
    this.bindRotaryKnobs();
    this.bindPedalboard();
    this.bindPatchBank();
    this.syncAllControlsFromState();
  }

  /**
   * Build the 8-slot Gesture Legend Bar above the webcam stage
   */
  buildGestureLegendBar() {
    const bar = document.getElementById('gesture-legend-bar');
    bar.innerHTML = '';

    for (const def of GESTURE_DEFINITIONS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'legend-card';
      card.dataset.degree = String(def.degree);
      card.id = `legend-card-${def.degree}`;
      card.title = `${def.name}: ${def.description} (Press ${def.degree === 0 ? '0 or Space' : def.degree})`;

      const fingerBarsHtml = def.digits
        .map((isUp) => `<span class="finger-bar ${isUp ? 'up' : 'down'}"></span>`)
        .join('');

      card.innerHTML = `
        <div class="legend-left">
          <div class="finger-bars" aria-hidden="true">${fingerBarsHtml}</div>
          <span class="legend-title">[${def.shortLabel}]</span>
        </div>
        <span class="legend-note-pill" id="legend-pill-${def.degree}">
          ${def.degree === 0 ? 'MUTE' : 'A4'}
        </span>
      `;

      card.addEventListener('click', async () => {
        await this.ensureAudioStarted();
        this.tracking.mouseState.active = true;
        this.tracking.mouseState.gestureDegree = def.degree;
        this.updateMouseSimButtonUI();
      });

      bar.appendChild(card);
    }
  }

  async ensureAudioStarted() {
    if (!this.synth.isInitialized) {
      await this.synth.init();
    }
  }

  /**
   * Toggle Webcam & MediaPipe Optical Tracking
   */
  async toggleCameraAndSynth() {
    await this.ensureAudioStarted();

    const btnLabel = document.getElementById('btn-power-label');
    const camLed = document.getElementById('cam-led');
    const statusText = document.getElementById('telemetry-status');

    if (this.cameraRunning) {
      // Stop webcam stream
      const stream = this.videoEl.srcObject;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      this.videoEl.srcObject = null;
      this.cameraRunning = false;
      camLed.classList.remove('active');
      btnLabel.textContent = '⚡ START CAMERA & SYNTH';
      statusText.textContent = 'CAMERA STOPPED • STUDIO MOUSE SIM READY';
      return;
    }

    try {
      btnLabel.textContent = '⏳ LOADING MEDIAPIPE...';
      statusText.textContent = 'INITIALIZING MEDIAPIPE HANDLANDMARKER & WEBCAM...';

      const mpReady = await this.tracking.init();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 }
        },
        audio: false
      });

      this.videoEl.srcObject = stream;
      await this.videoEl.play();

      this.cameraRunning = true;
      this.mouseSimEnabled = false;
      this.tracking.mouseState.active = false;
      this.updateMouseSimButtonUI();

      camLed.classList.add('active');
      btnLabel.textContent = '📷 CAMERA ACTIVE (STOP)';
      statusText.textContent = mpReady
        ? 'OPTICAL TRACKING LIVE • RAISE HANDS IN LEFT/RIGHT ZONES'
        : 'WEBCAM LIVE • USE STUDIO MOUSE SIM IF OFFLINE';
    } catch (err) {
      console.warn('Webcam unavailable, staying in Studio Mouse Simulation Mode:', err);
      this.cameraRunning = false;
      this.mouseSimEnabled = true;
      this.tracking.mouseState.active = true;
      this.updateMouseSimButtonUI();
      btnLabel.textContent = '⚡ START CAMERA & SYNTH';
      statusText.textContent = 'WEBCAM UNAVAILABLE • STUDIO MOUSE & KEYBOARD SIM ACTIVE';
    }
  }

  bindTransportBar() {
    document.getElementById('btn-power-cam').addEventListener('click', () => {
      this.toggleCameraAndSynth();
    });

    document.getElementById('btn-mouse-mode').addEventListener('click', async () => {
      await this.ensureAudioStarted();
      this.mouseSimEnabled = !this.mouseSimEnabled;
      this.tracking.mouseState.active = this.mouseSimEnabled;
      if (!this.mouseSimEnabled) {
        this.synth.releaseAllImmediate();
      }
      this.updateMouseSimButtonUI();
    });

    document.getElementById('btn-play-mode').addEventListener('click', () => {
      this.togglePlayMode();
    });

    document.getElementById('btn-hand-swap').addEventListener('click', () => {
      this.toggleHandSwap();
    });

    document.getElementById('btn-note-hud').addEventListener('click', () => {
      this.toggleNoteHud();
    });

    document.getElementById('btn-zen-mode').addEventListener('click', () => {
      this.toggleZenMode();
    });

    const recBtn = document.getElementById('btn-record');
    const recLabel = document.getElementById('rec-label');
    recBtn.addEventListener('click', async () => {
      await this.ensureAudioStarted();
      const recording = this.synth.toggleRecording(() => {
        recBtn.classList.remove('recording');
        recLabel.textContent = '● REC';
      });
      if (recording) {
        recBtn.classList.add('recording');
        recLabel.textContent = '■ STOP & SAVE';
      }
    });

    document.getElementById('btn-kill-sound').addEventListener('click', () => {
      this.toggleKillSound();
    });
  }

  updateMouseSimButtonUI() {
    const btn = document.getElementById('btn-mouse-mode');
    const led = document.getElementById('mouse-led');
    const span = btn.querySelector('span:last-child');
    if (this.mouseSimEnabled) {
      btn.classList.add('hw-btn-active');
      led.classList.add('active');
      span.textContent = '🖱️ STUDIO MOUSE SIM: ON';
    } else {
      btn.classList.remove('hw-btn-active');
      led.classList.remove('active');
      span.textContent = '🖱️ STUDIO MOUSE SIM: OFF';
    }
  }

  togglePlayMode(forceMode) {
    const next =
      typeof forceMode === 'string'
        ? forceMode
        : this.stage.playMode === 'single'
          ? 'chords'
          : 'single';
    this.stage.playMode = next;

    const btn = document.getElementById('btn-play-mode');
    const led = document.getElementById('chords-led');
    const label = document.getElementById('play-mode-label');

    if (next === 'chords') {
      btn.classList.add('hw-btn-active');
      led.classList.add('active');
      label.textContent = 'MODE: CHORDS (6-QUAD) [C]';
    } else {
      btn.classList.remove('hw-btn-active');
      led.classList.remove('active');
      label.textContent = 'MODE: SINGLE NOTE [C]';
    }
  }

  toggleHandSwap(forceSwap) {
    const next =
      typeof forceSwap === 'boolean' ? forceSwap : !this.stage.swapHands;
    this.stage.swapHands = next;
    this.tracking.setSwapHands(next);

    const btn = document.getElementById('btn-hand-swap');
    const led = document.getElementById('swap-led');
    const label = document.getElementById('hand-swap-label');

    if (next) {
      btn.classList.add('hw-btn-active');
      led.classList.add('active');
      label.textContent = 'HAND SWAP: LEFTY [H]';
    } else {
      btn.classList.remove('hw-btn-active');
      led.classList.remove('active');
      label.textContent = 'HAND SWAP: STANDARD [H]';
    }
  }

  toggleNoteHud(forceShow) {
    const next =
      typeof forceShow === 'boolean' ? forceShow : !this.stage.showNoteHud;
    this.stage.showNoteHud = next;

    const hudEl = document.getElementById('huge-note-hud');
    const btn = document.getElementById('btn-note-hud');
    const led = document.getElementById('hud-led');
    const label = document.getElementById('note-hud-label');

    hudEl.classList.toggle('hidden', !next);
    btn.classList.toggle('hw-btn-active', next);
    led.classList.toggle('active', next);
    label.textContent = next ? 'NOTE HUD: ON [N]' : 'NOTE HUD: OFF [N]';
  }

  toggleZenMode() {
    this.zenMode = !this.zenMode;
    document.body.classList.toggle('zen-mode', this.zenMode);
    const btn = document.getElementById('btn-zen-mode');
    btn.classList.toggle('hw-btn-active', this.zenMode);
  }

  toggleKillSound(forceState) {
    const killed = this.synth.toggleKillSound(forceState);
    if (killed) {
      this.midi.allNotesOff();
    }
    const btn = document.getElementById('btn-kill-sound');
    const label = document.getElementById('kill-sound-label');
    btn.classList.toggle('killed', killed);
    label.textContent = killed ? '🔇 SOUND KILLED [ESC]' : '🔇 KILL SOUND [ESC]';
  }

  /**
   * Bind Stage Canvas pointer & wheel interactions for Mouse/Keyboard Studio Mode
   */
  bindStageInteractions() {
    const updatePointerCoords = (e) => {
      const rect = this.stageCanvas.getBoundingClientRect();
      const nx = clamp((e.clientX - rect.left) / rect.width, 0.02, 0.98);
      const ny = clamp((e.clientY - rect.top) / rect.height, 0.04, 0.96);

      const isNoteSide = this.stage.swapHands ? nx >= 0.5 : nx < 0.5;
      if (isNoteSide) {
        this.tracking.mouseState.noteX = nx;
        this.tracking.mouseState.noteY = ny;
      } else {
        this.tracking.mouseState.exprX = nx;
        this.tracking.mouseState.exprY = ny;
      }
    };

    this.stageCanvas.addEventListener('pointerdown', async (e) => {
      await this.ensureAudioStarted();
      if (!this.cameraRunning) {
        this.mouseSimEnabled = true;
        this.tracking.mouseState.active = true;
        this.updateMouseSimButtonUI();
      }
      updatePointerCoords(e);
    });

    this.stageCanvas.addEventListener('pointermove', (e) => {
      if (!this.mouseSimEnabled) return;
      this.tracking.mouseState.active = true;
      updatePointerCoords(e);
    });

    this.stageCanvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.mouseSimEnabled) return;
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.014;
        this.tracking.mouseState.pinchGap = clamp(
          this.tracking.mouseState.pinchGap + delta,
          0.025,
          0.18
        );
      },
      { passive: false }
    );
  }

  /**
   * Bind All Keyboard Shortcuts per PRD Section 4
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', async (e) => {
      // Do not intercept typing inside text inputs
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      const key = e.key;

      // Esc or M: Emergency Kill Sound / Master Mute toggle
      if (key === 'Escape' || key === 'm' || key === 'M') {
        e.preventDefault();
        this.toggleKillSound();
        return;
      }

      // C: Toggle Single-Note vs 6-Quadrant Chords Mode
      if (key === 'c' || key === 'C') {
        e.preventDefault();
        this.togglePlayMode();
        return;
      }

      // H: Toggle Hand Swap (Standard vs Left-Handed Musician)
      if (key === 'h' || key === 'H') {
        e.preventDefault();
        this.toggleHandSwap();
        return;
      }

      // N: Toggle Huge Note/Chord HUD
      if (key === 'n' || key === 'N') {
        e.preventDefault();
        this.toggleNoteHud();
        return;
      }

      // Z: Toggle Zen Fullscreen View
      if (key === 'z' || key === 'Z') {
        e.preventDefault();
        this.toggleZenMode();
        return;
      }

      // - / + (or [ / ]): Transpose Octave Stack (-4 to +2)
      if (key === '-' || key === '_' || key === '[') {
        e.preventDefault();
        this.adjustOctaveTranspose(-1);
        return;
      }
      if (key === '=' || key === '+' || key === ']') {
        e.preventDefault();
        this.adjustOctaveTranspose(1);
        return;
      }

      // 1 - 7 Keys (Mouse Mode): Trigger Note Gestures 1..7; 0 or Space = Fist Mute
      if (/^[1-7]$/.test(key)) {
        e.preventDefault();
        await this.ensureAudioStarted();
        this.mouseSimEnabled = true;
        this.tracking.mouseState.active = true;
        this.tracking.mouseState.gestureDegree = parseInt(key, 10);
        this.updateMouseSimButtonUI();
        return;
      }
      if (key === '0' || key === ' ') {
        e.preventDefault();
        this.tracking.mouseState.gestureDegree = 0; // Fist Mute
        return;
      }

      // Q / E Keys (Mouse Mode): Simulate -30° Flat (b) / +30° Sharp (#) wrist rotation
      if (key === 'q' || key === 'Q') {
        e.preventDefault();
        this.tracking.mouseState.wristAngleDeg =
          this.tracking.mouseState.wristAngleDeg <= -25 ? 0 : -32;
        return;
      }
      if (key === 'e' || key === 'E') {
        e.preventDefault();
        this.tracking.mouseState.wristAngleDeg =
          this.tracking.mouseState.wristAngleDeg >= 25 ? 0 : 32;
        return;
      }
    });
  }

  adjustOctaveTranspose(delta) {
    this.stage.octaveTranspose = clamp(this.stage.octaveTranspose + delta, -4, 2);
    this.updateOctaveTransposeReadout();
  }

  updateOctaveTransposeReadout() {
    const t = this.stage.octaveTranspose;
    const sign = t > 0 ? `+${t}` : `${t}`;
    const lowOct = clamp(this.stage.baseOctave + t, 1, 7);
    const highOct = clamp(lowOct + this.stage.octaveCount - 1, 1, 7);
    const readout = document.getElementById('octave-transpose-readout');
    readout.textContent = `${sign} OCT (C${lowOct}–B${highOct})`;
  }

  /**
   * Bind Module 01, Module 02, and Module 03 Controls
   */
  bindRackModules() {
    // Module 01
    document.getElementById('select-scale-root').addEventListener('change', (e) => {
      this.stage.scaleRoot = e.target.value;
    });

    document.getElementById('select-scale-name').addEventListener('change', (e) => {
      this.stage.scaleName = e.target.value;
    });

    document.getElementById('select-octave-count').addEventListener('change', (e) => {
      this.stage.octaveCount = clamp(parseInt(e.target.value, 10) || 3, 1, 5);
      this.stage.activeOctaveTierIndex = Math.min(
        this.stage.activeOctaveTierIndex,
        this.stage.octaveCount - 1
      );
      this.updateOctaveTransposeReadout();
    });

    document.getElementById('btn-oct-down').addEventListener('click', () => {
      this.adjustOctaveTranspose(-1);
    });
    document.getElementById('btn-oct-up').addEventListener('click', () => {
      this.adjustOctaveTranspose(1);
    });

    document.getElementById('select-wrist-mode').addEventListener('change', (e) => {
      this.stage.wristRollMode = e.target.value;
    });

    const exprLabels = {
      cutoff: 'Filter Cutoff (Wah)',
      unison: 'Serum Unison Spread',
      vibrato: 'Vibrato Depth & Rate',
      delay: 'Delay Feedback Swell',
      reverb: 'Reverb Shimmer Space',
      none: 'None (Volume Only)'
    };

    document.getElementById('select-expr-target').addEventListener('change', (e) => {
      const val = e.target.value;
      this.synth.params.expressionTarget = val;
      this.stage.exprTargetLabel = exprLabels[val] || 'Filter Cutoff';
    });

    // Module 02
    document.getElementById('select-voice-preset').addEventListener('change', (e) => {
      this.synth.loadVoicePreset(e.target.value);
      this.syncAllControlsFromState();
    });

    document.getElementById('select-osca-wave').addEventListener('change', (e) => {
      this.synth.params.oscAWave = e.target.value;
      this.synth.applySynthParams();
    });

    document.getElementById('select-oscb-wave').addEventListener('change', (e) => {
      this.synth.params.oscBWave = e.target.value;
      this.synth.applySynthParams();
    });

    // Module 03: Drone Hold & Web MIDI
    const droneBtn = document.getElementById('btn-drone-hold');
    const droneLed = document.getElementById('drone-led');
    const droneLabel = document.getElementById('drone-label');

    droneBtn.addEventListener('click', () => {
      this.synth.droneHold = !this.synth.droneHold;
      droneBtn.classList.toggle('active', this.synth.droneHold);
      droneLed.classList.toggle('active', this.synth.droneHold);
      droneLabel.textContent = this.synth.droneHold
        ? 'DRONE SUSTAIN: ON'
        : 'DRONE SUSTAIN: OFF';
    });

    const midiBtn = document.getElementById('btn-midi-toggle');
    const midiLed = document.getElementById('midi-led');
    const midiLabel = document.getElementById('midi-label');
    const midiSelect = document.getElementById('select-midi-port');

    const populateMidiPorts = (outputs, selected) => {
      midiSelect.innerHTML = '';
      if (!outputs || outputs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No MIDI Outputs Found (Enable macOS IAC Driver)';
        midiSelect.appendChild(opt);
        return;
      }
      for (const port of outputs) {
        const opt = document.createElement('option');
        opt.value = port.id;
        opt.textContent = `${port.name} (${port.manufacturer || 'System'})`;
        if (selected && selected.id === port.id) opt.selected = true;
        midiSelect.appendChild(opt);
      }
    };

    midiBtn.addEventListener('click', async () => {
      if (!this.midi.enabled) {
        const res = await this.midi.init(populateMidiPorts);
        populateMidiPorts(res.outputs, res.selectedOutput);
        this.midi.setEnabled(true);
      } else {
        this.midi.setEnabled(false);
      }
      midiBtn.classList.toggle('active', this.midi.enabled);
      midiLed.classList.toggle('active', this.midi.enabled);
      midiLabel.textContent = this.midi.enabled ? 'MIDI OUT: ON' : 'MIDI OUT: OFF';
    });

    midiSelect.addEventListener('change', (e) => {
      this.midi.selectOutputById(e.target.value);
    });
  }

  /**
   * Bind Interactive Rotary Knobs (Vertical Pointer Drag + Mouse Wheel + Keyboard Arrows)
   */
  bindRotaryKnobs() {
    const knobCells = document.querySelectorAll('.knob-cell');

    knobCells.forEach((cell) => {
      const dial = cell.querySelector('.rotary-dial');
      const param = cell.dataset.param;
      const pedalKey = cell.dataset.pedal || null;
      const min = parseFloat(cell.dataset.min);
      const max = parseFloat(cell.dataset.max);
      const step = parseFloat(cell.dataset.step);

      const getCurrentValue = () => {
        if (pedalKey) {
          return this.synth.pedals[pedalKey][param];
        }
        return this.synth.params[param];
      };

      const setNewValue = (rawVal) => {
        const stepped = Math.round(rawVal / step) * step;
        const clamped = clamp(Number(stepped.toFixed(4)), min, max);
        if (pedalKey) {
          this.synth.pedals[pedalKey][param] = clamped;
          this.synth.applyAllPedals();
        } else {
          this.synth.params[param] = clamped;
          this.synth.applySynthParams();
        }
        this.updateKnobVisual(cell, clamped, min, max);
      };

      let startY = 0;
      let startVal = 0;

      dial.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dial.setPointerCapture(e.pointerId);
        startY = e.clientY;
        startVal = getCurrentValue();

        const onMove = (moveEv) => {
          const dy = startY - moveEv.clientY;
          const normDelta = dy / 130;
          setNewValue(startVal + normDelta * (max - min));
        };

        const onUp = (upEv) => {
          dial.releasePointerCapture(upEv.pointerId);
          dial.removeEventListener('pointermove', onMove);
          dial.removeEventListener('pointerup', onUp);
        };

        dial.addEventListener('pointermove', onMove);
        dial.addEventListener('pointerup', onUp);
      });

      dial.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const dir = -Math.sign(e.deltaY);
          setNewValue(getCurrentValue() + dir * step * 2);
        },
        { passive: false }
      );

      dial.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          setNewValue(getCurrentValue() + step);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setNewValue(getCurrentValue() - step);
        }
      });
    });
  }

  updateKnobVisual(cell, val, min, max) {
    const dial = cell.querySelector('.rotary-dial');
    const indicator = cell.querySelector('.dial-indicator');
    const output = cell.querySelector('.knob-value');
    const unit = cell.dataset.unit || '';
    const param = cell.dataset.param;

    const norm = clamp((val - min) / (max - min || 1), 0, 1);
    const angleDeg = -135 + norm * 270;
    indicator.style.setProperty('--dial-angle', `${angleDeg.toFixed(1)}deg`);
    dial.setAttribute('aria-valuenow', String(val));

    if (output) {
      if (unit === '%') {
        output.textContent = `${Math.round(val * 100)}%`;
      } else if (param === 'attack' || param === 'release') {
        output.textContent = `${Math.round(val * 1000)}ms`;
      } else if (param === 'oscBDetune') {
        const r = Math.round(val);
        output.textContent = `${r > 0 ? '+' : ''}${r}¢`;
      } else if (param === 'resonance') {
        output.textContent = `${Number(val).toFixed(1)}Q`;
      } else {
        output.textContent = `${Math.round(val)}${unit}`;
      }
    }
  }

  /**
   * Bind 5-Pedal Boss-Style Stompbox Footswitches
   */
  bindPedalboard() {
    const switches = document.querySelectorAll('[data-toggle-pedal]');
    switches.forEach((btn) => {
      const pedalKey = btn.dataset.togglePedal;
      btn.addEventListener('click', () => {
        const pedalState = this.synth.pedals[pedalKey];
        pedalState.enabled = !pedalState.enabled;
        this.synth.applyAllPedals();
        this.syncPedalUI(pedalKey);
      });
    });
  }

  syncPedalUI(pedalKey) {
    const box = document.querySelector(`.stompbox[data-pedal="${pedalKey}"]`);
    if (!box) return;
    const enabled = this.synth.pedals[pedalKey].enabled;
    box.classList.toggle('engaged', enabled);
    const btn = box.querySelector('.pedal-footswitch');
    const pad = box.querySelector('.footswitch-pad');
    if (btn) btn.setAttribute('aria-pressed', String(enabled));
    if (pad) pad.textContent = enabled ? 'ACTIVE • ON' : 'BYPASSED';
  }

  /**
   * Bind User Patch Bank (Save, Recall, Delete, Export JSON, Import JSON)
   */
  bindPatchBank() {
    const selectEl = document.getElementById('patch-select');
    const nameInput = document.getElementById('patch-name-input');

    const refreshPatchDropdown = (selectedId) => {
      const patches = this.patchBank.getAll();
      selectEl.innerHTML = '';
      for (const p of patches) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (selectedId && p.id === selectedId) opt.selected = true;
        selectEl.appendChild(opt);
      }
    };

    refreshPatchDropdown();

    selectEl.addEventListener('change', (e) => {
      const patch = this.patchBank.getById(e.target.value);
      if (patch) {
        this.applyPatchSnapshot(patch.state);
      }
    });

    document.getElementById('btn-save-patch').addEventListener('click', () => {
      const snapshot = this.captureCurrentSnapshot();
      const saved = this.patchBank.savePatch(nameInput.value, snapshot);
      nameInput.value = '';
      refreshPatchDropdown(saved.id);
    });

    document.getElementById('btn-delete-patch').addEventListener('click', () => {
      const id = selectEl.value;
      if (id) {
        this.patchBank.deletePatch(id);
        refreshPatchDropdown();
      }
    });

    document.getElementById('btn-export-patches').addEventListener('click', () => {
      this.patchBank.exportToJsonFile();
    });

    document.getElementById('input-import-patches').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await this.patchBank.importFromJsonFile(file);
        refreshPatchDropdown();
      } catch (err) {
        console.error('Patch import failed:', err);
      }
      e.target.value = '';
    });
  }

  captureCurrentSnapshot() {
    return {
      voicePreset: this.synth.currentPresetName,
      playMode: this.stage.playMode,
      swapHands: this.stage.swapHands,
      scaleRoot: this.stage.scaleRoot,
      scaleName: this.stage.scaleName,
      octaveCount: this.stage.octaveCount,
      octaveTranspose: this.stage.octaveTranspose,
      wristRollMode: this.stage.wristRollMode,
      synthParams: { ...this.synth.params },
      pedals: structuredClone(this.synth.pedals)
    };
  }

  applyPatchSnapshot(state) {
    if (!state) return;
    if (state.voicePreset && VOICE_PRESETS[state.voicePreset]) {
      this.synth.currentPresetName = state.voicePreset;
    }
    if (state.synthParams) {
      Object.assign(this.synth.params, state.synthParams);
    }
    if (state.pedals) {
      for (const k of Object.keys(this.synth.pedals)) {
        if (state.pedals[k]) {
          Object.assign(this.synth.pedals[k], state.pedals[k]);
        }
      }
    }
    if (state.scaleRoot) this.stage.scaleRoot = state.scaleRoot;
    if (state.scaleName) this.stage.scaleName = state.scaleName;
    if (typeof state.octaveCount === 'number') this.stage.octaveCount = state.octaveCount;
    if (typeof state.octaveTranspose === 'number') {
      this.stage.octaveTranspose = state.octaveTranspose;
    }
    if (state.wristRollMode) this.stage.wristRollMode = state.wristRollMode;
    if (state.playMode) this.togglePlayMode(state.playMode);
    if (typeof state.swapHands === 'boolean') this.toggleHandSwap(state.swapHands);

    this.synth.applySynthParams();
    this.synth.applyAllPedals();
    this.syncAllControlsFromState();
  }

  syncAllControlsFromState() {
    document.getElementById('select-scale-root').value = this.stage.scaleRoot;
    document.getElementById('select-scale-name').value = this.stage.scaleName;
    document.getElementById('select-octave-count').value = String(this.stage.octaveCount);
    document.getElementById('select-wrist-mode').value = this.stage.wristRollMode;
    document.getElementById('select-expr-target').value =
      this.synth.params.expressionTarget || 'cutoff';

    document.getElementById('select-voice-preset').value = this.synth.currentPresetName;
    document.getElementById('select-osca-wave').value = this.synth.params.oscAWave;
    document.getElementById('select-oscb-wave').value = this.synth.params.oscBWave;

    this.updateOctaveTransposeReadout();

    // Update all rotary dials
    document.querySelectorAll('.knob-cell').forEach((cell) => {
      const param = cell.dataset.param;
      const pedalKey = cell.dataset.pedal || null;
      const min = parseFloat(cell.dataset.min);
      const max = parseFloat(cell.dataset.max);
      const val = pedalKey
        ? this.synth.pedals[pedalKey][param]
        : this.synth.params[param];
      if (typeof val === 'number') {
        this.updateKnobVisual(cell, val, min, max);
      }
    });

    // Update all 5 pedals
    for (const k of ['oc3', 'ps6', 'fz2', 'dd7', 'rv6']) {
      this.syncPedalUI(k);
    }
  }

  /**
   * Update the 8-Slot Gesture Legend Bar cards & Huge Center Note/Chord HUD
   */
  updateDomHud(musicalState) {
    const activeDeg = musicalState.isMuted ? 0 : musicalState.gesture?.degree ?? 0;
    const legendNotes = musicalState.legendNotes || {};

    // 1. Update 8-Slot Gesture Legend Bar
    for (const def of GESTURE_DEFINITIONS) {
      const card = document.getElementById(`legend-card-${def.degree}`);
      const pill = document.getElementById(`legend-pill-${def.degree}`);
      if (!card || !pill) continue;

      if (def.degree === 0) {
        const isMuteActive = musicalState.hasHands && musicalState.isMuted;
        card.style.setProperty('--card-color', '#ff4757');
        card.classList.toggle('active', isMuteActive);
        pill.textContent = 'SILENT';
      } else {
        const noteObj = legendNotes[def.degree];
        const color = noteObj?.color || '#00d2d3';
        card.style.setProperty('--card-color', color);
        card.classList.toggle('active', musicalState.hasHands && activeDeg === def.degree);
        pill.textContent = noteObj ? noteObj.fullName : `DEG ${def.degree}`;
      }
    }

    // 2. Update Huge Center Note & Chord HUD
    const hudEl = document.getElementById('huge-note-hud');
    const symbolEl = document.getElementById('hud-main-symbol');
    const gestureBadge = document.getElementById('hud-gesture-badge');
    const octaveBadge = document.getElementById('hud-octave-badge');
    const freqReadout = document.getElementById('hud-freq-readout');
    const chordPillsEl = document.getElementById('hud-chord-pills');
    const wristThumb = document.getElementById('hud-wrist-thumb');
    const flatTag = document.getElementById('hud-flat-tag');
    const sharpTag = document.getElementById('hud-sharp-tag');
    const engineLed = document.getElementById('engine-led');

    const rootColor = musicalState.rootNote?.color || '#6c5ce7';
    hudEl.style.setProperty('--active-note-color', musicalState.isMuted ? '#ff4757' : rootColor);

    if (!musicalState.hasHands) {
      engineLed.className = 'status-led';
      symbolEl.textContent = 'SILENT';
      gestureBadge.textContent = 'NO HANDS';
      octaveBadge.textContent = `OCTAVE ${musicalState.tierIndex + 1}`;
      freqReadout.textContent = '0.00 Hz';
      chordPillsEl.classList.add('hidden');
    } else if (musicalState.isMuted) {
      engineLed.className = 'status-led muted';
      symbolEl.textContent = 'MUTE';
      gestureBadge.textContent = musicalState.gesture?.shortLabel?.toUpperCase() || 'FIST MUTE';
      octaveBadge.textContent = `OCTAVE ${musicalState.tierIndex + 1}`;
      freqReadout.textContent = '0.00 Hz';
      chordPillsEl.classList.add('hidden');
    } else {
      engineLed.className = 'status-led online';
      symbolEl.textContent = musicalState.chordSymbol || musicalState.rootNote?.fullName || 'A4';
      gestureBadge.textContent = (musicalState.gesture?.shortLabel || '1: PINKY').toUpperCase();
      octaveBadge.textContent = `OCTAVE ${musicalState.tierIndex + 1} (C${musicalState.octaveNumber})`;
      freqReadout.textContent = `${(musicalState.rootNote?.freqHz || 440).toFixed(2)} Hz`;

      if (musicalState.playMode === 'chords' && musicalState.chordNotes.length > 1) {
        chordPillsEl.classList.remove('hidden');
        chordPillsEl.innerHTML = musicalState.chordNotes
          .map(
            (n) =>
              `<span class="chord-voicing-pill" style="background:${n.color}">${n.fullName}</span>`
          )
          .join('');
      } else {
        chordPillsEl.classList.add('hidden');
      }
    }

    // Wrist-Roll Protractor Bar (-45° .. +45° mapped to 5% .. 95%)
    const normWrist = clamp((musicalState.wristAngleDeg + 45) / 90, 0.05, 0.95);
    wristThumb.style.left = `${(normWrist * 100).toFixed(1)}%`;
    flatTag.classList.toggle('active-flat', musicalState.semitoneShift === -1);
    sharpTag.classList.toggle('active-sharp', musicalState.semitoneShift === 1);
  }

  /**
   * Draw Live Audio Waveform Oscilloscope in the Top Bar
   */
  renderOscilloscope(activeColor) {
    const ctx = this.scopeCtx;
    const w = this.scopeCanvas.width;
    const h = this.scopeCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = this.synth.getWaveformArray();
    ctx.beginPath();
    ctx.strokeStyle = activeColor || '#00d2d3';
    ctx.lineWidth = 1.6;

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h * 0.5 + data[i] * (h * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /**
   * Sync canvas pixel buffer with its rendered CSS dimensions & devicePixelRatio
   * so video, circles, and HUD text never squash or stretch.
   */
  syncStageCanvasResolution() {
    const cssW = Math.max(320, Math.round(this.stageCanvas.clientWidth || 1280));
    const cssH = Math.max(200, Math.round(this.stageCanvas.clientHeight || 540));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);

    if (this.stageCanvas.width !== targetW || this.stageCanvas.height !== targetH) {
      this.stageCanvas.width = targetW;
      this.stageCanvas.height = targetH;
    }

    this.stageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cssW, cssH };
  }

  /**
   * Main 60fps Optical + Audio + Canvas HUD Loop
   */
  startRenderLoop() {
    const step = (now) => {
      this.frameCount++;
      if (now - this.lastFpsCheck >= 500) {
        this.currentFps = Math.min(
          60,
          Math.round((this.frameCount * 1000) / (now - this.lastFpsCheck))
        );
        document.getElementById('fps-readout').textContent = `${this.currentFps} FPS`;
        this.frameCount = 0;
        this.lastFpsCheck = now;
      }

      const { cssW, cssH } = this.syncStageCanvasResolution();

      // 1. Obtain Tracking Frame (Webcam MediaPipe or Studio Mouse Simulation)
      let trackingFrame;
      if (this.cameraRunning && this.tracking.isReady) {
        trackingFrame = this.tracking.detectVideoFrame(this.videoEl, now, cssW, cssH);
      } else if (this.mouseSimEnabled) {
        trackingFrame = this.tracking.getMouseSimulationFrame();
      } else {
        trackingFrame = this.tracking.createEmptyFrameResult();
      }

      // 2. Evaluate Musical Pitch, Octave Tier, Chord Voicing & Expression
      const musicalState = this.stage.evaluateMusicalFrame(trackingFrame);

      // 3. Drive PolySerumSynth DSP & Web MIDI Output
      this.synth.updateFromMusicalState(musicalState);
      this.midi.updateFromMusicalState(musicalState);

      // 4. Render Split-Screen AR HUD Stage, Legend Bar, Huge Note HUD & Oscilloscope
      this.stage.renderStage(
        this.stageCtx,
        cssW,
        cssH,
        this.cameraRunning ? this.videoEl : null,
        trackingFrame,
        musicalState
      );
      this.updateDomHud(musicalState);
      this.renderOscilloscope(musicalState.rootNote?.color || '#00d2d3');

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.aetherVisionApp = new AetherVisionWorkstationApp();
});
