import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { FEEDBACK_THRESHOLDS } from '@/utils/constants'
import { logger } from '@/utils/debugLogger'

/**
 * BENT_LEAD_ARM detector
 * Detects when the lead arm is excessively bent at top of backswing
 *
 * Detection method:
 * - Uses topLeadArmExtension from metrics
 * - Lead arm extension is elbow angle (180° = fully straight)
 * - Bent lead arm reduces swing arc and power
 *
 * Thresholds vary by camera angle:
 * - Face-on: Good >= 140°, OK >= 120° (arm partially occluded)
 * - DTL/Oblique: Good >= 160°, OK >= 140°
 */
export const detectBentLeadArm: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle } = input

  const topLeadArmExtension = metrics.topLeadArmExtension
  const thresholds = cameraAngle === 'face-on'
    ? FEEDBACK_THRESHOLDS.LEAD_ARM.FACE_ON
    : FEEDBACK_THRESHOLDS.LEAD_ARM.DEFAULT

  logger.info('BENT_LEAD_ARM Debug:', {
    cameraAngle,
    topLeadArmExtension: topLeadArmExtension.toFixed(1) + '°',
    goodThreshold: thresholds.GOOD + '°',
    okThreshold: thresholds.OK + '°',
    detected: topLeadArmExtension < thresholds.GOOD,
  })

  // If arm is well extended, no issue
  if (topLeadArmExtension >= thresholds.GOOD) {
    return {
      mistakeId: 'BENT_LEAD_ARM',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how bent
  let severity: number
  let message: string

  if (topLeadArmExtension >= thresholds.OK) {
    // Slight bend
    severity = 30 + ((thresholds.GOOD - topLeadArmExtension) / (thresholds.GOOD - thresholds.OK)) * 30
    message = 'Slightly bent lead arm at top. Work on keeping it straighter for more width in your swing.'
  } else {
    // Significant bend
    severity = 60 + Math.min(40, ((thresholds.OK - topLeadArmExtension) / 40) * 40)
    message = `Lead arm is quite bent at top (${Math.round(topLeadArmExtension)}°). This reduces your swing arc and power.`
  }

  return {
    mistakeId: 'BENT_LEAD_ARM',
    detected: true,
    confidence: cameraAngle === 'face-on' ? 0.7 : 0.85,
    severity,
    message,
  }
}
