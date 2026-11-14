# Product Requirements Document (PRD) — Aether-Vision Gesture Harmonic Workstation

**Project Name:** Aether-Vision Gesture Synth (`gesture-pet-cam-synth`)  
**Current Version:** v1.1 (Production Implementation — Derived from `ThereminPetCamGestures` v2.6 architecture)  
**Core Stack:** MediaPipe Tasks-Vision (`HandLandmarker` v0.10.18), Tone.js v15 (Dual 6-Voice Polyphonic Unison DSP + Sub-Oscillator), Web MIDI API, HTML5 2D Canvas, Vite v6  
**Local Dev URL:** `http://localhost:5180/` (automatically falls back to `http://localhost:5181/` if port `5180` is occupied)

---

## 1. Product Vision & Overview

**Aether-Vision Gesture Harmonic Workstation** is a zero-AI-runtime, deterministic client-side optical web musical instrument built with **MediaPipe Tasks-Vision** (`HandLandmarker`), **Tone.js v15**, **Web MIDI API**, and **HTML5 2D Canvas**. Replacing the horizontal spatial pitch axis of a traditional theremin, this instrument introduces a **split-screen, gesture-driven harmonic & melodic workstation** with a built-in **Studio Mouse & Keyboard Simulation Mode**:

- **Pinky-Led Ergonomic Gesture-to-Note Engine:** Discrete hand shapes directly trigger the 7 diatonic scale degrees (`1st` through `7th`) using a natural pinky-to-index unfurling motion (`1` = Pinky only, `2` = Pinky + Ring, `3` = Pinky + Ring + Middle, `4` = 4 Fingers with Thumb Tucked, `5` = 5 / Open Palm, `6` = Thumb Out / Shaka, `7` = Horns / Rock, and `Closed Fist` = Mute/Rest).
- **16:9 Aspect-Corrected Thumb Disambiguation (`distAspect`):** Normalizes horizontal and vertical hand landmark distances in uniform physical screen space (`aspect = 16 / 9`), using dual-mode thumb geometry (`thumbOpenForPalm` vs. `thumbAbductedForShaka`) so a natural 5-finger Open Palm (`5th`) is reliably distinguished from 4 Fingers with a tucked thumb (`4th`), while `Thumb Out / Shaka` (`6th`) never false-triggers on `Pinky Only` (`1st`).
- **Wrist-Roll Semitone Inflection (`±30°`):** Rotating the Note Hand approximately `30°` clockwise or counter-clockwise shifts the active note (or chord root) by `+1 Semitone (Sharp #)` or `-1 Semitone (Flat b)`, supporting both **Hard Semitone Step (`±1st` with hysteresis)** and **Smooth Continuous Pitch Bend (`±1st`)**.
- **Left-Hand X-Axis Shake "Soul Vibrato & Tremolo":** Shaking the Note Hand horizontally along the `X`-axis drives a phase-locked micro-pitch undulation (`±42¢`), swells the synth's pitch vibrato LFO (`depth` + `rate`), engages a warm stereo amplitude `Tone.Tremolo` stage, and adds gentle filter cutoff shimmer with live concentric acoustic wave ripples (`(( ● ))`) around the Note Hand reticle.
- **Split-Screen Octave & 6-Quadrant Chord Matrix:** Vertical height (`Y`-axis) on the Note Hand side selects stacked octave registers (`Octave 1` through `Octave 3` by default, configurable `1–5` octaves with `-4` to `+2` octave transposition). The opposite side switches seamlessly between **Single-Note Melody Mode** (`Y`-axis volume + `X`-axis assignable expression) and **Chords Mode** (a 2×3 6-quadrant harmonic grid: `Major 7`, `Minor 7`, `Major`, `Minor`, `Augmented`, `Diminished` with thumb-index pinch-aperture volume control).
- **Serum-Inspired Polyphonic Unison Engine (`PolySerumSynth`):** Runs two parallel 6-voice `Tone.PolySynth` engines (`Osc A` + `Osc B`) plus a dedicated `-1 Octave` root-tracking Sub-Oscillator, featuring `1–8` unison voices, `0–60¢` stereo detune spread, continuous `Osc A/B Mix`, `Osc B Fine Detune`, Chebyshev/Waveshaper tube grit, `24 dB/oct` resonant lowpass filter, vibrato LFO, `5ms` VCA gate, and a 5-pedal Boss-style series stompbox board.
- **Instant Studio Mouse & Keyboard Simulation Mode:** Allows full musical performance, testing, and sound design even without a webcam active by generating synthetic 21-landmark hands for both zones, controllable via pointer movement, scroll wheel (pinch gap), clickable Legend Bar cards, and keyboard shortcuts (`1–7`, `0`/`Space`, `Q`/`E`).

