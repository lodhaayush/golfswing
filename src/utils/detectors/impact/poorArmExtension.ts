import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { FEEDBACK_THRESHOLDS } from '@/utils/constants'

/**
 * POOR_ARM_EXTENSION detector
 * Detects when arms don't extend properly through impact
 *
 * Detection method:
 * - Uses pre-calculated impactExtension metric (0-1 scale)
 * - Measures arm reach at impact vs follow-through
 * - Low extension = arms aren't releasing toward target
 *
 * Only reliable for face-on camera angle
 */
export const detectPoorArmExtension: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('POOR_ARM_EXTENSION', 'Requires face-on camera angle')
  }

  // Check if metric is available
  if (metrics.impactExtension === undefined) {
    return createNotDetectedResult('POOR_ARM_EXTENSION', 'Impact extension metric not available')
  }

  const impactExtension = metrics.impactExtension
  const GOOD_THRESHOLD = FEEDBACK_THRESHOLDS.IMPACT_EXTENSION.GOOD

  // Good extension - no issue
  if (impactExtension >= GOOD_THRESHOLD) {
    return {
      mistakeId: 'POOR_ARM_EXTENSION',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Severity directly derived from extension score: lower extension = higher severity
  const severity = (1 - impactExtension) * 100

  const message = impactExtension >= 0.5
    ? 'Could improve arm extension through impact. Focus on reaching toward the target post-impact.'
    : 'Limited arm extension through impact. Work on releasing the club fully toward the target.'

  return {
    mistakeId: 'POOR_ARM_EXTENSION',
    detected: true,
    confidence: 0.8,
    severity,
    message,
  }
}
