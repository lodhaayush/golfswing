import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { FEEDBACK_THRESHOLDS } from '@/utils/constants'

/**
 * SWAYING detector
 * Detects excessive lateral hip movement during the swing
 *
 * Detection method:
 * - Uses pre-calculated hipSway metric from SwingMetrics
 * - hipSway is normalized hip movement / stance width (0-1 scale)
 * - Only reliable for face-on camera angle
 *
 * Thresholds (from constants):
 * - Good: < 0.40 (minimal sway)
 * - OK: 0.40-0.55 (slight sway)
 * - Warning: > 0.55 (excessive sway)
 */
export const detectSwaying: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('SWAYING', 'Requires face-on camera angle')
  }

  // Check if hipSway metric is available
  if (metrics.hipSway === undefined) {
    return createNotDetectedResult('SWAYING', 'Hip sway metric not available')
  }

  const hipSway = metrics.hipSway
  const GOOD_THRESHOLD = FEEDBACK_THRESHOLDS.HIP_SWAY.GOOD
  const WARNING_THRESHOLD = FEEDBACK_THRESHOLDS.HIP_SWAY.OK

  const detected = hipSway > GOOD_THRESHOLD
  const severity = Math.min(100, (hipSway / (WARNING_THRESHOLD + 0.2)) * 100)
  const confidence = 0.9

  let message = ''
  if (hipSway > WARNING_THRESHOLD) {
    message = `Excessive hip sway detected (${(hipSway * 100).toFixed(0)}%). Focus on rotating around your spine instead of sliding laterally.`
  } else if (hipSway > GOOD_THRESHOLD) {
    message = `Slight hip sway detected. Work on keeping your lower body more stable during the backswing.`
  }

  return {
    mistakeId: 'SWAYING',
    detected,
    confidence,
    severity,
    message,
  }
}
