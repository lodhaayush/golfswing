import type { DetectorInput, DetectorResult } from './types'
import { logger } from '@/utils/debugLogger'

// Setup detectors
import { detectPoorPosture } from './setup/poorPosture'
import { detectStanceWidthIssue } from './setup/stanceWidthIssue'

// Backswing detectors
import { detectSwaying } from './backswing/swaying'
import { detectReversePivot } from './backswing/reversePivot'
import { detectInsufficientShoulderTurn } from './backswing/insufficientShoulderTurn'
import { detectOverRotation } from './backswing/overRotation'
import { detectBentLeadArm } from './backswing/bentLeadArm'
import { detectLiftingHead } from './backswing/liftingHead'

// Downswing detectors
import { detectEarlyExtension } from './downswing/earlyExtension'
import { detectHangingBack } from './downswing/hangingBack'
import { detectLossOfSpineAngle } from './downswing/lossOfSpineAngle'
import { detectSlidingHips } from './downswing/slidingHips'

// Impact detectors
import { detectChickenWing } from './impact/chickenWing'
import { detectPoorArmExtension } from './impact/poorArmExtension'
import { detectHeadMovement } from './impact/headMovement'

// Follow-through detectors
import { detectIncompleteFollowThrough } from './followThrough/incompleteFollowThrough'
import { detectUnbalancedFinish } from './followThrough/unbalancedFinish'
import { detectReverseCFinish } from './followThrough/reverseCFinish'

// Tempo detectors
import { detectPoorTempoRatio } from './tempo/poorTempoRatio'

/**
 * All registered detectors organized by phase
 */
const ALL_DETECTORS = [
  // Setup (2)
  detectPoorPosture,
  detectStanceWidthIssue,
  // Backswing (6)
  detectSwaying,
  detectReversePivot,
  detectInsufficientShoulderTurn,
  detectOverRotation,
  detectBentLeadArm,
  detectLiftingHead,
  // Downswing (4)
  detectEarlyExtension,
  detectHangingBack,
  detectLossOfSpineAngle,
  detectSlidingHips,
  // Impact (3)
  detectChickenWing,
  detectPoorArmExtension,
  detectHeadMovement,
  // Follow-through (3)
  detectIncompleteFollowThrough,
  detectUnbalancedFinish,
  detectReverseCFinish,
  // Tempo (1)
  detectPoorTempoRatio,
]

/**
 * Run all registered detectors and return all results
 * Includes both detected and non-detected results with confidence > 0
 */
export function runAllDetectors(input: DetectorInput): DetectorResult[] {
  logger.info('Running all detectors:', {
    cameraAngle: input.cameraAngle,
    clubType: input.clubType,
    isRightHanded: input.isRightHanded,
    totalFrames: input.frames.length,
    phases: input.phaseSegments.map(p => p.phase),
  })

  const results = ALL_DETECTORS
    .map(detector => detector(input))
    .filter(result => result.detected || result.confidence > 0)

  logger.info('Detector results summary:', {
    totalDetectors: ALL_DETECTORS.length,
    resultsWithConfidence: results.length,
    detected: results.filter(r => r.detected).map(r => ({
      id: r.mistakeId,
      severity: r.severity,
      confidence: r.confidence,
    })),
  })

  return results
}

/**
 * Get only the detected mistakes (detected = true)
 */
export function getDetectedMistakes(input: DetectorInput): DetectorResult[] {
  return runAllDetectors(input).filter(result => result.detected)
}

/**
 * Get detected mistakes sorted by severity (highest first)
 */
export function getDetectedMistakesBySeverity(input: DetectorInput): DetectorResult[] {
  return getDetectedMistakes(input).sort((a, b) => b.severity - a.severity)
}

/**
 * Get top N most severe mistakes
 */
export function getTopMistakes(input: DetectorInput, count: number = 3): DetectorResult[] {
  return getDetectedMistakesBySeverity(input).slice(0, count)
}
