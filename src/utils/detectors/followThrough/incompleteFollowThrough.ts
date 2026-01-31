import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { calculateRotationFromWidth } from '@/utils/angleCalculations'

/**
 * INCOMPLETE_FOLLOW_THROUGH detector
 * Detects when the golfer doesn't complete their follow-through rotation
 *
 * Detection method:
 * - Track shoulder rotation from impact through finish
 * - Good follow-through: shoulders rotate past 90° (facing target or beyond)
 * - Incomplete: shoulders don't continue rotating after impact
 *
 * Only reliable for face-on camera angle
 */
export const detectIncompleteFollowThrough: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('INCOMPLETE_FOLLOW_THROUGH', 'Requires face-on camera angle')
  }

  // Get required phases
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')
  const followThroughPhase = getPhaseFrameIndices(phaseSegments, 'follow-through')
  const finishPhase = getPhaseFrameIndices(phaseSegments, 'finish')
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')

  if (!impactPhase || !addressPhase) {
    return createNotDetectedResult('INCOMPLETE_FOLLOW_THROUGH', 'Required phases not detected')
  }

  // Get address landmarks for baseline width
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('INCOMPLETE_FOLLOW_THROUGH', 'No landmarks at address')
  }

  // Get shoulder rotation at impact
  const impactIdx = impactPhase.startFrame
  const impactLandmarks = frames[impactIdx]?.landmarks
  if (!impactLandmarks) {
    return createNotDetectedResult('INCOMPLETE_FOLLOW_THROUGH', 'No landmarks at impact')
  }

  const impactShoulderRotation = calculateRotationFromWidth(impactLandmarks, addressLandmarks, 'shoulders')

  // Find max shoulder rotation after impact
  let maxPostImpactRotation = impactShoulderRotation
  const searchEnd = finishPhase
    ? finishPhase.endFrame
    : (followThroughPhase ? followThroughPhase.endFrame : frames.length - 1)

  for (let i = impactPhase.startFrame; i <= searchEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const rotation = calculateRotationFromWidth(landmarks, addressLandmarks, 'shoulders')
    if (rotation > maxPostImpactRotation) {
      maxPostImpactRotation = rotation
    }
  }

  // Check rotation increase after impact
  const rotationIncrease = maxPostImpactRotation - impactShoulderRotation

  // Thresholds
  const MIN_INCREASE = 15 // Should rotate at least 15° more after impact
  const IDEAL_FINISH_ROTATION = 80 // Should approach 90° at finish

  // Check if follow-through continues after impact
  const hasRotationIncrease = rotationIncrease >= MIN_INCREASE
  const reachesFullFinish = maxPostImpactRotation >= IDEAL_FINISH_ROTATION

  if (hasRotationIncrease && reachesFullFinish) {
    return {
      mistakeId: 'INCOMPLETE_FOLLOW_THROUGH',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  let severity: number
  let message: string

  if (!hasRotationIncrease) {
    severity = 70
    message = 'Swing is stopping at impact. Let the club release naturally through to a full finish.'
  } else if (!reachesFullFinish) {
    const deficit = IDEAL_FINISH_ROTATION - maxPostImpactRotation
    severity = Math.min(70, (deficit / 30) * 70)
    message = `Follow-through is cut short (${Math.round(maxPostImpactRotation)}° rotation). Complete your swing with full body rotation.`
  } else {
    severity = 40
    message = 'Slight follow-through restriction. Allow your body to rotate fully toward the target.'
  }

  return {
    mistakeId: 'INCOMPLETE_FOLLOW_THROUGH',
    detected: true,
    confidence: 0.75,
    severity,
    message,
    details: `Impact rotation: ${Math.round(impactShoulderRotation)}°, Max finish: ${Math.round(maxPostImpactRotation)}°`,
  }
}
