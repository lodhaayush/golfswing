import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { calculateSpineAngle } from '@/utils/angleCalculations'

/**
 * REVERSE_C_FINISH detector
 * Detects when the golfer finishes with excessive backward lean (reverse C shape)
 *
 * Detection method:
 * - Measure spine angle at finish
 * - Reverse C = spine tilted significantly backward (negative angle)
 * - This puts strain on the lower back and indicates poor mechanics
 *
 * Works best for DTL and oblique camera angles
 */
export const detectReverseCFinish: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle } = input

  // Better for DTL where spine angle is clearly visible
  // Face-on shows lateral tilt, not forward/back bend
  if (cameraAngle === 'face-on') {
    return createNotDetectedResult('REVERSE_C_FINISH', 'More reliable for DTL camera angle')
  }

  // Get finish phase
  const finishPhase = getPhaseFrameIndices(phaseSegments, 'finish')

  if (!finishPhase) {
    return createNotDetectedResult('REVERSE_C_FINISH', 'Finish phase not detected')
  }

  // Sample frames from finish
  let maxBackwardLean = 0 // Most negative spine angle

  for (let i = finishPhase.startFrame; i <= finishPhase.endFrame && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const spineAngle = calculateSpineAngle(landmarks)

    // Negative angle indicates backward lean
    if (spineAngle < maxBackwardLean) {
      maxBackwardLean = spineAngle
    }
  }

  // Threshold for reverse C (backward lean)
  const REVERSE_C_THRESHOLD = -10 // More than 10° backward
  const SEVERE_THRESHOLD = -20    // 20° or more is concerning

  // If no significant backward lean, no issue
  if (maxBackwardLean > REVERSE_C_THRESHOLD) {
    return {
      mistakeId: 'REVERSE_C_FINISH',
      detected: false,
      confidence: 0.75,
      severity: 0,
      message: '',
    }
  }

  const backwardLean = Math.abs(maxBackwardLean)
  const severity = Math.min(100, (backwardLean / (Math.abs(SEVERE_THRESHOLD) + 10)) * 100)

  let message: string
  if (maxBackwardLean < SEVERE_THRESHOLD) {
    message = `Significant reverse C finish (${Math.round(backwardLean)}° backward lean). This can strain your lower back.`
  } else {
    message = 'Slight reverse C tendency at finish. Work on a more stacked, balanced finish position.'
  }

  return {
    mistakeId: 'REVERSE_C_FINISH',
    detected: true,
    confidence: 0.7,
    severity,
    message,
    details: `Backward lean at finish: ${Math.round(backwardLean)}°`,
  }
}