### Key Architectural Principles
- **Zero-Latency Local Processing:** 100% client-side MediaPipe GPU/CPU hand landmark inference + Tone.js polyphonic synthesis (`lookAhead = 0.01s`). No cloud inference or server audio roundtrips.
- **Anti-Glitch Gesture & Spatial Stability:**
  - **2-Frame (`~33ms` at 60fps) Gesture Debounce Lock:** Prevents intermediate finger movements from triggering unintended ghost notes.
  - **Wrist-Roll Hysteresis (`±20°` Deadzone / `±25°` Engagement):** Eliminates oscillation between natural and sharp/flat inflection.
  - **3% Octave Tier & 2% Quadrant Boundary Hysteresis:** Prevents rapid octave trills or chord flickering when hovering near zone dividers.
- **Left-Handed Musician Ready:** Instant hardware switch (`HAND SWAP: STANDARD / LEFTY`, Shortcut: `H`) mirrors the split-screen stage, UI role headers, and hand assignments.
- **Solo One-Hand Convenience & Hand Absence Guard:** Raising only the Note Hand allows immediate solo play at `82%` default volume; when all hands leave the frame (and Drone Sustain is `OFF`), the engine mutes within `5ms` (`releaseAllVoices()`) and displays `🔇 NO HANDS DETECTED • SILENT`.
- **Default Safe Instrument State:** Starts in **Single-Note Mode**, **A Natural Minor Scale**, **3 Stacked Octaves (`C3–B5`)**, **Standard Handedness (Left = Notes/Octaves, Right = Volume/Chords)**, **All 5 Stompbox Pedals Bypassed**, **Drone Sustain OFF**, **Studio Mouse Sim Ready**, and **Serum Lush Super-Saw** voice.

---

## 2. System Architecture & File Inventory

| File | Responsibility |
| :--- | :--- |
| `package.json` | Project manifest configuring `@mediapipe/tasks-vision` (`^0.10.18`), `tone` (`^15.0.4`), and `vite` (`^6.0.0`) scripts (`dev`, `build`, `preview`) |
| `vite.config.js` | Vite dev/preview server configuration bound to port `5180` (`host: true`, `strictPort: false` for automatic fallback) |
| `index.html` | Hardware chassis layout: top telemetry & transport bar, 8-slot Gesture Legend Bar, split-screen AR HUD stage, Huge 74px Note/Chord HUD, User Patch Bank bar, 3 rack modules, and 5-pedal stompbox board |
| `style.css` | Dark brushed-aluminum rack aesthetic (`color-scheme: dark`), customizable `<select>` (`appearance: base-select`), LED indicators, rotary dials, Boss stompbox styling, chromatic glow variables, and Zen fullscreen view |
| `src/main.js` | `AetherVisionWorkstationApp`: Application lifecycle, 60fps optical/mouse render loop, rotary knob pointer-capture/wheel/keyboard bindings, pedalboard switches, keyboard shortcuts, oscilloscope renderer, and Patch Bank wiring |
| `src/tracking.js` | `HandTrackingEngine`: MediaPipe `HandLandmarker` (GPU with CPU fallback), EMA landmark smoothing (`alpha = 0.35`), aspect-corrected (`16:9`) pinky-led 8-gesture classifier, 2-frame debounce hysteresis, wrist-roll angle math (`±30°`), pinch-aperture sensor, and synthetic 21-landmark Mouse Simulation generator |
| `src/grid.js` | `GestureStageEngine`: Split-screen octave tiers (`1–5` octaves with `3%` hysteresis), 2×3 6-quadrant Chord Matrix (`2%` hysteresis), 60fps HTML5 2D Canvas AR HUD, skeletal wireframe renderer, wrist-roll protractor arc, pinch caliper, and 12-tone `NOTE_COLORS` palette |
| `src/synth.js` | `PolySerumSynth`: Dual 6-voice `Tone.PolySynth` (`Osc A` + `Osc B`) + `-1 Oct` `subOsc`, 10 built-in voice presets, tube grit distortion, `24 dB/oct` lowpass filter, vibrato LFO, `5ms` VCA gate, 5-pedal Boss series DSP chain, `-1 dB` limiter, `Tone.Waveform` analyzer, and `MediaRecorder` studio session recorder |
| `src/presets.js` | `UserPatchBank`: `localStorage` patch manager (`aether_vision_gesture_workstation_patches_v1`) pre-seeded with 3 factory patches, supporting save, recall, delete, JSON file export, and JSON file import |
| `src/midi.js` | `WebMidiController`: Polyphonic Web MIDI output with macOS IAC Driver auto-priority, transmitting Note On/Off (single notes & 3/4-note chord voicings), 14-bit Pitch Bend, CC#11 Expression (Volume), CC#74 Brightness (X-Expression), and CC#123 All Notes Off |

