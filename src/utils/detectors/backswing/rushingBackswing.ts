import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult } from '../types'
import { TEMPO } from '@/utils/constants'

/**
 * RUSHING_BACKSWING detector
 * Detects when the backswing is too fast relative to downswing
 *
 * Detection method:
 * - Uses tempo ratio (backswing duration / downswing duration)
 * - Ideal ratio is ~3:1 (backswing 3x longer than downswing)
 * - Low ratio (< 2.5) indicates rushing the backswing
 *
 * A quick backswing prevents proper loading and leads to poor sequencing
 */
export const detectRushingBackswing: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { tempo } = input

  // Ideal tempo ratio is ~3:1
  const RUSHING_THRESHOLD = 2.5
  const SEVERE_RUSHING = 2.0

  if (tempo.tempoRatio >= RUSHING_THRESHOLD) {
    return {
      mistakeId: 'RUSHING_BACKSWING',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on how fast
  const deviation = RUSHING_THRESHOLD - tempo.tempoRatio
  const severity = Math.min(100, (deviation / (RUSHING_THRESHOLD - SEVERE_RUSHING + 0.5)) * 100)

  let message: string
  if (tempo.tempoRatio < SEVERE_RUSHING) {
    message = `Backswing is much too fast (${tempo.tempoRatio.toFixed(1)}:1 ratio). Slow down to allow proper loading.`
  } else {
    message = `Backswing is slightly rushed (${tempo.tempoRatio.toFixed(1)}:1 ratio). Aim for a smoother 3:1 tempo.`
  }

  return {
    mistakeId: 'RUSHING_BACKSWING',
    detected: true,
    confidence: 0.85,
    severity,
    message,
    details: `Tempo ratio: ${tempo.tempoRatio.toFixed(2)}, Ideal: ~${TEMPO.IDEAL_RATIO}`,
  }
}
