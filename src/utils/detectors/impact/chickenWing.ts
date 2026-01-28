import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { calculateAngle3D } from '@/utils/angleCalculations'

/**
 * CHICKEN_WING detector
 * Detects when the lead elbow bends outward through impact
 *
 * Detection method:
 * - Calculate lead elbow angle at and after impact
 * - Chicken wing = elbow angle < 150° with outward deviation
 * - Should maintain extension through impact into follow-through
 *
 * Works for all camera angles but most reliable for face-on
 */
export const detectChickenWing: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, isRightHanded, cameraAngle } = input

  // Get impact and follow-through phases
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')
  const followThroughPhase = getPhaseFrameIndices(phaseSegments, 'follow-through')

  if (!impactPhase) {
    return createNotDetectedResult('CHICKEN_WING', 'Impact phase not detected')
  }

  // Determine lead arm landmarks based on handedness
  const shoulderIdx = isRightHanded ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER
  const elbowIdx = isRightHanded ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
  const wristIdx = isRightHanded ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST

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

  // Threshold for chicken wing detection
  // Face-on view has perspective issues - use more lenient threshold
  const CHICKEN_WING_THRESHOLD = cameraAngle === 'face-on' ? 140 : 150 // Degrees
  const SEVERE_THRESHOLD = cameraAngle === 'face-on' ? 110 : 130

  // Sanity check: elbow angles below 90° are likely measurement errors
  if (minElbowAngle < 90) {
    return createNotDetectedResult('CHICKEN_WING', 'Measurement unreliable (angle too low)')
  }

  if (minElbowAngle >= CHICKEN_WING_THRESHOLD) {
    return {
      mistakeId: 'CHICKEN_WING',
      detected: false,
      confidence: cameraAngle === 'face-on' ? 0.85 : 0.7,
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
    confidence: cameraAngle === 'face-on' ? 0.8 : 0.65,
    severity,
    message,
    affectedFrames: chickenWingFrames.length > 0 ? chickenWingFrames : undefined,
    details: `Min elbow angle: ${Math.round(minElbowAngle)}°`,
  }
}