---

## 3. Detailed Functional Specifications

### 3.1 Split-Screen Stage, Hand Assignment & Left-Handed Musician Toggle (`src/tracking.js`, `src/grid.js`)
- **Vertical Split-Screen Stage (`X = 0.50` in mirrored coordinates):**
  - **Left Hand Side (Default: Note & Octave Selection):** Triggers scale degrees `1–7` (or Fist Mute) via hand gestures, bends/shifts semitones via `±30°` wrist rotation, and selects the active octave tier by moving vertically on the `Y`-axis.
  - **Right Hand Side (Default: Volume, Expression & Chords):** Controls master volume (`Y`-axis: `0%` at `y = 0.82` to `100%` at `y = 0.18`) and assignable expression (`X`-axis) in Single-Note Mode, or selects one of the 6 harmonic chord quadrants while controlling volume via thumb-index pinch in Chords Mode.
- **Ambidextrous / Left-Handed Toggle (`HAND SWAP: STANDARD / LEFTY`, Shortcut: `H`):**
  - Flips the Left and Right screen zones (`Left Side = Volume/Chords`, `Right Side = Notes/Octaves`), resets EMA smoothing slots cleanly, updates all canvas HUD headers, and swaps hand role routing.
- **Solo Play & Hand Absence Guard:**
  - If only the Note Hand is present in the frame, the engine allows solo performance at `82%` default volume (`expressionX = 0.55`).
  - Whenever all hands leave the camera frame (and `DRONE SUSTAIN` is `OFF`), the synth ramps the VCA gate to `0` in `5ms`, releases all active voices, sends MIDI All Notes Off, and renders the centered stage banner `🔇 NO HANDS DETECTED • SILENT`.

---

### 3.2 Pinky-Led Gesture-to-Note Engine & 16:9 Aspect-Corrected Thumb Geometry (`src/tracking.js`)

All 2D landmark distances are computed using aspect-corrected Euclidean distance `distAspect(a, b, aspect = 16 / 9)` and normalized against `palmSize = distAspect(Landmark 0 [Wrist], Landmark 9 [Middle MCP])` so camera distance and 16:9 horizontal coordinate compression never affect recognition accuracy.

