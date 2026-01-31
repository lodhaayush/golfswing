import type { PoseFrame } from '@/types/pose'
import type { PhaseSegment, SwingMetrics, TempoMetrics, ClubType } from '@/types/analysis'
import type { SwingMistakeId, SwingMistakeCategory } from '@/types/swingMistakes'
import type { CameraAngle } from '@/utils/angleCalculations'

/**
 * Input provided to every detector
 * Contains all available data from swing analysis
 */
export interface DetectorInput {
  frames: PoseFrame[]
  phaseSegments: PhaseSegment[]
  metrics: SwingMetrics
  tempo: TempoMetrics
  isRightHanded: boolean
  cameraAngle: CameraAngle
  clubType: ClubType
  clubTypeOverridden: boolean  // True if user manually set the club type
}

/**
 * Output from each detector
 * Standardized result format for all mistake detections
 */
export interface DetectorResult {
  mistakeId: SwingMistakeId
  detected: boolean
  confidence: number        // 0-1, how confident in the detection
  severity: number          // 0-100, how severe the issue
  message: string           // User-facing feedback
  details?: string          // Additional technical details
  affectedFrames?: number[] // Frame indices where issue occurs
}

/**
 * Detector function signature
 * Each detector receives full input and returns standardized result
 */
export type MistakeDetector = (input: DetectorInput) => DetectorResult

/**
 * Helper to get the category from a mistake ID
 */
export function getCategoryFromMistakeId(mistakeId: SwingMistakeId): SwingMistakeCategory {
  const categoryMap: Record<SwingMistakeId, SwingMistakeCategory> = {
    // Setup
    POOR_POSTURE: 'setup',
    POOR_ALIGNMENT: 'setup',
    INCORRECT_BALL_POSITION: 'setup',
    INCORRECT_GRIP: 'setup',
    STANCE_WIDTH_ISSUE: 'setup',
    // Backswing
    SWAYING: 'backswing',
    REVERSE_PIVOT: 'backswing',
    INSUFFICIENT_SHOULDER_TURN: 'backswing',
    OVER_ROTATION: 'backswing',
    BENT_LEAD_ARM: 'backswing',
    LIFTING_HEAD: 'backswing',
    POOR_WRIST_HINGE: 'backswing',
    // Downswing
    OVER_THE_TOP: 'downswing',
    CASTING: 'downswing',
    EARLY_EXTENSION: 'downswing',
    HANGING_BACK: 'downswing',
    LOSS_OF_SPINE_ANGLE: 'downswing',
    SLIDING_HIPS: 'downswing',
    // Impact
    SCOOPING: 'impact',
    CHICKEN_WING: 'impact',
    POOR_ARM_EXTENSION: 'impact',
    HEAD_MOVEMENT: 'impact',
    FLIPPING: 'impact',
    // Follow-through
    INCOMPLETE_FOLLOW_THROUGH: 'follow-through',
    UNBALANCED_FINISH: 'follow-through',
    REVERSE_C_FINISH: 'follow-through',
    DECELERATING_THROUGH_IMPACT: 'follow-through',
    // Tempo
    POOR_TEMPO_RATIO: 'tempo',
    RUSHING_TRANSITION: 'tempo',
    SWINGING_TOO_HARD: 'tempo',
    // Ball flight
    SLICE: 'ball-flight',
    HOOK: 'ball-flight',
    PUSH: 'ball-flight',
    PULL: 'ball-flight',
    TOPPED_SHOT: 'ball-flight',
    FAT_SHOT: 'ball-flight',
    THIN_SHOT: 'ball-flight',
  }
  return categoryMap[mistakeId]
}

/**
 * Helper to create a "not detected" result
 */
export function createNotDetectedResult(
  mistakeId: SwingMistakeId,
  details?: string
): DetectorResult {
  return {
    mistakeId,
    detected: false,
    confidence: 0,
    severity: 0,
    message: '',
    details,
  }
}

/**
 * Helper to find frame indices for a specific phase
 */
export function getPhaseFrameIndices(
  phaseSegments: PhaseSegment[],
  phaseName: string
): { startFrame: number; endFrame: number } | null {
  const segment = phaseSegments.find(s => s.phase === phaseName)
  if (!segment) return null
  return { startFrame: segment.startFrame, endFrame: segment.endFrame }
}
