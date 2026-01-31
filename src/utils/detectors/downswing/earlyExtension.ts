import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { logger } from '@/utils/debugLogger'

/**
 * EARLY_EXTENSION detector
 * Detects when hips thrust toward the ball during downswing (losing the "tush line")
 *
 * Detection method:
 * - Track hip position relative to ankles during downswing
 * - In DTL view, early extension = hips moving forward relative to feet
 * - Measure horizontal distance between hip center and ankle center
 * - If hips move significantly forward from address position, detect early extension
 *
 * Only reliable for DTL and oblique camera angles
 */
export const detectEarlyExtension: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle } = input

  // Only reliable for DTL camera angle where forward hip movement is visible
  if (cameraAngle === 'face-on') {
    logger.info('EARLY_EXTENSION: Skipped (face-on camera)')
    return createNotDetectedResult('EARLY_EXTENSION', 'Requires DTL camera angle')
  }

  logger.info('EARLY_EXTENSION: Running detection', { cameraAngle })

  // Get required phases
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')
  const downswingPhase = getPhaseFrameIndices(phaseSegments, 'downswing')
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')

  if (!addressPhase || !downswingPhase || !topPhase) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Required phases not detected')
  }

  // Get hip-to-ankle relationship at address (the "tush line" reference)
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('EARLY_EXTENSION', 'No landmarks at address')
  }

  const addressLeftHip = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const addressRightHip = addressLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  const addressLeftAnkle = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const addressRightAnkle = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  if (!addressLeftHip || !addressRightHip || !addressLeftAnkle || !addressRightAnkle) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Missing landmarks at address')
  }

  const addressHipCenterY = (addressLeftHip.y + addressRightHip.y) / 2
  const addressAnkleCenterY = (addressLeftAnkle.y + addressRightAnkle.y) / 2

  // Reference distance from hips to ankles at address (in Y-axis for DTL view)
  // In DTL, Y-axis shows forward/back position relative to camera
  const addressHipAnkleOffset = addressHipCenterY - addressAnkleCenterY

  // Get torso height for normalization
  const addressLeftShoulder = addressLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  if (!addressLeftShoulder) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Missing shoulder landmarks')
  }
  const torsoHeight = Math.abs(addressLeftShoulder.y - addressLeftHip.y)
  if (torsoHeight === 0) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Invalid torso height')
  }

  // Track maximum forward hip thrust during downswing through impact
  let maxForwardThrust = 0
  const endIdx = impactPhase ? impactPhase.endFrame : downswingPhase.endFrame

  for (let i = topPhase.startFrame; i <= endIdx && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

    if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) continue

    const hipCenterY = (leftHip.y + rightHip.y) / 2
    const ankleCenterY = (leftAnkle.y + rightAnkle.y) / 2
    const currentHipAnkleOffset = hipCenterY - ankleCenterY

    // Forward thrust = hips moving forward relative to ankles compared to address
    // In DTL, lower Y = forward toward camera/ball
    const forwardThrust = addressHipAnkleOffset - currentHipAnkleOffset
    if (forwardThrust > maxForwardThrust) {
      maxForwardThrust = forwardThrust
    }
  }

  // Normalize by torso height
  const normalizedThrust = maxForwardThrust / torsoHeight

  // Threshold for detecting early extension
  // This measures how much the hips have moved forward relative to the feet
  const EXTENSION_THRESHOLD = 0.12 // 12% of torso height
  const SEVERE_THRESHOLD = 0.20

  logger.info('EARLY_EXTENSION Debug:', {
    addressHipAnkleOffset: addressHipAnkleOffset.toFixed(3),
    maxForwardThrust: maxForwardThrust.toFixed(3),
    normalizedThrust: (normalizedThrust * 100).toFixed(1) + '%',
    torsoHeight: torsoHeight.toFixed(3),
    threshold: (EXTENSION_THRESHOLD * 100).toFixed(1) + '%',
    detected: normalizedThrust >= EXTENSION_THRESHOLD,
    note: 'WARNING: Using Y-axis which measures vertical movement, not forward movement for DTL',
  })

  if (normalizedThrust < EXTENSION_THRESHOLD) {
    return {
      mistakeId: 'EARLY_EXTENSION',
      detected: false,
      confidence: 0.75,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, (normalizedThrust / (SEVERE_THRESHOLD + 0.08)) * 100)

  let message: string
  if (normalizedThrust > SEVERE_THRESHOLD) {
    message = 'Significant early extension - hips thrusting toward the ball. Focus on maintaining your tush line.'
  } else {
    message = 'Slight early extension detected. Keep your hips back through the downswing.'
  }

  return {
    mistakeId: 'EARLY_EXTENSION',
    detected: true,
    confidence: 0.7,
    severity,
    message,
    details: `Hips moved forward ${(normalizedThrust * 100).toFixed(1)}% of torso height`,
  }
}
