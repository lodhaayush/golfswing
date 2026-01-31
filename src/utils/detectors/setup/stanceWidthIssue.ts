import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { CLUB_DETECTION } from '@/utils/constants'

/**
 * STANCE_WIDTH_ISSUE detector
 * Detects if the golfer's stance width is inappropriate for the club type
 *
 * IMPORTANT: This detector only runs when the user has manually overridden
 * the detected club type. If the club type was auto-detected from stance width,
 * it would be circular logic to then flag the stance width as wrong.
 *
 * Detection method:
 * - Calculate stance width ratio (ankle width / hip width)
 * - Compare against the same thresholds used for club type detection
 *
 * Thresholds (from CLUB_DETECTION constants):
 * - Driver: should be >= STANCE_RATIO.THRESHOLD (2.35)
 * - Iron: should be < STANCE_RATIO.THRESHOLD (2.35)
 */
export const detectStanceWidthIssue: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, clubType, clubTypeOverridden } = input

  // Only run this detector if user manually overrode the club type
  // Auto-detected club type uses stance width, so flagging it would be circular logic
  if (!clubTypeOverridden) {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Club type was auto-detected (no user override)')
  }

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

  // Use the same threshold as club type detection for consistency
  const THRESHOLD = CLUB_DETECTION.STANCE_RATIO.THRESHOLD

  // Only flag issues if we know the club type
  if (clubType === 'unknown') {
    return createNotDetectedResult('STANCE_WIDTH_ISSUE', 'Club type unknown - cannot evaluate stance width')
  }

  let detected = false
  let severity = 0
  let message = ''

  if (clubType === 'driver' && stanceRatio < THRESHOLD) {
    // User said it's a driver but stance looks like an iron
    detected = true
    const deviation = THRESHOLD - stanceRatio
    severity = Math.min(100, (deviation / 0.5) * 100)
    message = `Stance is too narrow for driver (${stanceRatio.toFixed(2)}x hip width, should be >= ${THRESHOLD}). Widen your stance for better stability.`
  } else if (clubType === 'iron' && stanceRatio >= THRESHOLD) {
    // User said it's an iron but stance looks like a driver
    detected = true
    const deviation = stanceRatio - THRESHOLD
    severity = Math.min(100, (deviation / 0.5) * 100)
    message = `Stance is too wide for iron (${stanceRatio.toFixed(2)}x hip width, should be < ${THRESHOLD}). A narrower stance gives better control.`
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