#### Discrete Finger Gesture Table (7 Scale Degrees + Mute)
| Degree / Action | Gesture ID & Label | Extended Digits (`[Thumb, Index, Middle, Ring, Pinky]`) | Curled / Tucked Digits | Musical Output |
| :--- | :--- | :--- | :--- | :--- |
| **1st (Root)** | `deg1` • **1: Pinky** | **Pinky (`20`)** only (`[0, 0, 0, 0, 1]`) | Thumb (`4`), Index (`8`), Middle (`12`), Ring (`16`) | **Scale Degree 1 (Root)** |
| **2nd** | `deg2` • **2: Pinky+Ring** | **Pinky (`20`) + Ring (`16`)** (`[0, 0, 0, 1, 1]`) | Thumb (`4`), Index (`8`), Middle (`12`) | **Scale Degree 2** |
| **3rd** | `deg3` • **3: P+R+Mid** | **Pinky (`20`) + Ring (`16`) + Middle (`12`)** (`[0, 0, 1, 1, 1]`) | Thumb (`4`), Index (`8`) | **Scale Degree 3** |
| **4th** | `deg4` • **4: 4-Fingers** | **Pinky + Ring + Middle + Index** (`[0, 1, 1, 1, 1]`) | **Thumb (`4`) tucked** inward across palm | **Scale Degree 4** |
| **5th** | `deg5` • **5: Open Palm** | **All 5 Digits** (`[1, 1, 1, 1, 1]`) | None (natural open hand) | **Scale Degree 5** |
| **6th** | `deg6` • **6: Shaka/Thumb** | **Thumb (`4`)** (or `Thumb + Pinky` Shaka, `[1, 0, 0, 0, 1]`) | Index (`8`), Middle (`12`), Ring (`16`) curled | **Scale Degree 6** |
| **7th** | `deg7` • **7: Horns** | **Index (`8`) + Pinky (`20`)** (`[0, 1, 0, 0, 1]`) | Middle (`12`) + Ring (`16`) curled | **Scale Degree 7** |
| **Mute / Rest** | `mute` • **Mute: Fist** | **None** (`[0, 0, 0, 0, 0]`) | All 5 digits curled tightly to palm | **Instant Mute (`5ms` VCA gate)** |

#### Dual-Context Thumb Disambiguation
1. **`thumbOpenForPalm` (5 Fingers vs. 4 Fingers when Index, Middle, Ring, and Pinky are extended):**
   - Evaluates whether Thumb Tip (`4`) lies outward beyond Thumb IP (`3`) and Thumb MCP (`2`) relative to Pinky MCP (`17`) and Ring MCP (`13`) (`tipToPinkyMcp > ipToPinkyMcp * 0.98`, `tipToPinkyMcp > mcpToPinkyMcp * 1.03`, `tipToRingMcp > mcpToRingMcp * 0.94`, `tipToIndexMcp > 0.28`).
   - When the user tucks their thumb across the palm for **4 Fingers (`4th`)**, `thumbOpenForPalm` becomes `false`; when holding a natural **Open Palm (`5th`)**, `thumbOpenForPalm` is `true`.
2. **`thumbAbductedForShaka` (Gesture 6 `Thumb Out / Shaka` vs. Gesture 1 `Pinky Only` & `Closed Fist`):**
   - When Index, Middle, and Ring are curled, requires strict outward thumb abduction (`tipToIndexMcp > 0.45`, `tipToMiddleMcp > 0.54`, `tipToPinkyMcp > mcpToPinkyMcp * 1.12`) so `Pinky Only` (`1st`) never false-triggers `Shaka` (`6th`).

#### Wrist Rotation Semitone Inflection (`±30°` Sharp / Flat)
- **Angle Calculation:** Blends the primary palm orientation vector (`Wrist [0]` → `Middle MCP [9]` relative to vertical upward `(0, -1)`, weighted `78%`) with the knuckle axis (`Index MCP [5]` → `Pinky MCP [17]`, weighted `22%`), smoothed with an EMA filter (`0.38`).
- **Neutral Deadzone (`-20°` to `+20°`):** Plays the natural diatonic scale degree (`semitoneShift = 0`).
- **Clockwise Rotation (`≥ +25°` engage, `< +20°` release):** Shifts the triggered note (or entire chord root in Chords Mode) **`+1 Semitone (Sharp #)`**.
- **Counter-Clockwise Rotation (`≤ -25°` engage, `> -20°` release):** Shifts the triggered note (or entire chord root in Chords Mode) **`-1 Semitone (Flat b)`**.
- **Smooth Pitch Bend Option:** When `Wrist-Roll Mode` is set to `Smooth Pitch Bend`, rotation beyond `±20°` continuously interpolates pitch bend up to `±1.0` semitone at `±36°`.

