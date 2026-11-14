import { GESTURE_DEFINITIONS } from './tracking.js';

export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const NOTE_COLORS = {
  C: '#ff4757',   // Coral Red
  'C#': '#ff6b4a', // Tangerine
  D: '#ffa502',   // Amber Gold
  'D#': '#eccc68', // Golden Yellow
  E: '#7bed9f',   // Lime Mint
  F: '#2ed573',   // Emerald
  'F#': '#1dd1a1', // Seafoam Teal
  G: '#00d2d3',   // Cyan
  'G#': '#54a0ff', // Sky Azure
  A: '#6c5ce7',   // Iris Violet
  'A#': '#a55eea', // Electric Purple
  B: '#ff4081'    // Neon Rose
};

export const SCALE_PRESETS = {
  Major: { label: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  'Natural Minor': { label: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  Dorian: { label: 'Dorian Mode', intervals: [0, 2, 3, 5, 7, 9, 10] },
  'Harmonic Minor': { label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  'Major Pentatonic': { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9, 12, 14] },
  'Minor Pentatonic': { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10, 12, 15] },
  'Blues Scale': { label: 'Blues Hexatonic + Root', intervals: [0, 3, 5, 6, 7, 10, 12] },
  Chromatic: { label: 'Chromatic (1–7 Semitones)', intervals: [0, 1, 2, 3, 4, 5, 6] }
};

export const CHORD_QUADRANTS = [
  {
    id: 'maj7',
    row: 0,
    col: 0,
    title: 'Major 7',
    suffix: 'maj7',
    formula: '1 • 3 • 5 • 7',
    intervals: [0, 4, 7, 11]
  },
  {
    id: 'm7',
    row: 0,
    col: 1,
    title: 'Minor 7',
    suffix: 'm7',
    formula: '1 • b3 • 5 • b7',
    intervals: [0, 3, 7, 10]
  },
  {
    id: 'maj',
    row: 1,
    col: 0,
    title: 'Major',
    suffix: '',
    formula: '1 • 3 • 5',
    intervals: [0, 4, 7]
  },
  {
    id: 'min',
    row: 1,
    col: 1,
    title: 'Minor',
    suffix: 'm',
    formula: '1 • b3 • 5',
    intervals: [0, 3, 7]
  },
  {
    id: 'aug',
    row: 2,
    col: 0,
    title: 'Augmented',
    suffix: 'aug',
    formula: '1 • 3 • #5',
    intervals: [0, 4, 8]
  },
  {
    id: 'dim',
    row: 2,
    col: 1,
    title: 'Diminished',
    suffix: 'dim',
    formula: '1 • b3 • b5',
    intervals: [0, 3, 6]
  }
];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function hexToRgba(hex, alpha) {
  const clean = (hex || '#00d2d3').replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function midiToNoteInfo(midiNumber, fineBendSemitones = 0) {
  const roundedMidi = clamp(Math.round(midiNumber), 12, 119);
  const pitchClassIndex = ((roundedMidi % 12) + 12) % 12;
  const pitchClass = CHROMATIC_NOTES[pitchClassIndex];
  const octave = Math.floor(roundedMidi / 12) - 1;
  const fullName = `${pitchClass}${octave}`;
  const exactMidi = midiNumber + fineBendSemitones;
  const freqHz = 440 * Math.pow(2, (exactMidi - 69) / 12);
  const color = NOTE_COLORS[pitchClass] || '#00d2d3';

  return {
    midi: roundedMidi,
    exactMidi,
    pitchClass,
    octave,
    fullName,
    freqHz,
    color
  };
}

export class GestureStageEngine {
  constructor() {
    // Default Safe Instrument State per PRD Section 1:
    // Single-Note Mode, A Minor / C Major Scale, 3 Octaves, Standard Handedness
    this.scaleRoot = 'A';
    this.scaleName = 'Natural Minor';
    this.octaveCount = 3;      // 1..5 stacked octaves
    this.octaveTranspose = 0;  // -4..+2 octaves
    this.baseOctave = 3;       // Lowest tier base octave when transpose = 0
    this.wristRollMode = 'step'; // 'step' (Hard ±1st at 30°) | 'smooth' (Smooth continuous ±1st)
    this.playMode = 'single';  // 'single' | 'chords'
    this.swapHands = false;
    this.showNoteHud = true;
    this.exprTargetLabel = 'Filter Cutoff (Wah)';

    // Hysteresis state for vertical octave tiers (3% buffer per PRD Section 3.3)
    this.activeOctaveTierIndex = 1; // 0 = bottom (Octave 1), 1 = middle (Octave 2), etc.
    this.activeChordQuadrant = CHORD_QUADRANTS[3]; // Default Minor ('min')
  }

  /**
   * Resolve which vertical octave tier (0 = bottom/lowest, octaveCount-1 = top/highest)
   * with 3% boundary hysteresis buffer.
   */
  resolveOctaveTier(yNormalized) {
    const count = clamp(this.octaveCount, 1, 5);
    if (count === 1) {
      this.activeOctaveTierIndex = 0;
      return 0;
    }

    const y = clamp(yNormalized, 0, 0.9999);
    const sliceHeight = 1 / count;

    // Current tier boundaries in screen Y (note: Y=0 is top = highest octave, Y=1 is bottom = lowest octave)
    const currentRowFromTop = count - 1 - clamp(this.activeOctaveTierIndex, 0, count - 1);
    const rowTopY = currentRowFromTop * sliceHeight;
    const rowBottomY = (currentRowFromTop + 1) * sliceHeight;
    const buffer = 0.03; // 3% vertical hysteresis buffer per PRD

    if (y >= rowTopY - buffer && y <= rowBottomY + buffer) {
      return this.activeOctaveTierIndex;
    }

    const newRowFromTop = clamp(Math.floor(y / sliceHeight), 0, count - 1);
    this.activeOctaveTierIndex = count - 1 - newRowFromTop;
    return this.activeOctaveTierIndex;
  }

  /**
   * Resolve which of the 6 Chord Quadrants (2 cols x 3 rows) the Right/Expression Hand occupies
   */
  resolveChordQuadrant(localX, yNormalized) {
    const x = clamp(localX, 0, 0.9999);
    const y = clamp(yNormalized, 0, 0.9999);

    // 2% hysteresis around column divider (0.50) and row dividers (0.333, 0.666)
    const curCol = this.activeChordQuadrant?.col ?? 0;
    const curRow = this.activeChordQuadrant?.row ?? 1;
    const buf = 0.02;

    let col = x < 0.5 ? 0 : 1;
    if (curCol === 0 && x < 0.5 + buf) col = 0;
    else if (curCol === 1 && x > 0.5 - buf) col = 1;

    let row = y < 1 / 3 ? 0 : y < 2 / 3 ? 1 : 2;
    const rTop = curRow / 3;
    const rBot = (curRow + 1) / 3;
    if (y >= rTop - buf && y <= rBot + buf) {
      row = curRow;
    }

    const found =
      CHORD_QUADRANTS.find((q) => q.row === row && q.col === col) || CHORD_QUADRANTS[2];
    this.activeChordQuadrant = found;
    return found;
  }

  /**
   * Compute MIDI note for a given gesture degree (1..7), octave tier (0..octaveCount-1),
   * and semitone shift (-1, 0, +1).
   */
  getNoteForDegree(degree, tierIndex = this.activeOctaveTierIndex, semitoneShift = 0, fineBend = 0) {
    if (!degree || degree < 1 || degree > 7) return null;
    const rootIndex = Math.max(0, CHROMATIC_NOTES.indexOf(this.scaleRoot));
    const scaleObj = SCALE_PRESETS[this.scaleName] || SCALE_PRESETS['Natural Minor'];
    const degreeInterval = scaleObj.intervals[degree - 1] ?? 0;

    const effectiveOctave = clamp(this.baseOctave + this.octaveTranspose + tierIndex, 1, 7);
    const rootMidi = (effectiveOctave + 1) * 12 + rootIndex;
    const targetMidi = rootMidi + degreeInterval + semitoneShift;

    return midiToNoteInfo(targetMidi, fineBend);
  }

  /**
   * Compute all 7 scale degree preview notes for the currently active octave tier and wrist-roll state
   * (Used to populate the 8-slot Gesture Legend Bar badges!)
   */
  getLegendNotes(tierIndex = this.activeOctaveTierIndex, semitoneShift = 0) {
    const map = {};
    for (let deg = 1; deg <= 7; deg++) {
      map[deg] = this.getNoteForDegree(deg, tierIndex, semitoneShift, 0);
    }
    return map;
  }

  /**
   * Compute full musical state from current dual-hand tracking frame
   */
  evaluateMusicalFrame(trackingFrame) {
    const noteHand = trackingFrame?.noteHand;
    const exprHand = trackingFrame?.exprHand;

    const tierIndex = noteHand?.present
      ? this.resolveOctaveTier(noteHand.y)
      : clamp(this.activeOctaveTierIndex, 0, this.octaveCount - 1);

    const semitoneShift = noteHand?.present ? noteHand.semitoneShift : 0;
    const fineBend =
      noteHand?.present && this.wristRollMode === 'smooth'
        ? noteHand.continuousBend - semitoneShift
        : 0;

    const activeQuadrant = exprHand?.present
      ? this.resolveChordQuadrant(exprHand.localX, exprHand.y)
      : this.activeChordQuadrant;

    const gesture = noteHand?.present ? noteHand.gesture : null;
    const isGestureMuted = !noteHand?.present || !gesture || gesture.degree === 0;

    // Determine volume and expression based on mode & hand presence
    let volume = 0;
    let expressionX = 0.5;
    let isMuted = isGestureMuted;

    if (!isGestureMuted) {
      if (exprHand?.present) {
        expressionX = exprHand.localX;
        if (this.playMode === 'chords') {
          volume = exprHand.pinchVolume;
          if (exprHand.isPinchMuted) isMuted = true;
        } else {
          volume = exprHand.yVolume;
          if (exprHand.isPinchMuted || volume <= 0.01) isMuted = true;
        }
      } else {
        // When only the Note Hand is inside the camera frame, allow expressive solo play at 82% volume
        volume = 0.82;
        expressionX = 0.55;
      }
    }

    const activeDegree = gesture?.degree || 1;
    const rootNote = this.getNoteForDegree(
      activeDegree || 1,
      tierIndex,
      semitoneShift,
      fineBend
    );

    // Build chord voicing if in Chords Mode
    let chordNotes = [];
    let chordSymbol = '';
    if (rootNote) {
      if (this.playMode === 'chords') {
        chordSymbol = `${rootNote.pitchClass}${activeQuadrant.suffix}`;
        chordNotes = activeQuadrant.intervals.map((interval) =>
          midiToNoteInfo(rootNote.midi + interval, fineBend)
        );
      } else {
        chordSymbol = rootNote.fullName;
        chordNotes = [rootNote];
      }
    }

    const legendNotes = this.getLegendNotes(tierIndex, semitoneShift);
    const shakeIntensity = noteHand?.present ? noteHand.shakeIntensity || 0 : 0;
    const shakeWave = noteHand?.present ? noteHand.shakeWave || 0 : 0;

    return {
      hasHands: (trackingFrame?.handsDetected || 0) > 0,
      isMuted,
      playMode: this.playMode,
      tierIndex,
      octaveNumber: clamp(this.baseOctave + this.octaveTranspose + tierIndex, 1, 7),
      gesture: gesture || GESTURE_DEFINITIONS[7],
      wristAngleDeg: noteHand?.present ? noteHand.wristAngleDeg : 0,
      semitoneShift,
      fineBend,
      shakeIntensity,
      shakeWave,
      rootNote,
      chordSymbol,
      chordNotes,
      activeQuadrant,
      volume: isMuted ? 0 : volume,
      expressionX,
      pinchGap: exprHand?.present ? exprHand.pinchGap : 0.165,
      legendNotes
    };
  }

  /**
   * Render the 60fps Split-Screen AR HUD Stage onto the 2D Canvas
   */
  renderStage(ctx, canvasWidth, canvasHeight, videoEl, trackingFrame, musicalState) {
    ctx.save();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Draw Mirrored Webcam Feed (aspect-preserved "cover" crop) or Studio Cyber Grid Background
    if (videoEl && videoEl.readyState >= 2 && !videoEl.paused) {
      const vw = videoEl.videoWidth || 1280;
      const vh = videoEl.videoHeight || 720;
      const videoAspect = vw / vh;
      const stageAspect = canvasWidth / canvasHeight;

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (stageAspect > videoAspect) {
        sh = vw / stageAspect;
        sy = (vh - sh) * 0.5;
      } else if (stageAspect < videoAspect) {
        sw = vh * stageAspect;
        sx = (vw - sw) * 0.5;
      }

      ctx.save();
      ctx.translate(canvasWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();

      // Cinematic dark vignette overlay for HUD contrast
      const grad = ctx.createRadialGradient(
        canvasWidth * 0.5,
        canvasHeight * 0.5,
        canvasWidth * 0.15,
        canvasWidth * 0.5,
        canvasHeight * 0.5,
        canvasWidth * 0.75
      );
      grad.addColorStop(0, 'rgba(8, 11, 18, 0.36)');
      grad.addColorStop(1, 'rgba(5, 7, 12, 0.72)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      this.drawStudioBackground(ctx, canvasWidth, canvasHeight);
    }

    const midX = canvasWidth * 0.5;
    const noteSideLeft = !this.swapHands;
    const noteRegionX = noteSideLeft ? 0 : midX;
    const noteRegionW = midX;
    const exprRegionX = noteSideLeft ? midX : 0;
    const exprRegionW = midX;

    const activeColor = musicalState.rootNote?.color || '#00d2d3';

    // 2. Render Note Hand Half: Stacked Vertical Octave Zones
    this.drawOctaveZones(
      ctx,
      noteRegionX,
      0,
      noteRegionW,
      canvasHeight,
      musicalState,
      activeColor
    );

    // 3. Render Expression / Chords Half: Single-Note Ladder OR 6-Quadrant Chord Matrix
    if (this.playMode === 'chords') {
      this.drawChordMatrix(
        ctx,
        exprRegionX,
        0,
        exprRegionW,
        canvasHeight,
        musicalState,
        activeColor
      );
    } else {
      this.drawSingleNoteExpressionZone(
        ctx,
        exprRegionX,
        0,
        exprRegionW,
        canvasHeight,
        musicalState,
        activeColor,
        noteSideLeft
      );
    }

    // 4. Draw Vertical Split-Screen Divider Line (X = 0.50) & Role Header Badges
    this.drawSplitDivider(ctx, midX, canvasWidth, canvasHeight, activeColor, noteSideLeft);

    // 5. Draw Hand Skeletal Wireframes, Wrist-Roll Protractor Arc & Pinch Caliper
    if (trackingFrame?.noteHand?.present && trackingFrame?.exprHand?.present && !musicalState.isMuted) {
      // Harmonic energy tether between Note Hand and Expression Hand
      const nx = trackingFrame.noteHand.x * canvasWidth;
      const ny = trackingFrame.noteHand.y * canvasHeight;
      const ex = trackingFrame.exprHand.x * canvasWidth;
      const ey = trackingFrame.exprHand.y * canvasHeight;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = hexToRgba(activeColor, 0.28 + musicalState.volume * 0.35);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.restore();
    }

    if (trackingFrame?.noteHand?.present) {
      this.drawNoteHandOverlay(
        ctx,
        canvasWidth,
        canvasHeight,
        trackingFrame.noteHand,
        musicalState,
        activeColor
      );
    }

    if (trackingFrame?.exprHand?.present) {
      this.drawExprHandOverlay(
        ctx,
        canvasWidth,
        canvasHeight,
        trackingFrame.exprHand,
        musicalState,
        activeColor
      );
    }

    // 6. Hand Absence Guard Banner if no hands are in frame
    if (!musicalState.hasHands) {
      this.drawNoHandsBanner(ctx, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }

  drawStudioBackground(ctx, w, h) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#0c1220');
    bg.addColorStop(1, '#070a12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(100, 140, 210, 0.06)';
    ctx.lineWidth = 1;
    const step = 36;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  drawOctaveZones(ctx, x0, y0, w, h, musicalState, activeColor) {
    const count = clamp(this.octaveCount, 1, 5);
    const tierHeight = h / count;
    const tierLabels = ['LOWER', 'MID-LOW', 'MID', 'HIGH', 'UPPER'];

    for (let rowFromTop = 0; rowFromTop < count; rowFromTop++) {
      const tierIdx = count - 1 - rowFromTop; // 0 = bottom, count-1 = top
      const topY = y0 + rowFromTop * tierHeight;
      const isCurrentTier = tierIdx === musicalState.tierIndex && musicalState.hasHands;
      const octaveNum = clamp(this.baseOctave + this.octaveTranspose + tierIdx, 1, 7);

      // Translucent octave band fill
      if (isCurrentTier) {
        const bandGrad = ctx.createLinearGradient(x0, topY, x0 + w, topY);
        bandGrad.addColorStop(0, hexToRgba(activeColor, 0.18));
        bandGrad.addColorStop(0.5, hexToRgba(activeColor, 0.08));
        bandGrad.addColorStop(1, hexToRgba(activeColor, 0.16));
        ctx.fillStyle = bandGrad;
        ctx.fillRect(x0, topY, w, tierHeight);

        // Illuminated edge glow bar
        ctx.fillStyle = activeColor;
        ctx.fillRect(this.swapHands ? x0 + w - 4 : x0, topY + 2, 4, tierHeight - 4);
      } else {
        ctx.fillStyle = rowFromTop % 2 === 0 ? 'rgba(15, 22, 36, 0.22)' : 'rgba(10, 14, 24, 0.32)';
        ctx.fillRect(x0, topY, w, tierHeight);
      }

      // Horizontal tier divider line
      if (rowFromTop > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, topY);
        ctx.lineTo(x0 + w, topY);
        ctx.strokeStyle = isCurrentTier
          ? hexToRgba(activeColor, 0.55)
          : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = isCurrentTier ? 1.5 : 1;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.restore();
      }

      // Octave label badge
      const roleDesc =
        count === 3
          ? tierIdx === 2
            ? 'HIGHER'
            : tierIdx === 1
              ? 'MID'
              : 'LOWER'
          : tierLabels[tierIdx] || `TIER ${tierIdx + 1}`;

      ctx.font = '600 11px "JetBrains Mono", "SF Mono", monospace';
      ctx.fillStyle = isCurrentTier ? activeColor : 'rgba(148, 163, 184, 0.68)';
      const labelX = x0 + 14;
      const labelY = topY + 20;
      ctx.fillText(`OCTAVE ${tierIdx + 1} (${roleDesc}) • C${octaveNum}–B${octaveNum}`, labelX, labelY);

      // Preview scale notes in this octave tier
      const tierNotes = this.getLegendNotes(tierIdx, musicalState.semitoneShift);
      let pillX = labelX;
      const pillY = topY + 34;
      for (let deg = 1; deg <= 7; deg++) {
        const n = tierNotes[deg];
        if (!n) continue;
        const isTriggered =
          isCurrentTier &&
          !musicalState.isMuted &&
          musicalState.gesture?.degree === deg;

        ctx.fillStyle = isTriggered
          ? hexToRgba(n.color, 0.9)
          : hexToRgba(n.color, isCurrentTier ? 0.22 : 0.12);
        ctx.beginPath();
        ctx.roundRect(pillX, pillY - 10, 34, 15, 4);
        ctx.fill();

        ctx.font = isTriggered
          ? '700 10px "JetBrains Mono", monospace'
          : '500 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = isTriggered ? '#060911' : hexToRgba(n.color, isCurrentTier ? 0.95 : 0.65);
        ctx.fillText(`${deg}:${n.pitchClass}`, pillX + 4, pillY + 1);
        pillX += 38;
      }
    }
  }

  drawSingleNoteExpressionZone(ctx, x0, y0, w, h, musicalState, activeColor, noteSideLeft) {
    // Vertical Volume Ladder on outer edge
    const ladderW = 24;
    const ladderX = noteSideLeft ? x0 + w - ladderW - 14 : x0 + 14;
    const topY = h * 0.18;
    const botY = h * 0.82;
    const ladderH = botY - topY;

    ctx.fillStyle = 'rgba(10, 15, 28, 0.68)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ladderX, topY, ladderW, ladderH, 6);
    ctx.fill();
    ctx.stroke();

    const vol = clamp(musicalState.volume, 0, 1);
    const fillH = ladderH * vol;
    if (fillH > 1) {
      const vGrad = ctx.createLinearGradient(0, botY, 0, topY);
      vGrad.addColorStop(0, hexToRgba(activeColor, 0.4));
      vGrad.addColorStop(1, activeColor);
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.roundRect(ladderX + 3, botY - fillH + 2, ladderW - 6, Math.max(2, fillH - 4), 4);
      ctx.fill();
    }

    // Volume ladder tick marks
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
    ctx.fillText('VOL', ladderX - 1, topY - 8);
    ctx.fillText(`${Math.round(vol * 100)}%`, ladderX - 4, botY + 15);

    // Bottom X-Axis Expression Meter Bar
    const expW = w - 84;
    const expX = noteSideLeft ? x0 + 24 : x0 + 56;
    const expY = h - 32;
    const expH = 12;

    ctx.fillStyle = 'rgba(10, 15, 28, 0.7)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.beginPath();
    ctx.roundRect(expX, expY, expW, expH, 5);
    ctx.fill();
    ctx.stroke();

    const expVal = clamp(musicalState.expressionX, 0, 1);
    ctx.fillStyle = hexToRgba(activeColor, 0.85);
    ctx.beginPath();
    ctx.roundRect(expX + 2, expY + 2, Math.max(4, (expW - 4) * expVal), expH - 4, 3);
    ctx.fill();

    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.fillText(
      `X-EXPR: ${this.exprTargetLabel.toUpperCase()} (${Math.round(expVal * 100)}%)`,
      expX,
      expY - 6
    );
  }

  drawChordMatrix(ctx, x0, y0, w, h, musicalState, activeColor) {
    const colW = w / 2;
    const rowH = h / 3;
    const rootPitch = musicalState.rootNote?.pitchClass || this.scaleRoot;

    for (const quad of CHORD_QUADRANTS) {
      const qx = x0 + quad.col * colW;
      const qy = y0 + quad.row * rowH;
      const isActive =
        musicalState.activeQuadrant?.id === quad.id && musicalState.hasHands;

      const pad = 6;
      const bx = qx + pad;
      const by = qy + pad;
      const bw = colW - pad * 2;
      const bh = rowH - pad * 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      if (isActive) {
        ctx.fillStyle = hexToRgba(activeColor, 0.22);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2.2;
      } else {
        ctx.fillStyle = 'rgba(12, 18, 30, 0.46)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
      }
      ctx.fill();
      ctx.stroke();

      // Harmonic Title (e.g. MAJOR 7)
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isActive ? '#ffffff' : 'rgba(148, 163, 184, 0.78)';
      ctx.fillText(quad.title.toUpperCase(), bx + 12, by + 20);

      // Interval Formula badge
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isActive ? hexToRgba(activeColor, 0.95) : 'rgba(148, 163, 184, 0.5)';
      ctx.fillText(quad.formula, bx + 12, by + 35);

      // Dynamic Resolved Chord Name for Left Hand's current note (e.g. Dmaj7, Dm7, D, Dm, Daug, Ddim)
      const previewChordName = `${rootPitch}${quad.suffix}`;
      ctx.font = '800 26px "Inter", system-ui, sans-serif';
      ctx.fillStyle = isActive ? activeColor : 'rgba(241, 245, 249, 0.82)';
      ctx.fillText(previewChordName, bx + 12, by + bh - 16);

      ctx.restore();
    }
  }

  drawSplitDivider(ctx, midX, w, h, activeColor, noteSideLeft) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.strokeStyle = hexToRgba(activeColor, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top zone role pills on either side of X = 0.50
    const leftTitle = noteSideLeft
      ? '◄ NOTE & OCTAVE ZONE (PINKY-LED + ±30° WRIST)'
      : this.playMode === 'chords'
        ? '◄ 6-QUADRANT CHORD MATRIX (PINCH = VOL)'
        : '◄ VOLUME (Y) & EXPRESSION (X) ZONE';

    const rightTitle = noteSideLeft
      ? this.playMode === 'chords'
        ? '6-QUADRANT CHORD MATRIX (PINCH = VOL) ►'
        : 'VOLUME (Y) & EXPRESSION (X) ZONE ►'
      : 'NOTE & OCTAVE ZONE (PINKY-LED + ±30° WRIST) ►';

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(9, 13, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(12, h - 26, 290, 18, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.fillText(leftTitle, 18, h - 13);

    const rw = 290;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.78)';
    ctx.beginPath();
    ctx.roundRect(w - rw - 12, 10, rw, 18, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.fillText(rightTitle, w - rw - 6, 23);
    ctx.restore();
  }

  drawNoteHandOverlay(ctx, w, h, noteHand, musicalState, activeColor) {
    const lm = noteHand.landmarks;
    this.drawHandSkeleton(ctx, w, h, lm, activeColor);

    const cx = noteHand.x * w;
    const cy = noteHand.y * h;
    const radius = 44;

    // Circular ±30° Wrist-Roll Arc around Note Hand reticle
    ctx.save();

    // Soul Vibrato / Tremolo Acoustic Waves when shaking Note Hand in X-axis
    const shake = noteHand.shakeIntensity || 0;
    if (shake > 0.05) {
      const waveShift = (noteHand.shakeWave || 0) * 14;
      for (let ring = 1; ring <= 3; ring++) {
        const r = radius + 8 + ring * (7 + shake * 10);
        const alpha = clamp((0.55 - ring * 0.14) * shake * 1.4, 0.08, 0.85);
        ctx.strokeStyle = hexToRgba(activeColor, alpha);
        ctx.lineWidth = 2.5 - ring * 0.4;

        // Left acoustic ripple arc
        ctx.beginPath();
        ctx.arc(cx + waveShift, cy, r, Math.PI * 0.72, Math.PI * 1.28);
        ctx.stroke();

        // Right acoustic ripple arc
        ctx.beginPath();
        ctx.arc(cx + waveShift, cy, r, -Math.PI * 0.28, Math.PI * 0.28);
        ctx.stroke();
      }

      // Soul Vibrato / Tremolo intensity badge above reticle
      const vibPct = Math.round(shake * 100);
      ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(cx - 68, cy - radius - 30, 136, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = activeColor;
      ctx.textAlign = 'center';
      ctx.fillText(`〰 VIBRATO/TREM ${vibPct}%`, cx, cy - radius - 16);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Active wrist angle indicator arc
    const clampedDeg = clamp(noteHand.wristAngleDeg, -45, 45);
    const centerAngle = -Math.PI * 0.5;
    const currentAngle = centerAngle + (clampedDeg * Math.PI) / 180;

    let arcColor = activeColor;
    if (noteHand.semitoneShift === 1) arcColor = '#00d2d3'; // Cyan for Sharp #
    else if (noteHand.semitoneShift === -1) arcColor = '#ffa502'; // Amber for Flat b

    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius,
      Math.min(centerAngle, currentAngle),
      Math.max(centerAngle, currentAngle)
    );
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 5;
    ctx.stroke();

    // Reticle badge text
    const shiftText =
      noteHand.semitoneShift === 1
        ? '+1st SHARP (#)'
        : noteHand.semitoneShift === -1
          ? '-1st FLAT (b)'
          : `${Math.round(noteHand.wristAngleDeg)}° NEUTRAL`;

    const noteLabel = musicalState.isMuted
      ? 'MUTE (FIST)'
      : `${musicalState.rootNote?.fullName || ''} • ${shiftText}`;

    ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - 72, cy + radius * 0.65, 144, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 10.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(noteLabel, cx, cy + radius * 0.65 + 15);
    ctx.restore();
  }

  drawExprHandOverlay(ctx, w, h, exprHand, musicalState, activeColor) {
    const lm = exprHand.landmarks;
    this.drawHandSkeleton(ctx, w, h, lm, '#38bdf8');

    const cx = exprHand.x * w;
    const cy = exprHand.y * h;

    // Crosshair reticle
    ctx.save();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Live Pinch Caliper between Thumb Tip (4) and Index Tip (8)
    const tx = exprHand.thumbTip.x * w;
    const ty = exprHand.thumbTip.y * h;
    const ix = exprHand.indexTip.x * w;
    const iy = exprHand.indexTip.y * h;

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ix, iy);
    ctx.strokeStyle = exprHand.isPinchMuted ? '#ff4757' : '#7bed9f';
    ctx.lineWidth = 3;
    ctx.stroke();

    const midPx = (tx + ix) * 0.5;
    const midPy = (ty + iy) * 0.5;
    const pct = Math.round(musicalState.volume * 100);

    ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
    ctx.strokeStyle = exprHand.isPinchMuted ? '#ff4757' : activeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(midPx - 48, midPy - 28, 96, 20, 5);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = exprHand.isPinchMuted ? '#ff6b81' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(
      exprHand.isPinchMuted ? 'PINCH MUTE' : `GAP VOL ${pct}%`,
      midPx,
      midPy - 14
    );
    ctx.restore();
  }

  drawHandSkeleton(ctx, w, h, landmarks, strokeColor) {
    ctx.save();
    ctx.strokeStyle = hexToRgba(strokeColor, 0.72);
    ctx.lineWidth = 2.2;

    for (const [i, j] of HAND_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    const fingertips = new Set([4, 8, 12, 16, 20]);
    landmarks.forEach((pt, idx) => {
      const isTip = fingertips.has(idx);
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, isTip ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : strokeColor;
      ctx.fill();
      if (isTip) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  drawNoHandsBanner(ctx, w, h) {
    ctx.save();
    const bw = 310;
    const bh = 36;
    const bx = (w - bw) * 0.5;
    const by = h - 56;

    ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
    ctx.strokeStyle = 'rgba(255, 71, 87, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ff6b81';
    ctx.textAlign = 'center';
    ctx.fillText('🔇 NO HANDS DETECTED • SILENT', w * 0.5, by + 22);
    ctx.restore();
  }
}
