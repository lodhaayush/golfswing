import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { SCORING_RANGES } from '@/utils/constants'

/**
 * INSUFFICIENT_SHOULDER_TURN detector
 * Detects when the golfer doesn't rotate their shoulders enough in the backswing
 *
 * Detection method:
 * - Uses maxXFactor (shoulder-hip separation) from metrics
 * - Low X-factor indicates insufficient shoulder turn relative to hips
 *
 * Thresholds (from constants):
 * - Ideal X-factor: 35-65°
 * - Below 35° = insufficient
 *
 * Not reliable for DTL camera angle
 */
export const detectInsufficientShoulderTurn: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  // Not reliable for DTL
  if (cameraAngle === 'dtl') {
    return createNotDetectedResult('INSUFFICIENT_SHOULDER_TURN', 'Rotation metrics unreliable for DTL camera angle')
  }

  const xFactor = metrics.maxXFactor
  const IDEAL_MIN = SCORING_RANGES.X_FACTOR.IDEAL_MIN

  // If X-factor is above threshold, no issue
  if (xFactor >= IDEAL_MIN) {
    return {
      mistakeId: 'INSUFFICIENT_SHOULDER_TURN',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how far below ideal
  const deviation = IDEAL_MIN - xFactor
  const severity = Math.min(100, (deviation / 20) * 100)

  return {
    mistakeId: 'INSUFFICIENT_SHOULDER_TURN',
    detected: true,
    confidence: 0.8,
    severity,
    message: `X-factor of ${Math.round(xFactor)}° is low. Try rotating your shoulders more while keeping hips stable.`,
    details: `X-factor should be at least ${IDEAL_MIN}°`,
  }
}
