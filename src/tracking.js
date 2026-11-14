import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * 8 Discrete Gestures (7 Diatonic Scale Degrees + Closed Fist Mute)
 * Pinky-led ergonomic progression + Shaka (6th) + Horns (7th)
 */
export const GESTURE_DEFINITIONS = [
  {
    degree: 1,
    id: 'deg1',
    shortLabel: '1: Pinky',
    name: '1 Finger (Pinky)',
    digits: [0, 0, 0, 0, 1], // [Thumb, Index, Middle, Ring, Pinky]
    description: 'Pinky (20) only'
  },
  {
    degree: 2,
    id: 'deg2',
    shortLabel: '2: Pinky+Ring',
    name: '2 Fingers',
    digits: [0, 0, 0, 1, 1],
    description: 'Pinky (20) + Ring (16)'
  },
  {
    degree: 3,
    id: 'deg3',
    shortLabel: '3: P+R+Mid',
    name: '3 Fingers',
    digits: [0, 0, 1, 1, 1],
    description: 'Pinky + Ring + Middle'
  },
  {
    degree: 4,
    id: 'deg4',
    shortLabel: '4: 4-Fingers',
    name: '4 Fingers',
    digits: [0, 1, 1, 1, 1],
    description: 'Pinky + Ring + Middle + Index (Thumb tucked)'
  },
  {
    degree: 5,
    id: 'deg5',
    shortLabel: '5: Open Palm',
    name: '5 / Open Palm',
    digits: [1, 1, 1, 1, 1],
    description: 'All 5 Digits extended'
  },
  {
    degree: 6,
    id: 'deg6',
    shortLabel: '6: Shaka/Thumb',
    name: 'Thumb Out / Shaka',
    digits: [1, 0, 0, 0, 1],
    description: 'Thumb (4) extended (or Thumb + Pinky Shaka)'
  },
  {
    degree: 7,
    id: 'deg7',
    shortLabel: '7: Horns',
    name: 'Horns / Rock',
    digits: [0, 1, 0, 0, 1],
    description: 'Index (8) + Pinky (20)'
  },
  {
    degree: 0,
    id: 'mute',
    shortLabel: 'Mute: Fist',
    name: 'Closed Fist',
    digits: [0, 0, 0, 0, 0],
    description: 'All 5 digits curled tightly'
  }
];

