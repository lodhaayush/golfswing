import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'

/**
 * EARLY_EXTENSION detector
 * Detects when hips thrust toward the ball during downswing
 *
 * Detection method:
 * - Track hip center Y-position (vertical) during downswing
 * - In MediaPipe, Y increases downward
 * - Early extension = hips move up (Y decreases) during downswing
 * - Golfer "stands up" out of posture
 *
 * Only reliable for DTL and oblique camera angles
 */
export const detectEarlyExtension: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle } = input

  // Better for DTL camera angle where vertical movement is visible
  if (cameraAngle === 'face-on') {
    return createNotDetectedResult('EARLY_EXTENSION', 'More reliable for DTL camera angle')
  }

  // Get downswing phase
  const downswingPhase = getPhaseFrameIndices(phaseSegments, 'downswing')
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')

  if (!downswingPhase || !topPhase) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Required phases not detected')
  }

  // Get hip position at top of backswing (reference)
  const topIdx = topPhase.startFrame
  const topLandmarks = frames[topIdx]?.landmarks
  if (!topLandmarks) {
    return createNotDetectedResult('EARLY_EXTENSION', 'No landmarks at top')
  }

  const topLeftHip = topLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const topRightHip = topLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  if (!topLeftHip || !topRightHip) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Missing hip landmarks at top')
  }
  const topHipCenterY = (topLeftHip.y + topRightHip.y) / 2

  // Get torso height for normalization
  const topLeftShoulder = topLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  if (!topLeftShoulder || !topLeftHip) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Missing shoulder landmarks')
  }
  const torsoHeight = Math.abs(topLeftShoulder.y - topLeftHip.y)
  if (torsoHeight === 0) {
    return createNotDetectedResult('EARLY_EXTENSION', 'Invalid torso height')
  }

  // Track minimum hip Y (highest position) during downswing through impact
  let minHipY = topHipCenterY
  const endIdx = impactPhase ? impactPhase.endFrame : downswingPhase.endFrame

  for (let i = topPhase.startFrame; i <= endIdx && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
    if (leftHip && rightHip) {
      const hipCenterY = (leftHip.y + rightHip.y) / 2
      minHipY = Math.min(minHipY, hipCenterY)
    }
  }

  // Calculate hip rise (negative Y change = upward)
  const hipRise = topHipCenterY - minHipY
  const normalizedRise = hipRise / torsoHeight

  // Threshold for detecting early extension
  const EXTENSION_THRESHOLD = 0.08 // 8% of torso height
  const SEVERE_THRESHOLD = 0.15

  if (normalizedRise < EXTENSION_THRESHOLD) {
    return {
      mistakeId: 'EARLY_EXTENSION',
      detected: false,
      confidence: 0.75,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, (normalizedRise / (SEVERE_THRESHOLD + 0.05)) * 100)

  let message: string
  if (normalizedRise > SEVERE_THRESHOLD) {
    message = 'Significant early extension - hips are thrusting toward the ball. Maintain your posture through impact.'
  } else {
    message = 'Slight early extension detected. Focus on maintaining spine angle during the downswing.'
  }

  return {
    mistakeId: 'EARLY_EXTENSION',
    detected: true,
    confidence: 0.7,
    severity,
    message,
    details: `Hips rose ${(normalizedRise * 100).toFixed(1)}% of torso height during downswing`,
  }
}
