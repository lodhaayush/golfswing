import type { TempoMetrics, PhaseSegment, SwingPhase } from '@/types/analysis'
import type { PhaseFrame } from './phaseDetection'

/**
 * Convert per-frame phases into consolidated phase segments
 */
export function consolidatePhases(phases: PhaseFrame[]): PhaseSegment[] {
  if (phases.length === 0) return []

  const segments: PhaseSegment[] = []
  let currentSegment: PhaseSegment | null = null

  for (const frame of phases) {
    if (!currentSegment || currentSegment.phase !== frame.phase) {
      // Start a new segment
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = {
        phase: frame.phase,
        startFrame: frame.frameIndex,
        endFrame: frame.frameIndex,
        startTime: frame.timestamp,
        endTime: frame.timestamp,
        duration: 0,
      }
    } else {
      // Extend current segment
      currentSegment.endFrame = frame.frameIndex
      currentSegment.endTime = frame.timestamp
      currentSegment.duration = currentSegment.endTime - currentSegment.startTime
    }
  }

  // Add the last segment
  if (currentSegment) {
    segments.push(currentSegment)
  }

  return segments
}

/**
 * Find a specific phase segment
 */
function findPhaseSegment(
  segments: PhaseSegment[],
  phase: SwingPhase
): PhaseSegment | undefined {
  return segments.find((s) => s.phase === phase)
}

/**
 * Calculate tempo metrics from phase segments
 */
export function calculateTempoMetrics(segments: PhaseSegment[]): TempoMetrics {
  const backswingSegment = findPhaseSegment(segments, 'backswing')
  const downswingSegment = findPhaseSegment(segments, 'downswing')
  const addressSegment = findPhaseSegment(segments, 'address')
  const finishSegment = findPhaseSegment(segments, 'finish')

  // Calculate durations
  const backswingDuration = backswingSegment?.duration ?? 0
  const downswingDuration = downswingSegment?.duration ?? 0

  // Calculate total swing duration (from first backswing movement to impact)
  const impactSegment = findPhaseSegment(segments, 'impact')
  let totalSwingDuration = 0

  if (backswingSegment && impactSegment) {
    totalSwingDuration = impactSegment.endTime - backswingSegment.startTime
  } else if (addressSegment && finishSegment) {
    totalSwingDuration = finishSegment.endTime - addressSegment.startTime
  }

  // Calculate tempo ratio (ideal is ~3:1 for amateur golfers, pros often 2.5:1)
  const tempoRatio = downswingDuration > 0 ? backswingDuration / downswingDuration : 0

  return {
    backswingDuration,
    downswingDuration,
    tempoRatio,
    totalSwingDuration,
  }
}

/**
 * Evaluate tempo quality and provide feedback
 */
export interface TempoEvaluation {
  rating: 'excellent' | 'good' | 'needs-work' | 'poor'
  score: number // 0-100
  feedback: string
  idealRatio: number
  actualRatio: number
}

export function evaluateTempo(tempo: TempoMetrics): TempoEvaluation {
  const idealRatio = 3.0 // 3:1 is the target for most amateur golfers
  const actualRatio = tempo.tempoRatio

  let rating: TempoEvaluation['rating']
  let score: number
  let feedback: string

  if (actualRatio === 0) {
    return {
      rating: 'poor',
      score: 0,
      feedback: 'Unable to calculate tempo. Make sure the full swing is visible.',
      idealRatio,
      actualRatio,
    }
  }

  // Use logarithmic scaling for ratio comparison to handle edge cases better
  // (e.g., slow-motion videos, unusual swing styles)
  const logActual = Math.log(actualRatio)
  const logIdeal = Math.log(idealRatio)
  const logDifference = Math.abs(logActual - logIdeal)

  if (logDifference <= 0.1) {
    rating = 'excellent'
    score = 95 - logDifference * 30
    feedback = 'Excellent tempo! Your backswing to downswing ratio is near ideal.'
  } else if (logDifference <= 0.25) {
    rating = 'good'
    score = 85 - (logDifference - 0.1) * 50
    feedback = 'Good tempo. Minor adjustment could improve consistency.'
  } else if (logDifference <= 0.5) {
    rating = 'needs-work'
    score = 70 - (logDifference - 0.25) * 60
    if (actualRatio < idealRatio) {
      feedback = 'Your backswing is too quick. Try slowing down your takeaway.'
    } else {
      feedback = 'Your downswing is relatively slow. Focus on accelerating through the ball.'
    }
  } else {
    rating = 'poor'
    // More gradual falloff for extreme cases (slow-mo videos, unusual timing)
    score = Math.max(40, 55 - (logDifference - 0.5) * 30)
    if (actualRatio < idealRatio) {
      feedback = 'Rushing your backswing significantly. Practice a slower, smoother takeaway.'
    } else {
      feedback = 'Unusual tempo detected. This may indicate slow-motion video or phase detection limits.'
    }
  }

  return {
    rating,
    score: Math.round(Math.max(0, Math.min(100, score))),
    feedback,
    idealRatio,
    actualRatio,
  }
}

/**
 * Format tempo ratio for display
 */
export function formatTempoRatio(ratio: number): string {
  if (ratio === 0 || !isFinite(ratio)) return 'N/A'
  return `${ratio.toFixed(1)}:1`
}

/**
 * Format duration for display (in seconds)
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return 'N/A'
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }
  return `${seconds.toFixed(2)}s`
}
