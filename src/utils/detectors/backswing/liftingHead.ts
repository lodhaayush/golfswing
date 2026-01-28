import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'

/**
 * LIFTING_HEAD detector
 * Detects when the head lifts up during the backswing
 *
 * Detection method:
 * - Track head (nose) Y-position from address through top of backswing
 * - In MediaPipe, Y increases downward, so lifting = Y decreasing
 * - Compare against shoulder height for normalization
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

  // Get head position at address
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('LIFTING_HEAD', 'No landmarks at address')
  }

  const addressNose = addressLandmarks[POSE_LANDMARKS.NOSE]
  const addressLeftShoulder = addressLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const addressLeftHip = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]

  if (!addressNose || !addressLeftShoulder || !addressLeftHip) {
    return createNotDetectedResult('LIFTING_HEAD', 'Missing required landmarks at address')
  }

  // Calculate normalization factor (torso height)
  const torsoHeight = Math.abs(addressLeftShoulder.y - addressLeftHip.y)
  if (torsoHeight === 0) {
    return createNotDetectedResult('LIFTING_HEAD', 'Invalid torso height')
  }

  // Track minimum Y (highest position) during backswing
  let minHeadY = addressNose.y

  const backswingEnd = topPhase.endFrame
  for (let i = addressPhase.endFrame; i <= backswingEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const nose = landmarks[POSE_LANDMARKS.NOSE]
    if (nose) {
      minHeadY = Math.min(minHeadY, nose.y)
    }
  }

  // Calculate head lift (negative Y change = upward movement)
  const headLift = addressNose.y - minHeadY
  const normalizedLift = headLift / torsoHeight

  // Threshold for detecting significant head lift
  const LIFT_THRESHOLD = 0.08 // 8% of torso height
  const WARNING_THRESHOLD = 0.15 // 15% = significant lift

  if (normalizedLift < LIFT_THRESHOLD) {
    return {
      mistakeId: 'LIFTING_HEAD',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, (normalizedLift / (WARNING_THRESHOLD + 0.1)) * 100)

  let message: string
  if (normalizedLift > WARNING_THRESHOLD) {
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
    details: `Head lifted ${(normalizedLift * 100).toFixed(1)}% of torso height`,
  }
}
