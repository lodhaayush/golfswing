import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { logger } from '@/utils/debugLogger'

/**
 * POOR_POSTURE detector
 * Detects if the golfer has improper spine angle at address
 *
 * Detection method:
 * - Check spine angle at address against ideal range
 * - For face-on, spine angle measures lateral tilt (less reliable)
 * - For DTL, spine angle measures forward bend (more reliable)
 *
 * Thresholds:
 * - Driver: 25-45° (more upright)
 * - Iron: 30-55° (more bent over)
 */
export const detectPoorPosture: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { metrics, cameraAngle, clubType } = input

  // Skip for face-on - spine angle shows lateral tilt, not forward bend
  if (cameraAngle === 'face-on') {
    logger.info('POOR_POSTURE: Skipped (face-on camera)')
    return createNotDetectedResult('POOR_POSTURE', 'Requires DTL or oblique camera angle for reliable detection')
  }

  const addressSpineAngle = Math.abs(metrics.addressSpineAngle)

  // Define ideal ranges based on club type
  let idealMin: number
  let idealMax: number

  if (clubType === 'driver') {
    idealMin = 25
    idealMax = 45
  } else if (clubType === 'iron') {
    idealMin = 30
    idealMax = 55
  } else {
    // Unknown club - use generous range
    idealMin = 25
    idealMax = 55
  }

  // Check if spine angle is within ideal range
  const isWithinRange = addressSpineAngle >= idealMin && addressSpineAngle <= idealMax

  logger.info('POOR_POSTURE Debug:', {
    cameraAngle,
    clubType,
    addressSpineAngle: addressSpineAngle.toFixed(1) + '°',
    idealMin: idealMin + '°',
    idealMax: idealMax + '°',
    isWithinRange,
    detected: !isWithinRange,
  })

  if (isWithinRange) {
    return {
      mistakeId: 'POOR_POSTURE',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how far outside the range
  let severity: number
  let message: string

  if (addressSpineAngle < idealMin) {
    // Too upright
    const deviation = idealMin - addressSpineAngle
    severity = Math.min(100, (deviation / 15) * 100)
    message = `Posture is too upright (${Math.round(addressSpineAngle)}°). Try bending more from the hips.`
  } else {
    // Too bent over
    const deviation = addressSpineAngle - idealMax
    severity = Math.min(100, (deviation / 15) * 100)
    message = `Posture is too bent over (${Math.round(addressSpineAngle)}°). Stand a bit more upright at address.`
  }

  return {
    mistakeId: 'POOR_POSTURE',
    detected: true,
    confidence: 0.75,
    severity,
    message,
  }
}