---

### 3.3 Stacked Vertical Octave Zones (`src/grid.js`)
- **Vertical Y-Axis Octave Division (Note Hand Side):**
  - Slices the Note Hand half of the viewport horizontally into `1` to `5` stacked octave tiers (defaults to **`3` octaves**: Top = `OCTAVE 3 (HIGHER)`, Middle = `OCTAVE 2 (MID)`, Bottom = `OCTAVE 1 (LOWER)`).
  - Each tier renders a live preview row of color-coded scale degree pills (`1:A`, `2:B`, `3:C`, `4:D`, `5:E`, `6:F`, `7:G`).
- **Octave Transpose Controls (`-` / `+`):** Shifts the entire octave stack from **`-4` to `+2` octaves** (`C1` to `B7`) via Module 01 stepper buttons or keyboard shortcuts (`-` / `+` or `[` / `]`).
- **3% Boundary Hysteresis:** Applies a `0.03` normalized vertical buffer around horizontal divider lines to prevent octave trills when the hand hovers on a boundary.

---

### 3.4 Right-Hand Expression & 6-Quadrant Chords Mode (`src/grid.js`, `src/tracking.js`)

Toggled via the top bar button **`MODE: SINGLE NOTE` / `MODE: CHORDS (6-QUAD)`** (Shortcut: `C`).

#### 1. Single-Note Mode (Default)
- **Y-Axis = Master Volume:** Maps `0%` volume at `y = 0.82` to `100%` gain at `y = 0.18`, visualized on an illuminated vertical Volume Ladder.
- **X-Axis = Assignable Expression:** Moving horizontally across the Expression half modulates one of 6 selectable targets:
  1. `Filter Cutoff (Wah / Brightness)` (Default)
  2. `Serum Unison Detune & Spread`
  3. `Vibrato Depth & Rate`
  4. `Delay Feedback Swell` (when DD-7 is active)
  5. `Reverb Shimmer Space` (when RV-6 is active)
  6. `None (Volume Height Only)`
- **Staccato Pinch / Fist Mute:** Pinching thumb and index tips together (`rawGap ≤ 0.038`) or closing the expression hand into a fist mutes output within `5ms`.

#### 2. Chords Mode (6-Quadrant Matrix)
- **2×3 Harmonic Quadrant Grid:** Divides the Expression/Chords half into **6 equal quadrants** (`2 columns × 3 rows` with a `2%` hysteresis buffer). Each quadrant displays its harmonic title, interval formula, and the **live resolved chord symbol** for the Note Hand's current root note:

| Row | Inner Column (`localX = 0.00 – 0.50`) | Outer Column (`localX = 0.50 – 1.00`) |
| :--- | :--- | :--- |
| **Top Row (`Y = 0.00 – 0.33`)** | **Major 7** (`maj7` • `1 • 3 • 5 • 7` • `[0, 4, 7, 11]`) | **Minor 7** (`m7` • `1 • b3 • 5 • b7` • `[0, 3, 7, 10]`) |
| **Middle Row (`Y = 0.33 – 0.66`)** | **Major** (`maj` • `1 • 3 • 5` • `[0, 4, 7]`) | **Minor** (`m` • `1 • b3 • 5` • `[0, 3, 7]`) |
| **Bottom Row (`Y = 0.66 – 1.00`)** | **Augmented** (`aug` • `1 • 3 • #5` • `[0, 4, 8]`) | **Diminished** (`dim` • `1 • b3 • b5` • `[0, 3, 6]`) |

- **Pinch-Aperture Volume Control:**
  - Measures Euclidean distance between Thumb Tip (`4`) and Index Tip (`8`) with an S-curve response:
  - **Open Pinch (`≥ 0.165`):** `100%` volume.
  - **Closed Pinch (`≤ 0.038`):** `0%` clean mute (`5ms` VCA gate).
  - Renders a live green/red **Pinch Caliper (`GAP VOL %`)** directly between the thumb and index fingertips.

---

### 3.5 Color-Coding, Top 8-Slot Gesture Legend & Huge Center HUD (`src/grid.js`, `index.html`, `style.css`)

