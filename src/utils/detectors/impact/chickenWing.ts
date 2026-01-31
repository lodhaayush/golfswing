import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { calculateAngle3D } from '@/utils/angleCalculations'
import { logger } from '@/utils/debugLogger'

/**
 * CHICKEN_WING detector
 * Detects when the lead elbow bends outward through impact
 *
 * Detection methods vary by camera angle:
 *
 * Face-on: Measure lead elbow angle directly
 * - Chicken wing = elbow angle < 140° through impact
 *
 * DTL: Track wrist vs elbow emergence from behind body
 * - Good swing: wrist emerges before elbow (wrist leads toward target)
 * - Chicken wing: elbow emerges before wrist (elbow sticking out)
 * - Uses visibility scores to detect when landmarks become visible
 */
export const detectChickenWing: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { phaseSegments, isRightHanded, cameraAngle } = input

  // Get impact and follow-through phases
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')
  const followThroughPhase = getPhaseFrameIndices(phaseSegments, 'follow-through')

  if (!impactPhase) {
    return createNotDetectedResult('CHICKEN_WING', 'Impact phase not detected')
  }

  // Determine lead arm landmarks based on handedness
  const elbowIdx = isRightHanded ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
  const wristIdx = isRightHanded ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST

  // Use different detection methods based on camera angle
  if (cameraAngle === 'dtl') {
    return detectChickenWingDTL(input, impactPhase, followThroughPhase, elbowIdx, wristIdx)
  } else {
    return detectChickenWingFaceOn(input, impactPhase, followThroughPhase, elbowIdx, wristIdx)
  }
}

/**
 * DTL detection: Track wrist vs elbow emergence and position
 *
 * In DTL view, the lead arm is initially occluded by the body.
 * As the golfer rotates through impact:
 * - Good swing: wrist emerges first, stays ahead of elbow toward target
 * - Chicken wing: elbow sticks out, emerges first or leads toward target
 */
