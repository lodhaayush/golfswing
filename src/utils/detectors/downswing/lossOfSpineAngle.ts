import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { FEEDBACK_THRESHOLDS } from '@/utils/constants'

/**
 * LOSS_OF_SPINE_ANGLE detector
 * Detects when spine angle changes significantly from address to impact
 *
 * Detection method:
 * - Uses pre-calculated addressSpineAngle and impactSpineAngle from metrics
 * - Compares the difference against thresholds
 *
 * Interpretation varies by camera angle:
 * - Face-on: Shows lateral tilt (secondary tilt at impact is normal)
 * - DTL: Shows forward bend (should remain consistent)
 */
export const detectLossOfSpineAngle: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  const spineDiff = Math.abs(metrics.addressSpineAngle - metrics.impactSpineAngle)

  // Use different thresholds based on camera angle
  const thresholds = cameraAngle === 'face-on'
    ? FEEDBACK_THRESHOLDS.SPINE_DIFF.FACE_ON
    : FEEDBACK_THRESHOLDS.SPINE_DIFF.DEFAULT

  // Within good range - no issue
  if (spineDiff < thresholds.GOOD) {
    return {
      mistakeId: 'LOSS_OF_SPINE_ANGLE',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity
  let severity: number
  let message: string
  let confidence = cameraAngle === 'face-on' ? 0.7 : 0.85

  if (spineDiff < thresholds.WARNING) {
    // Minor posture change
    severity = 30 + ((spineDiff - thresholds.GOOD) / (thresholds.WARNING - thresholds.GOOD)) * 30
    message = 'Minor posture change during swing. Focus on maintaining your spine angle.'
  } else {
    // Significant posture change
    severity = 60 + Math.min(40, ((spineDiff - thresholds.WARNING) / 10) * 40)
    message = `Significant spine angle change (${Math.round(spineDiff)}°) during swing. Work on maintaining posture from address to impact.`
  }

  return {
    mistakeId: 'LOSS_OF_SPINE_ANGLE',
    detected: true,
    confidence,
    severity,
    message,
    details: `Address: ${Math.round(metrics.addressSpineAngle)}°, Impact: ${Math.round(metrics.impactSpineAngle)}°`,
  }
}