#### 1. 12-Tone Chromatic Color Palette (`NOTE_COLORS`)
- `C` Coral Red (`#ff4757`), `C#` Tangerine (`#ff6b4a`), `D` Amber Gold (`#ffa502`), `D#` Golden Yellow (`#eccc68`), `E` Lime Mint (`#7bed9f`), `F` Emerald (`#2ed573`), `F#` Seafoam Teal (`#1dd1a1`), `G` Cyan (`#00d2d3`), `G#` Sky Azure (`#54a0ff`), `A` Iris Violet (`#6c5ce7`), `A#` Electric Purple (`#a55eea`), `B` Neon Rose (`#ff4081`).

#### 2. Top 8-Slot Gesture Legend Bar (`#gesture-legend-bar`)
- A 52px 8-column horizontal dock directly above the stage featuring interactive buttons for `[1: Pinky]`, `[2: Pinky+Ring]`, `[3: P+R+Mid]`, `[4: 4-Fingers]`, `[5: Open Palm]`, `[6: Shaka/Thumb]`, `[7: Horns]`, and `[Mute: Fist]`.
- Each card renders a 5-bar finger extension silhouette, the gesture label, and a live chromatic pill badge showing the exact resolved note in the current Scale, Octave Tier, and Wrist-Roll state. Clicking any card triggers that gesture in Studio Mouse Sim Mode.

#### 3. Huge Center Note & Chord HUD (`#huge-note-hud`, Shortcut: `N`)
- Glassmorphic top-center overlay card displaying:
  - Active gesture badge, active octave tier badge (`OCTAVE 2 (C4)`), and exact root frequency in Hz (`440.00 Hz`).
  - **74px chromatic-glowing main symbol** (`A4` in Single-Note Mode, or `Am7`, `Cmaj7`, `G#dim` in Chords Mode).
  - Row of color-coded chord voicing pills (`A4`, `C5`, `E5`, `G5`) when in Chords Mode.
  - Live **Wrist-Roll Protractor Bar** (`-30° ♭ ◄───●───► ♯ +30°`) with a `±20°` neutral deadzone marker.

---

### 3.6 Serum-Inspired Polyphonic Dual-Oscillator Synth Engine & 5-Pedal Board (`src/synth.js`)

#### Module 01: Scale, Octave & Gesture Calibration
- **Scale Root:** `C` through `B` (Default: `A`).
- **8 Scale Presets:** `Major (Ionian)`, `Natural Minor (Aeolian)` (Default), `Dorian Mode`, `Harmonic Minor`, `Major Pentatonic`, `Minor Pentatonic`, `Blues Scale`, `Chromatic (1–7)`.
- **Stacked Octave Rows (`1–5`)** & **Octave Transpose (`-4` to `+2`)**.
- **Wrist-Roll Inflection Mode (`Hard Semitone Step` vs. `Smooth Pitch Bend`)** & **Right-Hand X Expression Target**.

#### Module 02: Serum Dual-Oscillator & Unison Lab
- **10 Built-In Polyphonic & Lead Voice Presets (`VOICE_PRESETS`):**
  - *Serum Rich Textures & Synths:*
    1. `Serum Lush Super-Saw` (Default — 6-voice unison `fatsawtooth`, `38¢` spread, `42%` sub)
    2. `Serum Liquid Pluck / Pad` (`fatsawtooth` + `fatsquare`, resonant filter, `5` voices)
    3. `Cyberpunk Reese Bass / Lead` (`fatsawtooth` + `pulse`, `7` voices, `52¢` spread, `48%` tube grit, `72%` sub)
    4. `CS-80 Blade Brass` (Expressive analog poly brass)
    5. `Ethereal Vocal Choir Pad` (`8`-voice unison choir pad)
  - *Classic & Organic Poly-Adapted Voices:*
    6. `Gentle Whistle`
    7. `Windy Flute`
    8. `Ambient Celeste`
    9. `Moog Etherwave Poly`
    10. `1929 RCA Original`
