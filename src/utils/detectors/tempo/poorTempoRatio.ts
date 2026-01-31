import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { TEMPO } from '@/utils/constants'
import { logger } from '@/utils/debugLogger'

/**
 * POOR_TEMPO_RATIO detector
 * Detects when the swing tempo deviates significantly from ideal
 *
 * Detection method:
 * - Uses tempo ratio (backswing duration / downswing duration)
 * - Ideal ratio is ~3:1
 * - Too fast or too slow indicates tempo issues
 *
 * This detector covers both rushing and slow tempo
 */
export const detectPoorTempoRatio: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { tempo } = input

  const tempoRatio = tempo.tempoRatio
  const IDEAL_RATIO = TEMPO.IDEAL_RATIO
  const EXCELLENT_TOLERANCE = TEMPO.EXCELLENT_TOLERANCE
  const GOOD_TOLERANCE = TEMPO.GOOD_TOLERANCE

  // Calculate deviation from ideal
  const deviation = Math.abs(tempoRatio - IDEAL_RATIO)

  logger.info('POOR_TEMPO_RATIO Debug:', {
    tempoRatio: tempoRatio.toFixed(2),
    idealRatio: IDEAL_RATIO,
    deviation: deviation.toFixed(2),
    excellentTolerance: EXCELLENT_TOLERANCE,
    goodTolerance: GOOD_TOLERANCE,
    detected: deviation > GOOD_TOLERANCE,
    backswingDuration: tempo.backswingDuration?.toFixed(2) + 's',
    downswingDuration: tempo.downswingDuration?.toFixed(2) + 's',
  })

  // Excellent or good tempo - no issue
  if (deviation <= GOOD_TOLERANCE) {
    return {
      mistakeId: 'POOR_TEMPO_RATIO',
      detected: false,
      confidence: 0.9,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on deviation
  const severity = Math.min(100, ((deviation - GOOD_TOLERANCE) / 1.5) * 100)

  let message: string
  if (tempoRatio < IDEAL_RATIO - GOOD_TOLERANCE) {
    // Rushing
    if (tempoRatio < 2.0) {
      message = `Tempo is very rushed (${tempoRatio.toFixed(1)}:1). Slow down your backswing for better rhythm.`
    } else {
      message = `Tempo is slightly quick (${tempoRatio.toFixed(1)}:1). Aim for a smoother 3:1 backswing to downswing ratio.`
    }
  } else {
    // Too slow
    if (tempoRatio > 4.5) {
      message = `Tempo is very slow (${tempoRatio.toFixed(1)}:1). A quicker transition may help generate power.`
    } else {
      message = `Tempo is slightly slow (${tempoRatio.toFixed(1)}:1). Consider a slightly quicker transition.`
    }
  }

  return {
    mistakeId: 'POOR_TEMPO_RATIO',
    detected: true,
    confidence: 0.85,
    severity,
    message,
    details: `Ratio: ${tempoRatio.toFixed(2)}, Ideal: ~${IDEAL_RATIO}:1`,
  }
}