function dist2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Aspect-corrected 2D distance (16:9 webcam stage) so horizontal thumb extension
// is measured on the same scale as vertical finger extension.
function distAspect(a, b, aspect = 16 / 9) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export class HandTrackingEngine {
  constructor() {
    this.handLandmarker = null;
    this.isReady = false;
    this.isLoading = false;
    this.loadError = null;

    // EMA smoothing factor (alpha = 0.35 per PRD)
    this.emaAlpha = 0.35;
    this.smoothedSlots = {
      note: null,
      expr: null
    };

    // Hand swap: false = Left side is Note/Octave, Right side is Volume/Chords
    // true = Left-Handed Musician Mode (Left side is Volume/Chords, Right side is Note/Octave)
    this.swapHands = false;

    // 2-Frame Hysteresis Debounce state for Note Hand gesture classification
    this.committedGesture = GESTURE_DEFINITIONS[0]; // Default 1st degree when active
    this.candidateGestureId = 'deg1';
    this.candidateFrameCount = 0;
    this.debounceFramesRequired = 2;

    // Wrist-roll hysteresis state (-1 = Flat, 0 = Natural, +1 = Sharp)
    this.committedSemitoneShift = 0;
    this.smoothedWristAngle = 0;

    // Left-Hand (Note Hand) X-Axis Shake Vibrato / Tremolo detector state
    this.shakeState = {
      prevX: null,
      baselineX: null,
      prevTimeMs: 0,
      intensity: 0, // 0..1 smoothed shake envelope
      wave: 0       // -1..+1 live horizontal oscillation wave
    };

    // Mouse / Keyboard Simulation State
    this.mouseState = {
      active: false,
      noteX: 0.25,
      noteY: 0.50,
      exprX: 0.72,
      exprY: 0.28,
      gestureDegree: 1, // 1..7 or 0 for fist mute
      wristAngleDeg: 0, // -30, 0, +30
      pinchGap: 0.18,   // Open pinch by default
      pointerSide: 'note'
    };
  }

  async init() {
    if (this.isReady || this.isLoading) return this.isReady;
    this.isLoading = true;
    this.loadError = null;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55
        });
      } catch (_gpuErr) {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55
        });
      }

      this.isReady = true;
      this.isLoading = false;
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe HandLandmarker:', err);
      this.loadError = err?.message || 'MediaPipe initialization failed';
      this.isLoading = false;
      return false;
    }
  }

  setSwapHands(swapped) {
    this.swapHands = Boolean(swapped);
    // Reset smoothed slots when swapping sides
    this.smoothedSlots.note = null;
    this.smoothedSlots.expr = null;
  }

  /**
   * Apply Exponential Moving Average (EMA) smoothing to 21 landmarks
   */
  smoothLandmarks(slotKey, rawMirroredLandmarks) {
    const prev = this.smoothedSlots[slotKey];
    const alpha = this.emaAlpha;
    if (!prev || prev.length !== rawMirroredLandmarks.length) {
      const cloned = rawMirroredLandmarks.map((pt) => ({ x: pt.x, y: pt.y, z: pt.z || 0 }));
      this.smoothedSlots[slotKey] = cloned;
      return cloned;
    }
    const next = rawMirroredLandmarks.map((pt, idx) => ({
      x: prev[idx].x + alpha * (pt.x - prev[idx].x),
      y: prev[idx].y + alpha * (pt.y - prev[idx].y),
      z: (prev[idx].z || 0) + alpha * ((pt.z || 0) - (prev[idx].z || 0))
    }));
    this.smoothedSlots[slotKey] = next;
    return next;
  }

  /**
   * Compute centered "cover" crop parameters so a video of (videoWidth x videoHeight)
   * renders into a stage of (stageWidth x stageHeight) with zero aspect-ratio squash.
   */
  getVideoCoverTransform(videoEl, stageWidth, stageHeight) {
    const vw = videoEl?.videoWidth || 1280;
    const vh = videoEl?.videoHeight || 720;
    const sw = stageWidth || 1280;
    const sh = stageHeight || 540;
    const videoAspect = vw / vh;
    const stageAspect = sw / sh;

    if (stageAspect > videoAspect) {
      const visH = videoAspect / stageAspect;
      return {
        videoAspect,
        stageAspect,
        cropX: 0,
        cropY: (1 - visH) * 0.5,
        visW: 1,
        visH
      };
    }

    const visW = stageAspect / videoAspect;
    return {
      videoAspect,
      stageAspect,
      cropX: (1 - visW) * 0.5,
      cropY: 0,
      visW,
      visH: 1
    };
  }

  projectLandmarkToStage(pt, cover) {
    return {
      x: (pt.x - cover.cropX) / cover.visW,
      y: (pt.y - cover.cropY) / cover.visH,
      z: pt.z || 0
    };
  }

  /**
   * Normalize finger extension states against palmSize = distAspect(Landmark 0 [Wrist], Landmark 9 [Middle MCP])
   * and classify into the 8 Pinky-Led Gesture definitions.
   */
  classifyPinkyLedGesture(lm, aspect = 16 / 9) {
    const wrist = lm[0];
    const middleMcp = lm[9];
    const palmSize = Math.max(0.04, distAspect(wrist, middleMcp, aspect));

    // Helper for Index (8,6,5), Middle (12,10,9), Ring (16,14,13), Pinky (20,18,17)
    const isFingerExtended = (tipIdx, pipIdx, mcpIdx, ratioBias = 1.0) => {
      const tipToWrist = distAspect(lm[tipIdx], wrist, aspect);
      const pipToWrist = distAspect(lm[pipIdx], wrist, aspect);
      const mcpToWrist = distAspect(lm[mcpIdx], wrist, aspect);
      const tipToMcp = distAspect(lm[tipIdx], lm[mcpIdx], aspect);

      return (
        tipToWrist > pipToWrist + 0.08 * palmSize * ratioBias &&
        tipToWrist > mcpToWrist + 0.32 * palmSize * ratioBias &&
        tipToMcp > 0.48 * palmSize * ratioBias
      );
    };

    const indexExt = isFingerExtended(8, 6, 5, 1.0);
    const middleExt = isFingerExtended(12, 10, 9, 1.0);
    const ringExt = isFingerExtended(16, 14, 13, 0.96);
    const pinkyExt = isFingerExtended(20, 18, 17, 0.88);

    // Aspect-corrected thumb geometry relative to palm landmarks:
    // Previously, raw dist2D compressed horizontal X distances by 9/16 (0.5625) on a 16:9 webcam,
    // causing an open 5-finger hand's thumb to fail the threshold and register as 4 Fingers.
    const tipToIndexMcp = distAspect(lm[4], lm[5], aspect) / palmSize;
    const tipToMiddleMcp = distAspect(lm[4], lm[9], aspect) / palmSize;
    const mcpToMiddleMcp = distAspect(lm[2], lm[9], aspect) / palmSize;
    const tipToRingMcp = distAspect(lm[4], lm[13], aspect) / palmSize;
    const mcpToRingMcp = distAspect(lm[2], lm[13], aspect) / palmSize;
    const tipToPinkyMcp = distAspect(lm[4], lm[17], aspect) / palmSize;
    const ipToPinkyMcp = distAspect(lm[3], lm[17], aspect) / palmSize;
    const mcpToPinkyMcp = distAspect(lm[2], lm[17], aspect) / palmSize;
    const thumbTipToMcp = distAspect(lm[4], lm[2], aspect) / palmSize;

    // Open-palm thumb check (5 Fingers vs 4 Fingers with thumb tucked across palm):
    // When the thumb is tucked across the palm for 4 Fingers, tip (4) moves inward toward
    // Middle MCP (9) and Ring MCP (13) and closer to Pinky MCP (17) than IP (3) / MCP (2).
    const thumbOpenForPalm =
      tipToPinkyMcp > ipToPinkyMcp * 0.98 &&
      tipToPinkyMcp > mcpToPinkyMcp * 1.03 &&
      tipToRingMcp > mcpToRingMcp * 0.94 &&
      tipToMiddleMcp > Math.min(0.42, mcpToMiddleMcp * 0.95) &&
      tipToIndexMcp > 0.28 &&
      thumbTipToMcp > 0.26;

    // Strict thumb abduction check for Gesture 6 (Thumb Out / Shaka) vs Gesture 1 (Pinky Only) / Fist:
    const thumbAbductedForShaka =
      tipToIndexMcp > 0.45 &&
      tipToMiddleMcp > 0.54 &&
      tipToPinkyMcp > mcpToPinkyMcp * 1.12 &&
      thumbTipToMcp > 0.30;

    const allFourFingersUp = indexExt && middleExt && ringExt && pinkyExt;
    const thumbExtended = allFourFingersUp ? thumbOpenForPalm : thumbAbductedForShaka;

    let rawMatch = null;

    // 1. Check Closed Fist (Mute / Rest): All 5 digits curled
    if (!indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExtended) {
      rawMatch = GESTURE_DEFINITIONS[7]; // Mute: Fist
    }
    // 2. Check Gesture 6 (Thumb Out / Shaka): Thumb clearly extended, Index + Middle + Ring curled
    else if (thumbExtended && !indexExt && !middleExt && !ringExt) {
      rawMatch = GESTURE_DEFINITIONS[5]; // 6th: Thumb Out / Shaka (with or without pinky)
    }
    // 3. Check Gesture 7 (Horns / Rock): Index + Pinky extended, Middle + Ring curled
    else if (indexExt && pinkyExt && !middleExt && !ringExt) {
      rawMatch = GESTURE_DEFINITIONS[6]; // 7th: Horns / Rock
    }
    // 4. Check Gesture 5 (5 / Open Palm): All 5 digits extended
    else if (indexExt && middleExt && ringExt && pinkyExt && thumbExtended) {
      rawMatch = GESTURE_DEFINITIONS[4]; // 5th: Open Palm
    }
    // 5. Check Gesture 4 (4 Fingers): Index + Middle + Ring + Pinky extended, Thumb tucked
    else if (indexExt && middleExt && ringExt && pinkyExt && !thumbExtended) {
      rawMatch = GESTURE_DEFINITIONS[3]; // 4th: 4 Fingers
    }
    // 6. Check Gesture 3 (3 Fingers): Pinky + Ring + Middle extended, Index curled
    else if (!indexExt && middleExt && ringExt && pinkyExt) {
      rawMatch = GESTURE_DEFINITIONS[2]; // 3rd: 3 Fingers
    }
    // 7. Check Gesture 2 (2 Fingers): Pinky + Ring extended, Middle + Index curled
    else if (!indexExt && !middleExt && ringExt && pinkyExt) {
      rawMatch = GESTURE_DEFINITIONS[1]; // 2nd: 2 Fingers
    }
    // 8. Check Gesture 1 (1 Finger - Pinky Only): Pinky extended, Thumb/Index/Middle/Ring curled
    else if (!indexExt && !middleExt && !ringExt && pinkyExt && !thumbExtended) {
      rawMatch = GESTURE_DEFINITIONS[0]; // 1st: Pinky Only
    } else {
      // Fallback heuristic based on extended count to prevent dropouts on anatomical variance
      const extCount =
        (indexExt ? 1 : 0) +
        (middleExt ? 1 : 0) +
        (ringExt ? 1 : 0) +
        (pinkyExt ? 1 : 0) +
        (thumbExtended ? 1 : 0);
      if (extCount === 0) {
        rawMatch = GESTURE_DEFINITIONS[7];
      } else if (extCount === 5) {
        rawMatch = GESTURE_DEFINITIONS[4];
      } else if (extCount === 4) {
        rawMatch = GESTURE_DEFINITIONS[3];
      } else if (extCount === 3) {
        rawMatch = GESTURE_DEFINITIONS[2];
      } else if (extCount === 2) {
        rawMatch = indexExt && pinkyExt ? GESTURE_DEFINITIONS[6] : GESTURE_DEFINITIONS[1];
      } else {
        rawMatch = thumbExtended ? GESTURE_DEFINITIONS[5] : GESTURE_DEFINITIONS[0];
      }
    }

    // 2-Frame Hysteresis Debounce
    if (rawMatch.id === this.candidateGestureId) {
      this.candidateFrameCount++;
    } else {
      this.candidateGestureId = rawMatch.id;
      this.candidateFrameCount = 1;
    }

    if (this.candidateFrameCount >= this.debounceFramesRequired) {
      this.committedGesture = rawMatch;
    }

    return {
      gesture: this.committedGesture,
      rawGesture: rawMatch,
      digits: [
        thumbExtended ? 1 : 0,
        indexExt ? 1 : 0,
        middleExt ? 1 : 0,
        ringExt ? 1 : 0,
        pinkyExt ? 1 : 0
      ],
      palmSize
    };
  }

  /**
   * Compute Wrist-Roll Angle in degrees and Semitone Inflection (±30° Sharp / Flat)
   * Neutral Zone: -20° to +20° -> 0 semitones
   * Rotate +30° (Clockwise): +1 Semitone (Sharp #)
   * Rotate -30° (Counter-Clockwise): -1 Semitone (Flat b)
   */
  computeWristRoll(lm) {
    const wrist = lm[0];
    const middleMcp = lm[9];
    const indexMcp = lm[5];
    const pinkyMcp = lm[17];

    // Primary orientation vector: Wrist (0) -> Middle MCP (9) relative to vertical upward (0, -1)
    const dxVert = middleMcp.x - wrist.x;
    const dyVert = middleMcp.y - wrist.y;
    const verticalAngleDeg = Math.atan2(dxVert, -dyVert) * (180 / Math.PI);

    // Secondary palm knuckle axis: Index MCP (5) -> Pinky MCP (17)
    const dxKnuckle = pinkyMcp.x - indexMcp.x;
    const dyKnuckle = pinkyMcp.y - indexMcp.y;
    let knuckleTiltDeg = Math.atan2(dyKnuckle, Math.abs(dxKnuckle) + 0.001) * (180 / Math.PI);
    if (dxKnuckle < 0) knuckleTiltDeg = -knuckleTiltDeg;

    const rawAngle = clamp(verticalAngleDeg * 0.78 + knuckleTiltDeg * 0.22, -60, 60);
    this.smoothedWristAngle =
      this.smoothedWristAngle + 0.38 * (rawAngle - this.smoothedWristAngle);

    const deg = this.smoothedWristAngle;

    // Slight extra deadzone margin during active X-shake vibrato so horizontal hand shaking
    // never triggers an unintended sharp/flat step unless the wrist deliberately rotates.
    const engageDeg = this.shakeState.intensity > 0.22 ? 31 : 25;

    // Hysteresis around ±20° neutral zone and ±engageDeg activation threshold
    if (this.committedSemitoneShift === 0) {
      if (deg >= engageDeg) this.committedSemitoneShift = 1;
      else if (deg <= -engageDeg) this.committedSemitoneShift = -1;
    } else if (this.committedSemitoneShift === 1) {
      if (deg < 20) this.committedSemitoneShift = deg <= -engageDeg ? -1 : 0;
    } else if (this.committedSemitoneShift === -1) {
      if (deg > -20) this.committedSemitoneShift = deg >= engageDeg ? 1 : 0;
    }

    // Smooth continuous pitch bend value: 0 inside [-20°, +20°], ramping to ±1 semitone at ±36°
    let continuousBend = 0;
    if (Math.abs(deg) > 20) {
      const sign = Math.sign(deg);
      continuousBend = sign * clamp((Math.abs(deg) - 20) / 16, 0, 1);
    }

    return {
      angleDeg: deg,
      semitoneShift: this.committedSemitoneShift,
      continuousBend
    };
  }

  /**
   * Compute Note-Hand X-Axis Shake Intensity (0..1) and Live Oscillation Wave (-1..+1)
   * Shaking the Note Hand (Left Hand by default) horizontally along the X-axis produces
   * expressive violin/theremin-style pitch vibrato + stereo amplitude tremolo.
   */
  computeNoteHandXShake(x, timestampMs = performance.now()) {
    const st = this.shakeState;
    if (st.prevX === null || st.baselineX === null) {
      st.prevX = x;
      st.baselineX = x;
      st.prevTimeMs = timestampMs;
      return { intensity: 0, wave: 0 };
    }

    const dt = clamp((timestampMs - st.prevTimeMs) / 1000, 0.006, 0.12);
    st.prevTimeMs = timestampMs;

    // Slow-moving horizontal center baseline (EMA alpha = 0.08)
    st.baselineX = st.baselineX + 0.08 * (x - st.baselineX);

    // High-pass horizontal excursion from resting hand center
    const offsetX = x - st.baselineX;
    // Instantaneous horizontal velocity (screen widths / sec)
    const velX = (x - st.prevX) / dt;
    st.prevX = x;

    // Deadzone so holding steady or drifting slowly produces 0 shake
    const activeSpeed = Math.max(0, Math.abs(velX) - 0.12);
    const activeExcursion = Math.max(0, Math.abs(offsetX) - 0.004);
    const rawEnergy = clamp(activeSpeed * 1.45 + activeExcursion * 14, 0, 1);

    // Fast attack (0.35) on shake onset, smooth musical release (0.09) when settling
    const rate = rawEnergy > st.intensity ? 0.35 : 0.09;
    st.intensity = clamp(st.intensity + rate * (rawEnergy - st.intensity), 0, 1);
    if (st.intensity < 0.015) st.intensity = 0;

    // Live phase-locked oscillation wave (-1..+1) scaled by shake envelope
    st.wave = clamp(offsetX / 0.032, -1, 1) * st.intensity;

    return {
      intensity: st.intensity,
      wave: st.wave
    };
  }

  /**
   * Compute Pinch Aperture between Thumb Tip (4) and Index Tip (8) on Right / Expression Hand
   * Closed Pinch (<= 0.038) -> 0% clean mute (5ms gate)
   * Open Pinch (>= 0.165) -> 100% volume
   */
  computePinchAperture(lm) {
    const rawGap = dist2D(lm[4], lm[8]);
    const minClosed = 0.038;
    const maxOpen = 0.165;
    const normalized = clamp((rawGap - minClosed) / (maxOpen - minClosed), 0, 1);
    // Smooth S-curve for musical swell
    const curvedVolume = normalized * normalized * (3 - 2 * normalized);

    // Check if expression hand is a closed fist (for staccato mute in Single-Note Mode)
    const wrist = lm[0];
    const palmSize = Math.max(0.04, dist2D(wrist, lm[9]));
    const indexTipDist = dist2D(lm[8], wrist) / palmSize;
    const middleTipDist = dist2D(lm[12], wrist) / palmSize;
    const isFist = indexTipDist < 1.15 && middleTipDist < 1.15 && rawGap < 0.075;

    return {
      rawGap,
      normalizedAperture: curvedVolume,
      isPinchMuted: rawGap <= minClosed || isFist
    };
  }

  /**
   * Process a video frame from HTMLVideoElement and return unified dual-hand telemetry
   */
  detectVideoFrame(videoEl, timestampMs, stageWidth = 1280, stageHeight = 540) {
    if (!this.isReady || !this.handLandmarker || !videoEl || videoEl.readyState < 2) {
      return this.createEmptyFrameResult();
    }

    const cover = this.getVideoCoverTransform(videoEl, stageWidth, stageHeight);
    const results = this.handLandmarker.detectForVideo(videoEl, timestampMs);
    const landmarksList = results?.landmarks || [];

    if (landmarksList.length === 0) {
      this.smoothedSlots.note = null;
      this.smoothedSlots.expr = null;
      return this.createEmptyFrameResult();
    }

    // Mirror X coordinates so the webcam behaves like a natural mirror
    const mirroredHands = landmarksList.map((lm) =>
      lm.map((pt) => ({
        x: 1 - pt.x,
        y: pt.y,
        z: pt.z || 0
      }))
    );

    // Assign hands to Note side vs Expression/Chords side based on stage X = 0.50 split
    // Standard (swapHands = false): Note Side is Left (x < 0.50), Expression Side is Right (x >= 0.50)
    // Left-Handed (swapHands = true): Expression Side is Left (x < 0.50), Note Side is Right (x >= 0.50)
    let rawNoteHand = null;
    let rawExprHand = null;

    const isInNoteZone = (x) => (this.swapHands ? x >= 0.5 : x < 0.5);

    if (mirroredHands.length === 1) {
      const stageAnchorX = this.projectLandmarkToStage(mirroredHands[0][9], cover).x;
      if (isInNoteZone(stageAnchorX)) {
        rawNoteHand = mirroredHands[0];
      } else {
        rawExprHand = mirroredHands[0];
      }
    } else if (mirroredHands.length >= 2) {
      // Sort by X coordinate from left to right
      const sorted = [...mirroredHands].sort((a, b) => a[9].x - b[9].x);
      if (!this.swapHands) {
        rawNoteHand = sorted[0];
        rawExprHand = sorted[1];
      } else {
        rawExprHand = sorted[0];
        rawNoteHand = sorted[1];
      }
    }

    let noteTelemetry = null;
    let exprTelemetry = null;

    if (rawNoteHand) {
      const smoothedNote = this.smoothLandmarks('note', rawNoteHand);
      const gestureInfo = this.classifyPinkyLedGesture(smoothedNote, cover.videoAspect);
      const wristInfo = this.computeWristRoll(smoothedNote);
      const stageLandmarks = smoothedNote.map((pt) => this.projectLandmarkToStage(pt, cover));
      const anchor = stageLandmarks[9]; // Middle MCP anchor in stage coordinates
      const shakeInfo = this.computeNoteHandXShake(anchor.x, timestampMs);

      noteTelemetry = {
        present: true,
        landmarks: stageLandmarks,
        x: anchor.x,
        y: anchor.y,
        gesture: gestureInfo.gesture,
        rawGesture: gestureInfo.rawGesture,
        digits: gestureInfo.digits,
        wristAngleDeg: wristInfo.angleDeg,
        semitoneShift: wristInfo.semitoneShift,
        continuousBend: wristInfo.continuousBend,
        shakeIntensity: shakeInfo.intensity,
        shakeWave: shakeInfo.wave
      };
    } else {
      this.smoothedSlots.note = null;
      this.shakeState.prevX = null;
      this.shakeState.baselineX = null;
      this.shakeState.intensity = 0;
      this.shakeState.wave = 0;
    }

    if (rawExprHand) {
      const smoothedExpr = this.smoothLandmarks('expr', rawExprHand);
      const pinchInfo = this.computePinchAperture(smoothedExpr);
      const stageLandmarks = smoothedExpr.map((pt) => this.projectLandmarkToStage(pt, cover));
      const anchor = stageLandmarks[9]; // Middle MCP anchor in stage coordinates

      // Normalize X within the Expression half (0.0 to 1.0)
      const exprHalfX = this.swapHands
        ? clamp(anchor.x / 0.5, 0, 1)
        : clamp((anchor.x - 0.5) / 0.5, 0, 1);

      // Single-Note Y-axis volume: 0% at y = 0.82 to 100% at y = 0.18
      const yVolume = clamp((0.82 - anchor.y) / (0.82 - 0.18), 0, 1);

      exprTelemetry = {
        present: true,
        landmarks: stageLandmarks,
        x: anchor.x,
        y: anchor.y,
        localX: exprHalfX,
        yVolume: pinchInfo.isPinchMuted ? 0 : yVolume,
        pinchGap: pinchInfo.rawGap,
        pinchVolume: pinchInfo.isPinchMuted ? 0 : pinchInfo.normalizedAperture,
        isPinchMuted: pinchInfo.isPinchMuted,
        thumbTip: stageLandmarks[4],
        indexTip: stageLandmarks[8]
      };
    } else {
      this.smoothedSlots.expr = null;
    }

    return {
      handsDetected: landmarksList.length,
      noteHand: noteTelemetry,
      exprHand: exprTelemetry,
      swapHands: this.swapHands,
      isMouseSim: false
    };
  }

  /**
   * Generate synthetic hand landmarks for Mouse / Keyboard Simulation Mode so all HUD reticles,
   * skeletal wireframes, pinch calipers, and wrist-roll protractors render identically.
   */
  getMouseSimulationFrame() {
    if (!this.mouseState.active) {
      return this.createEmptyFrameResult();
    }

    const gestureObj =
      GESTURE_DEFINITIONS.find((g) => g.degree === this.mouseState.gestureDegree) ||
      GESTURE_DEFINITIONS[0];

    const deg = this.mouseState.wristAngleDeg;
    const semitoneShift = deg >= 25 ? 1 : deg <= -25 ? -1 : 0;
    const continuousBend =
      Math.abs(deg) > 20 ? Math.sign(deg) * clamp((Math.abs(deg) - 20) / 16, 0, 1) : 0;

    // Ensure Note Hand and Expression Hand coordinates respect swapHands
    const noteX = this.swapHands
      ? clamp(Math.max(0.55, this.mouseState.noteX), 0.52, 0.96)
      : clamp(Math.min(0.45, this.mouseState.noteX), 0.04, 0.48);

    const exprX = this.swapHands
      ? clamp(Math.min(0.45, this.mouseState.exprX), 0.04, 0.48)
      : clamp(Math.max(0.55, this.mouseState.exprX), 0.52, 0.96);

    const noteY = clamp(this.mouseState.noteY, 0.06, 0.94);
    const exprY = clamp(this.mouseState.exprY, 0.06, 0.94);

    const synthNoteLandmarks = this.buildSyntheticHandLandmarks(
      noteX,
      noteY,
      gestureObj.digits,
      deg
    );
    const synthExprLandmarks = this.buildSyntheticExprLandmarks(
      exprX,
      exprY,
      this.mouseState.pinchGap
    );

    const exprHalfX = this.swapHands
      ? clamp(exprX / 0.5, 0, 1)
      : clamp((exprX - 0.5) / 0.5, 0, 1);

    const minClosed = 0.038;
    const maxOpen = 0.165;
    const pinchNorm = clamp((this.mouseState.pinchGap - minClosed) / (maxOpen - minClosed), 0, 1);
    const isMuted = gestureObj.degree === 0 || this.mouseState.pinchGap <= minClosed;
    const yVolume = clamp((0.82 - exprY) / (0.82 - 0.18), 0, 1);

    const shakeInfo = this.computeNoteHandXShake(noteX, performance.now());

    return {
      handsDetected: 2,
      swapHands: this.swapHands,
      isMouseSim: true,
      noteHand: {
        present: true,
        landmarks: synthNoteLandmarks,
        x: noteX,
        y: noteY,
        gesture: gestureObj,
        rawGesture: gestureObj,
        digits: gestureObj.digits,
        wristAngleDeg: deg,
        semitoneShift,
        continuousBend,
        shakeIntensity: shakeInfo.intensity,
        shakeWave: shakeInfo.wave
      },
      exprHand: {
        present: true,
        landmarks: synthExprLandmarks,
        x: exprX,
        y: exprY,
        localX: exprHalfX,
        yVolume: isMuted ? 0 : yVolume,
        pinchGap: this.mouseState.pinchGap,
        pinchVolume: isMuted ? 0 : pinchNorm,
        isPinchMuted: this.mouseState.pinchGap <= minClosed,
        thumbTip: synthExprLandmarks[4],
        indexTip: synthExprLandmarks[8]
      }
    };
  }

  buildSyntheticHandLandmarks(cx, cy, digits, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rot = (dx, dy) => ({
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
      z: 0
    });

    const pts = new Array(21).fill(null).map(() => ({ x: cx, y: cy, z: 0 }));
    pts[0] = rot(0, 0.085); // Wrist
    pts[1] = rot(-0.025, 0.055);
    pts[2] = rot(-0.042, 0.025);
    pts[3] = digits[0] ? rot(-0.062, -0.005) : rot(-0.025, 0.015);
    pts[4] = digits[0] ? rot(-0.082, -0.032) : rot(-0.012, 0.022); // Thumb tip

    const fingerConfigs = [
      { mcp: 5, pip: 6, dip: 7, tip: 8, xOff: -0.028, ext: digits[1] },
      { mcp: 9, pip: 10, dip: 11, tip: 12, xOff: -0.008, ext: digits[2] },
      { mcp: 13, pip: 14, dip: 15, tip: 16, xOff: 0.012, ext: digits[3] },
      { mcp: 17, pip: 18, dip: 19, tip: 20, xOff: 0.032, ext: digits[4] }
    ];

    for (const f of fingerConfigs) {
      pts[f.mcp] = rot(f.xOff, 0);
      if (f.ext) {
        pts[f.pip] = rot(f.xOff * 1.1, -0.032);
        pts[f.dip] = rot(f.xOff * 1.18, -0.058);
        pts[f.tip] = rot(f.xOff * 1.25, -0.084);
      } else {
        pts[f.pip] = rot(f.xOff, -0.014);
        pts[f.dip] = rot(f.xOff * 0.9, 0.008);
        pts[f.tip] = rot(f.xOff * 0.85, 0.024);
      }
    }
    return pts;
  }

  buildSyntheticExprLandmarks(cx, cy, pinchGap) {
    const halfGap = pinchGap * 0.5;
    const pts = this.buildSyntheticHandLandmarks(cx, cy, [1, 1, 1, 1, 1], 0);
    pts[4] = { x: cx - halfGap * 0.65, y: cy + halfGap * 0.5, z: 0 };
    pts[8] = { x: cx + halfGap * 0.65, y: cy - halfGap * 0.5, z: 0 };
    return pts;
  }

  createEmptyFrameResult() {
    return {
      handsDetected: 0,
      noteHand: null,
      exprHand: null,
      swapHands: this.swapHands,
      isMouseSim: false
    };
  }
}
