import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { logger } from '@/utils/debugLogger'

/**
 * REVERSE_PIVOT detector
 * Detects when weight moves toward the target during backswing (opposite of correct)
 *
 * Detection method:
 * - Track hip center X-position from address through top of backswing
 * - For right-hander: hips should move slightly AWAY from target (right/positive X)
 * - Reverse pivot = hips move toward target (left/negative X) during backswing
 *
 * Only reliable for face-on camera angle
 */
export const detectReversePivot: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, isRightHanded } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('REVERSE_PIVOT', 'Requires face-on camera angle')
  }

  // Get address and top phases
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')

  if (!addressPhase || !topPhase) {
    return createNotDetectedResult('REVERSE_PIVOT', 'Address or top phase not detected')
  }

  // Get hip center at address
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('REVERSE_PIVOT', 'No landmarks at address')
  }

  const addressLeftHip = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const addressRightHip = addressLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  if (!addressLeftHip || !addressRightHip) {
    return createNotDetectedResult('REVERSE_PIVOT', 'Missing hip landmarks at address')
  }
  const addressHipCenterX = (addressLeftHip.x + addressRightHip.x) / 2

  // Get stance width for normalization
  const leftAnkle = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  if (!leftAnkle || !rightAnkle) {
    return createNotDetectedResult('REVERSE_PIVOT', 'Missing ankle landmarks')
  }
  const stanceWidth = Math.abs(rightAnkle.x - leftAnkle.x)
  if (stanceWidth === 0) {
    return createNotDetectedResult('REVERSE_PIVOT', 'Invalid stance width')
  }

  // Get hip center at top of backswing
  const topIdx = topPhase.startFrame
  const topLandmarks = frames[topIdx]?.landmarks
  if (!topLandmarks) {
    return createNotDetectedResult('REVERSE_PIVOT', 'No landmarks at top')
  }

  const topLeftHip = topLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const topRightHip = topLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  if (!topLeftHip || !topRightHip) {
    return createNotDetectedResult('REVERSE_PIVOT', 'Missing hip landmarks at top')
  }
  const topHipCenterX = (topLeftHip.x + topRightHip.x) / 2

  // Determine target direction based on foot positions
  // For right-hander: lead foot = left foot, target is toward lead foot
  // For left-hander: lead foot = right foot, target is toward lead foot
  const leadAnkleX = isRightHanded ? leftAnkle.x : rightAnkle.x
  const trailAnkleX = isRightHanded ? rightAnkle.x : leftAnkle.x
  const targetIsHigherX = leadAnkleX > trailAnkleX

  // Calculate hip movement during backswing toward target
  // Positive = moved toward target (bad - reverse pivot)
  // Negative = moved away from target (good - loading into trail side)
  let towardTargetMovement: number
  if (targetIsHigherX) {
    // Target is toward higher X (right side of screen)
    towardTargetMovement = (topHipCenterX - addressHipCenterX) / stanceWidth
  } else {
    // Target is toward lower X (left side of screen)
    towardTargetMovement = (addressHipCenterX - topHipCenterX) / stanceWidth
  }

  logger.info('REVERSE_PIVOT Debug:', {
    isRightHanded,
    targetIsHigherX,
    addressHipCenterX: addressHipCenterX.toFixed(3),
    topHipCenterX: topHipCenterX.toFixed(3),
    towardTargetMovement: (towardTargetMovement * 100).toFixed(1) + '%',
  })

  // Threshold for detecting reverse pivot
  const REVERSE_PIVOT_THRESHOLD = 0.05 // 5% of stance width toward target

  if (towardTargetMovement < REVERSE_PIVOT_THRESHOLD) {
    return {
      mistakeId: 'REVERSE_PIVOT',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, (towardTargetMovement / 0.2) * 100)

  return {
    mistakeId: 'REVERSE_PIVOT',
    detected: true,
    confidence: 0.75,
    severity,
    message: `Weight is moving toward the target during backswing. Focus on loading into your trail side.`,
    details: `Hip moved ${(towardTargetMovement * 100).toFixed(1)}% toward target`,
  }
}
