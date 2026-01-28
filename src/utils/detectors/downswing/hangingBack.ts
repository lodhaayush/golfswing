import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { logger } from '@/utils/debugLogger'

/**
 * HANGING_BACK detector
 * Detects when weight doesn't shift toward target during downswing
 *
 * Detection method:
 * - Track hip center X-position from top of backswing through impact
 * - For right-hander: hips should shift LEFT (toward target) in downswing
 * - Hanging back = hips stay on trail side or move further back
 *
 * Only reliable for face-on camera angle
 */
export const detectHangingBack: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, isRightHanded } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('HANGING_BACK', 'Requires face-on camera angle')
  }

  // Get required phases
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')

  if (!topPhase || !impactPhase || !addressPhase) {
    return createNotDetectedResult('HANGING_BACK', 'Required phases not detected')
  }

  // Get stance width for normalization
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('HANGING_BACK', 'No landmarks at address')
  }

  const leftAnkle = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  if (!leftAnkle || !rightAnkle) {
    return createNotDetectedResult('HANGING_BACK', 'Missing ankle landmarks')
  }
  const stanceWidth = Math.abs(rightAnkle.x - leftAnkle.x)
  if (stanceWidth === 0) {
    return createNotDetectedResult('HANGING_BACK', 'Invalid stance width')
  }

  // Get hip center at top
  const topIdx = topPhase.startFrame
  const topLandmarks = frames[topIdx]?.landmarks
  if (!topLandmarks) {
    return createNotDetectedResult('HANGING_BACK', 'No landmarks at top')
  }

  const topLeftHip = topLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const topRightHip = topLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  if (!topLeftHip || !topRightHip) {
    return createNotDetectedResult('HANGING_BACK', 'Missing hip landmarks at top')
  }
  const topHipCenterX = (topLeftHip.x + topRightHip.x) / 2

  // Get hip center at impact
  const impactIdx = impactPhase.startFrame
  const impactLandmarks = frames[impactIdx]?.landmarks
  if (!impactLandmarks) {
    return createNotDetectedResult('HANGING_BACK', 'No landmarks at impact')
  }

  const impactLeftHip = impactLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const impactRightHip = impactLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  if (!impactLeftHip || !impactRightHip) {
    return createNotDetectedResult('HANGING_BACK', 'Missing hip landmarks at impact')
  }
  const impactHipCenterX = (impactLeftHip.x + impactRightHip.x) / 2

  // Debug: log coordinate values to verify coordinate system
  logger.info('HANGING_BACK Debug:', {
    isRightHanded,
    leftAnkleX: leftAnkle.x.toFixed(3),
    rightAnkleX: rightAnkle.x.toFixed(3),
    stanceWidth: stanceWidth.toFixed(3),
    topHipCenterX: topHipCenterX.toFixed(3),
    impactHipCenterX: impactHipCenterX.toFixed(3),
    rawShift: (topHipCenterX - impactHipCenterX).toFixed(3),
  })

  // Determine target direction based on foot positions
  // For right-hander: lead foot = left foot, target is toward lead foot
  // For left-hander: lead foot = right foot, target is toward lead foot
  const leadAnkleX = isRightHanded ? leftAnkle.x : rightAnkle.x
  const trailAnkleX = isRightHanded ? rightAnkle.x : leftAnkle.x
  const targetIsHigherX = leadAnkleX > trailAnkleX

  // Calculate hip shift toward target
  // Positive shift = moved toward target
  let hipShift: number
  if (targetIsHigherX) {
    // Target is toward higher X (right side of screen)
    hipShift = impactHipCenterX - topHipCenterX
  } else {
    // Target is toward lower X (left side of screen)
    hipShift = topHipCenterX - impactHipCenterX
  }

  const normalizedShift = hipShift / stanceWidth

  logger.info('HANGING_BACK Calculation:', {
    targetIsHigherX,
    hipShift: hipShift.toFixed(3),
    normalizedShift: (normalizedShift * 100).toFixed(1) + '%',
  })

  // Sanity check: extreme values suggest measurement noise
  // Hip shift shouldn't exceed 50% of stance width in either direction
  if (Math.abs(normalizedShift) > 0.5) {
    return createNotDetectedResult('HANGING_BACK', 'Measurement unreliable (extreme value)')
  }

  // Threshold: hips should shift at least 3% of stance width toward target
  // (Reduced from 5% to account for measurement variance)
  const MIN_SHIFT = 0.03

  if (normalizedShift >= MIN_SHIFT) {
    return {
      mistakeId: 'HANGING_BACK',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how much weight stayed back
  const deficit = MIN_SHIFT - normalizedShift
  const severity = Math.min(100, (deficit / 0.15) * 100)

  let message: string
  if (normalizedShift < 0) {
    message = 'Weight is moving away from target during downswing. Initiate with lateral hip shift toward target.'
  } else {
    message = 'Insufficient weight transfer toward target. Focus on shifting pressure to your lead foot.'
  }

  return {
    mistakeId: 'HANGING_BACK',
    detected: true,
    confidence: 0.75,
    severity,
    message,
    details: `Hip shift: ${(normalizedShift * 100).toFixed(1)}% of stance (need ${(MIN_SHIFT * 100).toFixed(0)}%+)`,
  }
}
