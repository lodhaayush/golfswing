import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { calculateRotationFromWidth } from '@/utils/angleCalculations'

/**
 * SLIDING_HIPS detector
 * Detects when hips slide laterally instead of rotating during downswing
 *
 * Detection method:
 * - Compare hip lateral movement vs hip rotation during downswing
 * - Good swing: hips rotate significantly while lateral movement is controlled
 * - Sliding: excessive lateral movement without corresponding rotation
 *
 * Metric: slide ratio = lateral movement / rotation
 * Low rotation with high lateral = sliding
 *
 * Only reliable for face-on camera angle
 */
export const detectSlidingHips: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, metrics, cameraAngle } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('SLIDING_HIPS', 'Requires face-on camera angle')
  }

  // Use the hipSway metric which captures lateral movement
  if (metrics.hipSway === undefined) {
    return createNotDetectedResult('SLIDING_HIPS', 'Hip sway metric not available')
  }

  // Get hip rotation from metrics
  const hipRotation = metrics.maxHipRotation

  // If hip rotation is very low, any sway is problematic
  // If hip rotation is high, some lateral movement is acceptable

  // Calculate slide ratio (sway per degree of rotation)
  // Higher ratio = more sliding, less rotating
  const effectiveRotation = Math.max(hipRotation, 10) // Avoid division issues
  const slideRatio = (metrics.hipSway * 100) / effectiveRotation

  // Thresholds
  const SLIDE_THRESHOLD = 1.5  // Acceptable sway per degree of rotation
  const SEVERE_THRESHOLD = 2.5 // Severe sliding

  // Also check if hip sway is elevated even if rotation is okay
  const hipSwayElevated = metrics.hipSway > 0.50 // 50% of stance width

  if (slideRatio < SLIDE_THRESHOLD && !hipSwayElevated) {
    return {
      mistakeId: 'SLIDING_HIPS',
      detected: false,
      confidence: 0.8,
      severity: 0,
      message: '',
    }
  }

  const severity = Math.min(100, (slideRatio / (SEVERE_THRESHOLD + 0.5)) * 100)

  let message: string
  if (hipRotation < 25) {
    message = 'Hips are sliding laterally without enough rotation. Focus on turning your hips rather than shifting them.'
  } else if (hipSwayElevated) {
    message = 'Excessive hip slide during downswing despite rotation. Reduce lateral movement while maintaining hip turn.'
  } else {
    message = 'Hip slide ratio is elevated. Work on initiating the downswing with rotation, not lateral movement.'
  }

  return {
    mistakeId: 'SLIDING_HIPS',
    detected: true,
    confidence: 0.75,
    severity,
    message,
    details: `Hip sway: ${(metrics.hipSway * 100).toFixed(0)}%, Hip rotation: ${Math.round(hipRotation)}°`,
  }
}
