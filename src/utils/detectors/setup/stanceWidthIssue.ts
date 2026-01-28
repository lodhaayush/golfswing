import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'

/**
 * STANCE_WIDTH_ISSUE detector
 * Detects if the golfer's stance width is inappropriate for the club type
 *
 * Detection method:
 * - Calculate stance width ratio (ankle width / hip width)
 * - Compare against ideal ranges for driver vs iron
 *
 * Thresholds (from constants):
 * - Driver: should be >= 1.4x hip width
 * - Iron: should be <= 1.25x hip width
 * - Middle ground (1.25-1.4) is acceptable for both
 */
export const detectStanceWidthIssue: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, clubType } = input

  // Not reliable for DTL - ankles may be occluded
  if (cameraAngle === 'dtl') {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Requires face-on or oblique camera angle')
  }

  // Get address phase frames
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')
  if (!addressPhase) {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'No address phase detected')
  }

  // Sample from middle of address phase for stable measurement
  const sampleIdx = Math.floor((addressPhase.startFrame + addressPhase.endFrame) / 2)
  const landmarks = frames[sampleIdx]?.landmarks
  if (!landmarks) {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'No landmarks available')
  }

  // Calculate stance ratio
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftAnkle || !rightAnkle || !leftHip || !rightHip) {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Missing ankle or hip landmarks')
  }

  const stanceWidth = Math.abs(rightAnkle.x - leftAnkle.x)
  const hipWidth = Math.abs(rightHip.x - leftHip.x)

  if (hipWidth === 0) {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Invalid hip width')
  }

  const stanceRatio = stanceWidth / hipWidth

  // Define thresholds
  const DRIVER_MIN = 1.4
  const IRON_MAX = 1.25

  // Only flag issues if we know the club type
  if (clubType === 'unknown') {
    // Can't determine if stance is appropriate without knowing club
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Club type unknown - cannot evaluate stance width')
  }

  let detected = false
  let severity = 0
  let message = ''

  if (clubType === 'driver' && stanceRatio < DRIVER_MIN) {
    detected = true
    const deviation = DRIVER_MIN - stanceRatio
    severity = Math.min(100, (deviation / 0.3) * 100)
    message = `Stance is too narrow for driver (${stanceRatio.toFixed(2)}x hip width). Widen your stance for better stability.`
  } else if (clubType === 'iron' && stanceRatio > IRON_MAX + 0.2) {
    // Allow some tolerance for iron stance being slightly wide
    detected = true
    const deviation = stanceRatio - (IRON_MAX + 0.2)
    severity = Math.min(100, (deviation / 0.3) * 100)
    message = `Stance is too wide for iron (${stanceRatio.toFixed(2)}x hip width). A narrower stance gives better control.`
  }

  if (!detected) {
    return {
      mistakeId: 'STANCE_WIDTH_ISSUE',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  return {
    mistakeId: 'STANCE_WIDTH_ISSUE',
    detected: true,
    confidence: 0.75,
    severity,
    message,
  }
}
