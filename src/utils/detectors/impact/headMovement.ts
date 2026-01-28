import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { FEEDBACK_THRESHOLDS } from '@/utils/constants'

/**
 * HEAD_MOVEMENT detector
 * Detects excessive head movement during the swing
 *
 * Detection method:
 * - Uses pre-calculated headStability metric
 * - Measures max deviation of head from address position
 * - Normalized to body height (0-1 scale, lower is better)
 *
 * Only reliable for face-on camera angle
 */
export const detectHeadMovement: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('HEAD_MOVEMENT', 'Requires face-on camera angle')
  }

  // Check if metric is available
  if (metrics.headStability === undefined) {
    return createNotDetectedResult('HEAD_MOVEMENT', 'Head stability metric not available')
  }

  const headStability = metrics.headStability
  const GOOD_THRESHOLD = FEEDBACK_THRESHOLDS.HEAD_STABILITY.GOOD
  const OK_THRESHOLD = FEEDBACK_THRESHOLDS.HEAD_STABILITY.OK

  // Sanity check: values above 0.6 (60% of body height) are likely measurement errors
  // No golfer moves their head that much - reject as unreliable
  if (headStability > 0.6) {
    return createNotDetectedResult('HEAD_MOVEMENT', 'Measurement unreliable (value too high)')
  }

  // Good stability - no issue (lower value = less movement = better)
  if (headStability < GOOD_THRESHOLD) {
    return {
      mistakeId: 'HEAD_MOVEMENT',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  let severity: number
  let message: string

  if (headStability < OK_THRESHOLD) {
    // Minor head movement
    severity = 30 + ((headStability - GOOD_THRESHOLD) / (OK_THRESHOLD - GOOD_THRESHOLD)) * 30
    message = 'Minor head movement detected. Try to keep your head steadier for more consistent contact.'
  } else {
    // Significant head movement
    severity = 60 + Math.min(40, ((headStability - OK_THRESHOLD) / 0.3) * 40)
    message = 'Significant head movement during swing. Focus on keeping your head still for better consistency.'
  }

  return {
    mistakeId: 'HEAD_MOVEMENT',
    detected: true,
    confidence: 0.85,
    severity,
    message,
    details: `Head movement: ${(headStability * 100).toFixed(0)}% of body height`,
  }
}