- **Oscillator Controls:** Independent `Osc A` and `Osc B` waveforms (`fatsawtooth`, `fatsquare`, `sawtooth`, `square`, `pulse`, `triangle`, `sine`) + 6 rotary dials (`UNISON` `1–8v`, `SPREAD` `0–60¢`, `SUB -1 OCT` `0–100%`, `A/B MIX` `0–100%`, `OSC B FINE` `-50¢` to `+50¢`, `LFO DEPTH` `0–100%`).

#### Module 03: Master Shaping, Sustain & Web MIDI
- **5 Master Rotary Dials:** `CUTOFF` (`200–12000 Hz`), `RESO (Q)` (`0.5–12.0`), `ATTACK` (`5–1500 ms`), `RELEASE` (`30–3000 ms`), `TUBE GRIT` (`0–100%`).
- **Toggles & Routing:** `DRONE SUSTAIN: ON / OFF`, `MIDI OUT: ON / OFF`, and `MIDI OUTPUT PORT` selector with automatic macOS `IAC Driver` prioritization.

#### 5-Pedal Boss-Style Stompbox Board (Series Chain)
`PolySerumSynth → OC-3 Super Octave → PS-6 Harmonist → FZ-2 Hyper Fuzz → DD-7 Digital Delay → RV-6 Schroeder FDN Reverb → Master Limiter (-1 dB)`
1. **OC-3 Super Octave:** `SUB -1`, `SUB -2`, `DIRECT`, Footswitch + CHECK LED.
2. **PS-6 Harmonist:** `SHIFT` (`-12` to `+12` semitones), `DETUNE` (`0–40`), `MIX`, Footswitch + CHECK LED.
3. **FZ-2 Hyper Fuzz:** `GAIN`, `TONE` (`600–9000 Hz`), `LEVEL`, Footswitch + CHECK LED.
4. **DD-7 Digital Delay:** `TIME` (`50–800 ms`), `F.BACK` (`0–88%`), `E.LEVEL`, Footswitch + CHECK LED.
5. **RV-6 Digital Reverb:** `TIME` (`0.5–6.0 s`), `TONE` (`1200–10000 Hz`), `E.LEVEL`, Footswitch + CHECK LED.

#### User Patch Bank (`src/presets.js`) & Studio Recorder
- Pre-seeded with 3 factory patches (`01 • Serum Lush Init (Safe Default)`, `02 • Vangelis 6-Quadrant Chord Matrix`, `03 • Cyberpunk Reese Lead + Fuzz/Octave`).
- Supports full `localStorage` save/recall/delete plus 1-click JSON Export & Import and post-limiter `.webm` session audio recording (`● REC`).

---

## 4. Controls & Keyboard Shortcuts Summary

| Shortcut / Action | Behavior |
| :--- | :--- |
| **`Esc` or `M`** | Emergency Kill Sound / Master Mute toggle (`5ms` VCA gate + MIDI All Notes Off) |
| **`C`** | Toggle between **`MODE: SINGLE NOTE`** and **`MODE: CHORDS (6-QUAD)`** |
| **`H`** | Toggle **`HAND SWAP: STANDARD / LEFTY`** (Left-Handed Musician Mode) |
| **`N`** | Toggle Huge Center Note / Chord HUD Overlay (`NOTE HUD: ON / OFF`) |
| **`Z`** | Toggle distraction-free **Zen Fullscreen View** |
| **`-` / `+` (or `[` / `]`)** | Transpose Octave Stack down or up (`-4` to `+2` octaves) |
| **`1` – `7` Keys (Mouse Sim)** | Trigger Note Gestures `1` through `7` (`0` or `Space` = Closed Fist Mute) |
| **`Q` / `E` Keys (Mouse Sim)** | Toggle `-30°` Flat (`♭`) / `+30°` Sharp (`♯`) wrist rotation in Studio Mouse Sim |
| **Stage Wheel (Mouse Sim)** | Adjust right-hand Thumb-Index Pinch Gap Aperture (`0.025` to `0.180`) |
| **Rotary Knobs Drag / Wheel / Arrows** | Vertical pointer drag, scroll wheel, or Arrow keys finely adjust any rack or pedal knob |