function detectChickenWingDTL(
  input: DetectorInput,
  impactPhase: { startFrame: number; endFrame: number },
  followThroughPhase: { startFrame: number; endFrame: number } | null,
  elbowIdx: number,
  wristIdx: number
): DetectorResult {
  const { frames, isRightHanded } = input

  // Visibility threshold - landmark is considered "visible" above this
  const VISIBILITY_THRESHOLD = 0.7

  // Sample from just before impact through early follow-through
  const sampleStart = Math.max(0, impactPhase.startFrame - 3)
  const sampleEnd = followThroughPhase
    ? Math.min(followThroughPhase.startFrame + 10, frames.length - 1)
    : Math.min(impactPhase.endFrame + 10, frames.length - 1)

  // Track emergence - first frame where visibility exceeds threshold
  let wristEmergenceFrame: number | null = null
  let elbowEmergenceFrame: number | null = null

  // Track position once both visible
  let wristLeadDistances: number[] = []
  let bothVisibleFrames: number[] = []

  // Per-frame visibility data for debugging
  const frameVisibilityData: Array<{
    frame: number
    elbowVis: number
    wristVis: number
    elbowX: number
    wristX: number
    visibilityDiff: number
  }> = []

  for (let i = sampleStart; i <= sampleEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const elbow = landmarks[elbowIdx]
    const wrist = landmarks[wristIdx]

    if (!elbow || !wrist) continue

    const elbowVis = elbow.visibility ?? 0
    const wristVis = wrist.visibility ?? 0
    const elbowVisible = elbowVis >= VISIBILITY_THRESHOLD
    const wristVisible = wristVis >= VISIBILITY_THRESHOLD

    // Log per-frame visibility data
    frameVisibilityData.push({
      frame: i,
      elbowVis: parseFloat(elbowVis.toFixed(3)),
      wristVis: parseFloat(wristVis.toFixed(3)),
      elbowX: parseFloat(elbow.x.toFixed(3)),
      wristX: parseFloat(wrist.x.toFixed(3)),
      visibilityDiff: parseFloat((elbowVis - wristVis).toFixed(3)),
    })

    // Track first emergence
    if (wristVisible && wristEmergenceFrame === null) {
      wristEmergenceFrame = i
    }
    if (elbowVisible && elbowEmergenceFrame === null) {
      elbowEmergenceFrame = i
    }

    // Once both are visible, compare X positions
    if (elbowVisible && wristVisible) {
      bothVisibleFrames.push(i)

      // For right-hander in DTL: target is LEFT (lower X)
      // wristLeadDistance > 0 means wrist is more toward target (good)
      // For left-hander: target is RIGHT (higher X), so we flip the sign
      const leadDistance = isRightHanded
        ? elbow.x - wrist.x  // Positive = wrist has lower X = wrist leads toward target (left)
        : wrist.x - elbow.x  // Positive = wrist has higher X = wrist leads toward target (right)

      wristLeadDistances.push(leadDistance)
    }
  }

  // Log per-frame visibility data
  logger.info('CHICKEN_WING DTL Per-Frame Visibility:', frameVisibilityData)

  // NEW SIGNAL: Look for frames where elbow is significantly more visible than wrist
  // This indicates elbow is sticking out while wrist is still occluded (chicken wing pattern)
  const VISIBILITY_DIFF_THRESHOLD = 0.15  // Elbow must be 15% more visible than wrist
  const elbowMoreVisibleFrames = frameVisibilityData.filter(f =>
    f.elbowVis >= VISIBILITY_THRESHOLD && f.visibilityDiff >= VISIBILITY_DIFF_THRESHOLD
  )

  // Also check for frames where elbow is visible but wrist is NOT visible
  const elbowOnlyVisibleFrames = frameVisibilityData.filter(f =>
    f.elbowVis >= VISIBILITY_THRESHOLD && f.wristVis < VISIBILITY_THRESHOLD
  )

  // Analyze results
  const wristEmergedFirst = wristEmergenceFrame !== null && elbowEmergenceFrame !== null
    && wristEmergenceFrame < elbowEmergenceFrame
  const elbowEmergedFirst = wristEmergenceFrame !== null && elbowEmergenceFrame !== null
    && elbowEmergenceFrame < wristEmergenceFrame
  const simultaneousEmergence = wristEmergenceFrame !== null && elbowEmergenceFrame !== null
    && wristEmergenceFrame === elbowEmergenceFrame

  // Calculate average wrist lead distance once both visible
  const avgWristLeadDistance = wristLeadDistances.length > 0
    ? wristLeadDistances.reduce((a, b) => a + b, 0) / wristLeadDistances.length
    : 0

  // Determine emergence order string for logging
  let emergenceOrder: string
  if (wristEmergedFirst) {
    emergenceOrder = 'wrist_first'
  } else if (elbowEmergedFirst) {
    emergenceOrder = 'elbow_first'
  } else if (simultaneousEmergence) {
    emergenceOrder = 'simultaneous'
  } else {
    emergenceOrder = 'unknown'
  }

  logger.info('CHICKEN_WING DTL Debug:', {
    cameraAngle: 'dtl',
    isRightHanded,
    wristEmergenceFrame,
    elbowEmergenceFrame,
    emergenceOrder,
    bothVisibleFramesCount: bothVisibleFrames.length,
    avgWristLeadDistance: avgWristLeadDistance.toFixed(3),
    sampleRange: `${sampleStart}-${sampleEnd}`,
    elbowMoreVisibleFramesCount: elbowMoreVisibleFrames.length,
    elbowOnlyVisibleFramesCount: elbowOnlyVisibleFrames.length,
  })

  // Detection logic with multiple signals:
  //
  // SIGNAL 1: Elbow-only visible frames - elbow visible but wrist NOT visible
  //           This is the strongest signal - directly matches user's observation
  //
  // SIGNAL 2: Elbow more visible than wrist (visibility differential)
  //           Elbow is significantly more visible than wrist
  //
  // SIGNAL 3: X-position based - elbow is leading (ahead of wrist toward target)
  //           Once both visible, elbow X is toward target more than wrist
  //
  // Any of these signals can trigger detection

  const hasElbowOnlyFrames = elbowOnlyVisibleFrames.length >= 2
  const hasSignificantVisibilityDiff = elbowMoreVisibleFrames.length >= 3
  const elbowLeading = avgWristLeadDistance <= 0 && bothVisibleFrames.length >= 3

  const chickenWingDetected = hasElbowOnlyFrames || hasSignificantVisibilityDiff || elbowLeading

  // Determine which signal(s) triggered detection
  const triggeredSignals: string[] = []
  if (hasElbowOnlyFrames) triggeredSignals.push(`elbow_only_visible(${elbowOnlyVisibleFrames.length} frames)`)
  if (hasSignificantVisibilityDiff) triggeredSignals.push(`visibility_diff(${elbowMoreVisibleFrames.length} frames)`)
  if (elbowLeading) triggeredSignals.push(`elbow_leading(${avgWristLeadDistance.toFixed(3)})`)

  // Log the decision
  logger.info('CHICKEN_WING DTL Decision:', {
    hasElbowOnlyFrames,
    hasSignificantVisibilityDiff,
    elbowLeading,
    chickenWingDetected,
    triggeredSignals: triggeredSignals.length > 0 ? triggeredSignals.join(', ') : 'none',
    reason: chickenWingDetected
      ? `Detected via: ${triggeredSignals.join(', ')}`
      : 'No chicken wing signals detected',
  })

  if (!chickenWingDetected) {
    return {
      mistakeId: 'CHICKEN_WING',
      detected: false,
      confidence: 0.75,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on which signals triggered and their strength
  let severity = 0
  let confidence = 0.70

  // Signal 1: Elbow-only visible (strongest signal)
  if (hasElbowOnlyFrames) {
    severity = Math.max(severity, Math.min(100, elbowOnlyVisibleFrames.length * 20))
    confidence = Math.max(confidence, 0.85)
  }

  // Signal 2: Visibility differential
  if (hasSignificantVisibilityDiff) {
    const avgVisDiff = elbowMoreVisibleFrames.reduce((sum, f) => sum + f.visibilityDiff, 0) / elbowMoreVisibleFrames.length
    severity = Math.max(severity, Math.min(100, avgVisDiff * 300))
    confidence = Math.max(confidence, 0.80)
  }

  // Signal 3: X-position based
  if (elbowLeading) {
    severity = Math.max(severity, Math.min(100, Math.abs(avgWristLeadDistance) * 1000))
    if (elbowEmergedFirst) {
      confidence = Math.max(confidence, 0.85)
    }
  }

  // Ensure minimum severity if detected
  severity = Math.max(severity, 30)

  let message: string
  if (hasElbowOnlyFrames) {
    message = 'Lead elbow is sticking out while hands stay behind body. Focus on keeping arms extended with hands leading through impact.'
  } else if (hasSignificantVisibilityDiff) {
    message = 'Lead elbow is breaking outward through impact. Maintain arm extension for straighter shots.'
  } else {
    message = 'Slight chicken wing tendency detected. Keep your lead arm extended through the ball.'
  }

  return {
    mistakeId: 'CHICKEN_WING',
    detected: true,
    confidence,
    severity,
    message,
    details: `Signals: ${triggeredSignals.join(', ')}`,
  }
}

/**
 * Face-on detection: Measure lead elbow angle directly
 *
 * In face-on view, we can see the lead elbow angle clearly.
 * Chicken wing = elbow angle below threshold.
 */
function detectChickenWingFaceOn(
  input: DetectorInput,
  impactPhase: { startFrame: number; endFrame: number },
  followThroughPhase: { startFrame: number; endFrame: number } | null,
  elbowIdx: number,
  wristIdx: number
): DetectorResult {
  const { frames, isRightHanded } = input

  const shoulderIdx = isRightHanded ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER

  // Sample frames around impact and early follow-through
  const sampleStart = impactPhase.startFrame
  const sampleEnd = followThroughPhase
    ? Math.min(followThroughPhase.startFrame + 5, frames.length - 1)
    : Math.min(impactPhase.endFrame + 5, frames.length - 1)

  let minElbowAngle = 180
  let chickenWingFrames: number[] = []

  for (let i = sampleStart; i <= sampleEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const shoulder = landmarks[shoulderIdx]
    const elbow = landmarks[elbowIdx]
    const wrist = landmarks[wristIdx]

    if (!shoulder || !elbow || !wrist) continue

    const elbowAngle = calculateAngle3D(shoulder, elbow, wrist)
    if (elbowAngle < minElbowAngle) {
      minElbowAngle = elbowAngle
    }

    // Track frames with significant bend
    if (elbowAngle < 150) {
      chickenWingFrames.push(i)
    }
  }

  // Threshold for chicken wing detection (face-on has perspective issues)
  const CHICKEN_WING_THRESHOLD = 140
  const SEVERE_THRESHOLD = 110

  // Sanity check: elbow angles below 90° are likely measurement errors
  if (minElbowAngle < 90) {
    logger.info('CHICKEN_WING Face-on: Skipped (measurement unreliable)', { minElbowAngle })
    return createNotDetectedResult('CHICKEN_WING', 'Measurement unreliable (angle too low)')
  }

  logger.info('CHICKEN_WING Face-on Debug:', {
    cameraAngle: 'face-on',
    minElbowAngle: minElbowAngle.toFixed(1) + '°',
    threshold: CHICKEN_WING_THRESHOLD + '°',
    severeThreshold: SEVERE_THRESHOLD + '°',
    chickenWingFramesCount: chickenWingFrames.length,
    sampleRange: `${sampleStart}-${sampleEnd}`,
    detected: minElbowAngle < CHICKEN_WING_THRESHOLD,
  })

  if (minElbowAngle >= CHICKEN_WING_THRESHOLD) {
    return {
      mistakeId: 'CHICKEN_WING',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, ((CHICKEN_WING_THRESHOLD - minElbowAngle) / (CHICKEN_WING_THRESHOLD - SEVERE_THRESHOLD + 20)) * 100)

  let message: string
  if (minElbowAngle < SEVERE_THRESHOLD) {
    message = `Lead arm collapsing through impact (${Math.round(minElbowAngle)}°). Maintain extension for straighter shots.`
  } else {
    message = 'Slight chicken wing detected. Focus on keeping your lead arm extended through impact.'
  }

  return {
    mistakeId: 'CHICKEN_WING',
    detected: true,
    confidence: 0.8,
    severity,
    message,
    affectedFrames: chickenWingFrames.length > 0 ? chickenWingFrames : undefined,
    details: `Min elbow angle: ${Math.round(minElbowAngle)}°`,
  }
}
