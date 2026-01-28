import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { SCORING_RANGES } from '@/utils/constants'

/**
 * OVER_ROTATION detector
 * Detects when the golfer rotates too much in the backswing
 *
 * Detection method:
 * - Uses maxXFactor (shoulder-hip separation) from metrics
 * - Very high X-factor can indicate over-rotation and loss of control
 *
 * Thresholds (from constants):
 * - Ideal X-factor: 35-65°
 * - Above 65° = over-rotation warning
 *
 * Not reliable for DTL camera angle
 */
export const detectOverRotation: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  // Not reliable for DTL
  if (cameraAngle === 'dtl') {
    return createNotDetectedResult('OVER_ROTATION', 'Rotation metrics unreliable for DTL camera angle')
  }

  const xFactor = metrics.maxXFactor
  const IDEAL_MAX = SCORING_RANGES.X_FACTOR.IDEAL_MAX

  // If X-factor is within ideal range, no issue
  if (xFactor <= IDEAL_MAX) {
    return {
      mistakeId: 'OVER_ROTATION',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how far above ideal
  const deviation = xFactor - IDEAL_MAX
  const severity = Math.min(100, (deviation / 20) * 100)

  return {
    mistakeId: 'OVER_ROTATION',
    detected: true,
    confidence: 0.8,
    severity,
    message: `X-factor of ${Math.round(xFactor)}° is very high. This may cause consistency issues and loss of control.`,
    details: `X-factor exceeds ideal max of ${IDEAL_MAX}°`,
  }
}
