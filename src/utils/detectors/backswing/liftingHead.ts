import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { logger } from '@/utils/debugLogger'

/**
 * LIFTING_HEAD detector
 * Detects when the head lifts up during the backswing
 *
 * Detection methods compared:
 * 1. Nose Y-position (original) - can be affected by head rotation
 * 2. Ears midpoint Y-position - more stable on head rotation
 * 3. Head-to-shoulder relationship - relative measurement, rotation-independent
 *
 * Only reliable for face-on or oblique camera angles
 */
export const detectLiftingHead: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle } = input

  // Works for face-on and oblique, not DTL
  if (cameraAngle === 'dtl') {
    return createNotDetectedResult('LIFTING_HEAD', 'Requires face-on or oblique camera angle')
  }

  // Get address and backswing phases
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')

  if (!addressPhase || !topPhase) {
    return createNotDetectedResult('LIFTING_HEAD', 'Required phases not detected')
  }

  // Get landmarks at address
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('LIFTING_HEAD', 'No landmarks at address')
  }

  const addressNose = addressLandmarks[POSE_LANDMARKS.NOSE]
  const addressLeftEar = addressLandmarks[POSE_LANDMARKS.LEFT_EAR]
  const addressRightEar = addressLandmarks[POSE_LANDMARKS.RIGHT_EAR]
  const addressLeftShoulder = addressLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const addressRightShoulder = addressLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const addressLeftHip = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]

  if (!addressNose || !addressLeftShoulder || !addressLeftHip) {
    return createNotDetectedResult('LIFTING_HEAD', 'Missing required landmarks at address')
  }

  // Calculate normalization factor (torso height)
  const torsoHeight = Math.abs(addressLeftShoulder.y - addressLeftHip.y)
  if (torsoHeight === 0) {
    return createNotDetectedResult('LIFTING_HEAD', 'Invalid torso height')
  }

  // Calculate address reference points
  const addressEarsMidpointY = (addressLeftEar && addressRightEar)
    ? (addressLeftEar.y + addressRightEar.y) / 2
    : null
  const addressShoulderMidpointY = (addressLeftShoulder && addressRightShoulder)
    ? (addressLeftShoulder.y + addressRightShoulder.y) / 2
    : addressLeftShoulder.y
  const addressHeadToShoulderDist = addressNose.y - addressShoulderMidpointY

  // Track minimum Y (highest position) during backswing for each method
  let minNoseY = addressNose.y
  let minNoseYFrame = addressIdx
  let minEarsMidpointY = addressEarsMidpointY ?? Infinity
  let minEarsFrame = addressIdx
  let maxHeadToShoulderDist = addressHeadToShoulderDist // More negative = head lifted relative to shoulders
  let maxRelativeFrame = addressIdx

  const backswingEnd = topPhase.endFrame
  for (let i = addressPhase.endFrame; i <= backswingEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const nose = landmarks[POSE_LANDMARKS.NOSE]
    const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR]
    const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR]
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

    // Method 1: Track nose Y
    if (nose && nose.y < minNoseY) {
      minNoseY = nose.y
      minNoseYFrame = i
    }

    // Method 2: Track ears midpoint Y
    if (leftEar && rightEar) {
      const earsMidpointY = (leftEar.y + rightEar.y) / 2
      if (earsMidpointY < minEarsMidpointY) {
        minEarsMidpointY = earsMidpointY
        minEarsFrame = i
      }
    }

    // Method 3: Track head-to-shoulder distance
    if (nose && (leftShoulder || rightShoulder)) {
      const shoulderMidpointY = (leftShoulder && rightShoulder)
        ? (leftShoulder.y + rightShoulder.y) / 2
        : (leftShoulder?.y ?? rightShoulder?.y ?? 0)
      const headToShoulderDist = nose.y - shoulderMidpointY
      // We want to find when head is highest relative to shoulders (most negative distance)
      if (headToShoulderDist < maxHeadToShoulderDist) {
        maxHeadToShoulderDist = headToShoulderDist
        maxRelativeFrame = i
      }
    }
  }

  // Calculate lifts for each method
  // Method 1: Nose-based lift
  const noseLift = addressNose.y - minNoseY
  const normalizedNoseLift = noseLift / torsoHeight

  // Method 2: Ears-based lift
  const earsLift = addressEarsMidpointY !== null
    ? addressEarsMidpointY - minEarsMidpointY
    : 0
  const normalizedEarsLift = earsLift / torsoHeight

  // Method 3: Head-to-shoulder relationship change
  // If head lifts relative to shoulders, the distance becomes more negative
  const headToShoulderChange = addressHeadToShoulderDist - maxHeadToShoulderDist
  const normalizedRelativeLift = headToShoulderChange / torsoHeight

  // Threshold for detecting significant head lift
  const LIFT_THRESHOLD = 0.10 // 10% of torso height
  const WARNING_THRESHOLD = 0.15 // 15% = significant lift

  // Use ears-based method as primary (more stable), fall back to relative method
  const primaryLift = addressEarsMidpointY !== null ? normalizedEarsLift : normalizedRelativeLift
  const detected = primaryLift >= LIFT_THRESHOLD
  const severity = detected ? Math.min(100, (primaryLift / (WARNING_THRESHOLD + 0.1)) * 100) : 0

  logger.info('LIFTING_HEAD Debug:', {
    method1_nose: {
      addressY: addressNose.y.toFixed(3),
      minY: minNoseY.toFixed(3),
      minFrame: minNoseYFrame,
      lift: `${(normalizedNoseLift * 100).toFixed(1)}%`,
    },
    method2_ears: addressEarsMidpointY !== null ? {
      addressY: addressEarsMidpointY.toFixed(3),
      minY: minEarsMidpointY.toFixed(3),
      minFrame: minEarsFrame,
      lift: `${(normalizedEarsLift * 100).toFixed(1)}%`,
    } : 'N/A (ears not detected)',
    method3_relative: {
      addressDist: addressHeadToShoulderDist.toFixed(3),
      maxDist: maxHeadToShoulderDist.toFixed(3),
      maxFrame: maxRelativeFrame,
      lift: `${(normalizedRelativeLift * 100).toFixed(1)}%`,
    },
    searchRange: `${addressPhase.endFrame}-${backswingEnd}`,
    torsoHeight: torsoHeight.toFixed(3),
    primaryMethod: addressEarsMidpointY !== null ? 'ears' : 'relative',
    liftThreshold: `${(LIFT_THRESHOLD * 100).toFixed(0)}%`,
    detected,
    severity: severity.toFixed(1),
  })

  if (!detected) {
    return {
      mistakeId: 'LIFTING_HEAD',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  let message: string
  if (primaryLift > WARNING_THRESHOLD) {
    message = 'Significant head lifting during backswing. Keep your head level to maintain your spine angle.'
  } else {
    message = 'Slight head lifting in backswing. Try to keep your head more still.'
  }

  return {
    mistakeId: 'LIFTING_HEAD',
    detected: true,
    confidence: 0.75,
    severity,
    message,
    details: `Head lifted ${(primaryLift * 100).toFixed(1)}% of torso height`,
  }
}
