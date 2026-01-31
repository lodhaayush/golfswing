import type { PoseFrame } from '@/types/pose'
import { POSE_LANDMARKS } from '@/types/pose'
import type { AnalysisResult, SwingMetrics, PhaseSegment, ClubType } from '@/types/analysis'
import type { CameraAngle } from './angleCalculations'
import { detectSwingPhases, type PhaseFrame as DetectedPhaseFrame } from './phaseDetection'
import { consolidatePhases, calculateTempoMetrics, evaluateTempo } from './tempoAnalysis'
import {
  detectCameraAngleFromFrames,
  detectClubTypeFromFrames,
  calculateRotationFromWidth,
  calculateHipSway,
  calculateHeadStability,
  calculateImpactExtension,
} from './angleCalculations'
import { logger } from './debugLogger'
import {
  SCORING_WEIGHTS,
  SCORING_RANGES,
  CLUB_SCORING,
  FEEDBACK_THRESHOLDS,
  DEFAULTS,
} from './constants'
import { getDetectedMistakes, type DetectorInput } from './detectors'
import type { DetectorResult } from './detectors/types'

/**
 * Generate a unique ID for the analysis
 */
function generateId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate the shortest angular difference between two angles in degrees
 * Handles wrap-around at +/-180 degrees
 */
function angularDifference(angle1: number, angle2: number): number {
  let diff = angle1 - angle2
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return diff
}

/**
 * Calculate the median of an array of numbers
 * Returns undefined if the array is empty
 */
function calculateMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Calculate aggregate swing metrics from phase frames
 * Rotations are calculated differently based on camera angle:
 * - Face-on: Uses width-narrowing method (reliable)
 * - DTL: Rotations set to 0 (unreliable from down-the-line view)
 * - Oblique: Uses Z-based rotation (best effort)
 */
function calculateSwingMetrics(
  phases: DetectedPhaseFrame[],
  frames: PoseFrame[],
  isRightHanded: boolean,
  cameraAngle: CameraAngle
): SwingMetrics {
  // Find key frames by phase - use array indices since phases[i] corresponds to frames[i]
  const addressPhaseIdx = phases.findIndex((p) => p.phase === 'address')
  const topPhaseIdx = phases.findIndex((p) => p.phase === 'top')
  const impactPhaseIdx = phases.findIndex((p) => p.phase === 'impact')
  // followThroughPhaseIdx is available if needed in future

  // Find end of address phase (last consecutive address frame)
  let addressEndIdx = addressPhaseIdx
  for (let i = addressPhaseIdx + 1; i < phases.length; i++) {
    if (phases[i].phase === 'address') {
      addressEndIdx = i
    } else {
      break
    }
  }

  const addressFrame = addressPhaseIdx >= 0 ? phases[addressPhaseIdx] : null
  const topFrame = topPhaseIdx >= 0 ? phases[topPhaseIdx] : null
  const impactFrame = impactPhaseIdx >= 0 ? phases[impactPhaseIdx] : null

  // Debug: Log lead arm landmarks at top of backswing
  if (topPhaseIdx >= 0) {
    const topLandmarks = frames[topPhaseIdx]?.landmarks
    if (topLandmarks) {
      // Lead arm is left for right-handed, right for left-handed
      const shoulderIdx = isRightHanded ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER
      const elbowIdx = isRightHanded ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
      const wristIdx = isRightHanded ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST

      const shoulder = topLandmarks[shoulderIdx]
      const elbow = topLandmarks[elbowIdx]
      const wrist = topLandmarks[wristIdx]

      logger.info('Lead Arm Landmarks at Top:', {
        cameraAngle,
        isRightHanded,
        leadArmExtension: topFrame?.metrics.leftArmExtension?.toFixed(1) + '° (2D)',
        shoulder: { x: shoulder?.x?.toFixed(3), y: shoulder?.y?.toFixed(3), vis: shoulder?.visibility?.toFixed(2) },
        elbow: { x: elbow?.x?.toFixed(3), y: elbow?.y?.toFixed(3), vis: elbow?.visibility?.toFixed(2) },
        wrist: { x: wrist?.x?.toFixed(3), y: wrist?.y?.toFixed(3), vis: wrist?.visibility?.toFixed(2) },
      })
    }
  }

  // Calculate median spine angle from address phase for robustness against outliers
  const addressSpineAngles: number[] = []
  for (let i = addressPhaseIdx; i <= addressEndIdx && i >= 0; i++) {
    const spineAngle = phases[i]?.metrics.spineAngle
    if (spineAngle !== undefined && !isNaN(spineAngle)) {
      addressSpineAngles.push(spineAngle)
    }
  }
  const medianAddressSpineAngle = calculateMedian(addressSpineAngles) ?? (addressFrame?.metrics.spineAngle ?? 0)

  // Calculate median spine angle around impact (±2 frames) for robustness
  const impactSpineAngles: number[] = []
  const impactWindow = 2
  const impactStart = Math.max(0, impactPhaseIdx - impactWindow)
  const impactEnd = Math.min(phases.length - 1, impactPhaseIdx + impactWindow)
  for (let i = impactStart; i <= impactEnd && impactPhaseIdx >= 0; i++) {
    const spineAngle = phases[i]?.metrics.spineAngle
    if (spineAngle !== undefined && !isNaN(spineAngle)) {
      impactSpineAngles.push(spineAngle)
    }
  }
  const medianImpactSpineAngle = calculateMedian(impactSpineAngles) ?? (impactFrame?.metrics.spineAngle ?? 0)

  // Get address landmarks for baseline - use array index, not frameIndex
  const addressLandmarks = addressPhaseIdx >= 0
    ? frames[addressPhaseIdx]?.landmarks
    : frames[0]?.landmarks

  let maxHipRotation = 0
  let maxShoulderRotation = 0
  let maxXFactor = 0

  // For rotation metrics, we measure at top of backswing (not max across all frames,
  // which would include finish position where body is fully rotated)
  const rotationEndIdx = impactPhaseIdx >= 0 ? impactPhaseIdx : phases.length

  if (cameraAngle === 'face-on' && addressLandmarks) {
    // Use width-based rotation for face-on (reliable)
    // Only measure rotation from address through impact (not finish)
    for (let i = 0; i < rotationEndIdx; i++) {
      const frameLandmarks = frames[i]?.landmarks
      if (!frameLandmarks) continue

      const shoulderRotation = calculateRotationFromWidth(frameLandmarks, addressLandmarks, 'shoulders')
      const hipRotation = calculateRotationFromWidth(frameLandmarks, addressLandmarks, 'hips')
      const xFactor = Math.abs(shoulderRotation - hipRotation)

      if (shoulderRotation > maxShoulderRotation) maxShoulderRotation = shoulderRotation
      if (hipRotation > maxHipRotation) maxHipRotation = hipRotation
      if (xFactor > maxXFactor) maxXFactor = xFactor
    }
  } else if (cameraAngle === 'dtl') {
    // DTL: rotation metrics are unreliable, set to 0
    maxHipRotation = 0
    maxShoulderRotation = 0
    maxXFactor = 0
  } else {
    // Oblique or unknown: use original Z-based calculation
    const baselineHipRotation = addressFrame?.metrics.hipRotation ?? 0
    const baselineShoulderRotation = addressFrame?.metrics.shoulderRotation ?? 0

    for (const phase of phases) {
      const relativeHipRotation = angularDifference(phase.metrics.hipRotation, baselineHipRotation)
      const relativeShoulderRotation = angularDifference(phase.metrics.shoulderRotation, baselineShoulderRotation)
      const relativeXFactor = relativeShoulderRotation - relativeHipRotation

      const absHipRotation = Math.abs(relativeHipRotation)
      const absShoulderRotation = Math.abs(relativeShoulderRotation)
      const absXFactor = Math.abs(relativeXFactor)

      if (absHipRotation > maxHipRotation) maxHipRotation = absHipRotation
      if (absShoulderRotation > maxShoulderRotation) maxShoulderRotation = absShoulderRotation
      if (absXFactor > maxXFactor) maxXFactor = absXFactor
    }
  }

  // Determine lead arm based on handedness
  const getLeadArmExtension = (metrics: DetectedPhaseFrame['metrics']) => {
    return isRightHanded ? metrics.leftArmExtension : metrics.rightArmExtension
  }

  const getLeadKneeFlex = (metrics: DetectedPhaseFrame['metrics']) => {
    return isRightHanded ? metrics.leftKneeFlex : metrics.rightKneeFlex
  }

  // Calculate face-on specific metrics
  let hipSway: number | undefined
  let headStability: number | undefined
  let impactExtension: number | undefined

  if (cameraAngle === 'face-on' && addressLandmarks) {
    // Calculate hip sway and head stability from backswing through impact
    // (not including address setup or follow-through)
    const stabilityStartIdx = addressEndIdx + 1
    const stabilityEndIdx = impactPhaseIdx >= 0 ? impactPhaseIdx + 1 : frames.length
    const swingLandmarks = frames.slice(stabilityStartIdx, stabilityEndIdx).map(f => f.landmarks)
    const addressPhaseLandmarks = frames.slice(0, addressEndIdx + 1).map(f => f.landmarks)

    hipSway = calculateHipSway(swingLandmarks, addressLandmarks)
    headStability = calculateHeadStability(swingLandmarks, addressPhaseLandmarks, addressLandmarks)

    // Calculate impact extension - sample frames after impact
    if (impactPhaseIdx >= 0) {
      const impactLandmarks = frames[impactPhaseIdx]?.landmarks
      // Sample 5 frames after impact for median calculation
      const postImpactStart = impactPhaseIdx + 1
      const postImpactEnd = Math.min(impactPhaseIdx + 6, frames.length)
      const postImpactFrames = frames.slice(postImpactStart, postImpactEnd).map(f => f.landmarks)

      if (impactLandmarks) {
        impactExtension = calculateImpactExtension(impactLandmarks, postImpactFrames, isRightHanded)
      }
    }

    logger.info('Face-on specific metrics:', {
      hipSway: hipSway?.toFixed(2),
      headStability: headStability?.toFixed(2),
      impactExtension: impactExtension?.toFixed(2),
    })
  }

  return {
    maxHipRotation,
    maxShoulderRotation,
    maxXFactor,
    addressSpineAngle: medianAddressSpineAngle,
    topSpineAngle: topFrame?.metrics.spineAngle ?? 0,
    impactSpineAngle: medianImpactSpineAngle,
    topLeadArmExtension: topFrame ? getLeadArmExtension(topFrame.metrics) : 180,
    impactLeadArmExtension: impactFrame ? getLeadArmExtension(impactFrame.metrics) : 180,
    addressKneeFlex: addressFrame ? getLeadKneeFlex(addressFrame.metrics) : 180,
    topKneeFlex: topFrame ? getLeadKneeFlex(topFrame.metrics) : 180,
    // Face-on specific metrics
    hipSway,
    headStability,
    impactExtension,
  }
}

/**
 * Calculate overall swing score based on metrics
 * Weights are adjusted based on camera angle since rotation metrics
 * are unreliable for DTL (down-the-line) videos
 * Face-on includes additional metrics: hip sway, head stability, impact extension
 * Scoring ranges are adjusted based on club type (driver vs iron)
 */
function calculateOverallScore(
  metrics: SwingMetrics,
  tempoScore: number,
  cameraAngle: 'face-on' | 'dtl' | 'oblique',
  clubType: ClubType
): number {
  const scores: number[] = []

  const isFaceOn = cameraAngle === 'face-on'
  const isDTL = cameraAngle === 'dtl'

  // Select weights based on camera angle
  const weights = isDTL
    ? SCORING_WEIGHTS.DTL
    : isFaceOn
    ? SCORING_WEIGHTS.FACE_ON
    : SCORING_WEIGHTS.OBLIQUE

  // Get club-specific ranges, fall back to defaults for unknown
  const clubRanges = clubType === 'driver'
    ? CLUB_SCORING.DRIVER
    : clubType === 'iron'
    ? CLUB_SCORING.IRON
    : null

  // X-Factor score (use club-specific if available)
  const xFactorRanges = clubRanges?.X_FACTOR ?? SCORING_RANGES.X_FACTOR
  const xFactorScore = scoreInRange(
    metrics.maxXFactor,
    xFactorRanges.IDEAL_MIN,
    xFactorRanges.IDEAL_MAX,
    xFactorRanges.ABS_MIN,
    xFactorRanges.ABS_MAX
  )
  scores.push(xFactorScore * weights.xFactor)

  // Shoulder rotation score (use club-specific if available)
  const defaultShoulderRanges = isFaceOn ? SCORING_RANGES.SHOULDER.FACE_ON : SCORING_RANGES.SHOULDER.DEFAULT
  const clubShoulderRanges = clubRanges
    ? (isFaceOn ? clubRanges.SHOULDER.FACE_ON : clubRanges.SHOULDER.DEFAULT)
    : null
  const shoulderRanges = clubShoulderRanges ?? defaultShoulderRanges
  const shoulderScore = scoreInRange(
    metrics.maxShoulderRotation,
    shoulderRanges.IDEAL_MIN,
    shoulderRanges.IDEAL_MAX,
    shoulderRanges.ABS_MIN,
    shoulderRanges.ABS_MAX
  )
  scores.push(shoulderScore * weights.shoulder)

  // Hip rotation score (use club-specific if available)
  const defaultHipRanges = isFaceOn ? SCORING_RANGES.HIP.FACE_ON : SCORING_RANGES.HIP.DEFAULT
  const clubHipRanges = clubRanges
    ? (isFaceOn ? clubRanges.HIP.FACE_ON : clubRanges.HIP.DEFAULT)
    : null
  const hipRanges = clubHipRanges ?? defaultHipRanges
  const hipScore = scoreInRange(
    metrics.maxHipRotation,
    hipRanges.IDEAL_MIN,
    hipRanges.IDEAL_MAX,
    hipRanges.ABS_MIN,
    hipRanges.ABS_MAX
  )
  scores.push(hipScore * weights.hip)

  // Spine angle consistency
  const spineTolerance = isFaceOn
    ? SCORING_RANGES.SPINE_TOLERANCE.FACE_ON
    : SCORING_RANGES.SPINE_TOLERANCE.DEFAULT
  const spineConsistency = 100 - Math.min(100, Math.abs(metrics.addressSpineAngle - metrics.impactSpineAngle) * spineTolerance)
  scores.push(spineConsistency * weights.spine)

  // Lead arm extension at top (use club-specific if available)
  const defaultLeadArmRanges = isFaceOn ? SCORING_RANGES.LEAD_ARM.FACE_ON : SCORING_RANGES.LEAD_ARM.DEFAULT
  const clubLeadArmRanges = clubRanges
    ? (isFaceOn ? clubRanges.LEAD_ARM.FACE_ON : clubRanges.LEAD_ARM.DEFAULT)
    : null
  const leadArmRanges = clubLeadArmRanges ?? defaultLeadArmRanges
  const leadArmScore = scoreInRange(
    metrics.topLeadArmExtension,
    leadArmRanges.IDEAL_MIN,
    leadArmRanges.IDEAL_MAX,
    leadArmRanges.ABS_MIN,
    leadArmRanges.ABS_MAX
  )
  scores.push(leadArmScore * weights.leadArm)

  // Tempo score
  scores.push(tempoScore * weights.tempo)

  // Face-on specific metrics
  if (isFaceOn) {
    // Hip sway score (lower is better)
    const hipSwayValue = metrics.hipSway ?? DEFAULTS.HIP_SWAY
    const hipSwayScore = scoreInRange(
      1 - hipSwayValue,
      SCORING_RANGES.HIP_SWAY.IDEAL_MIN,
      SCORING_RANGES.HIP_SWAY.IDEAL_MAX,
      SCORING_RANGES.HIP_SWAY.ABS_MIN,
      SCORING_RANGES.HIP_SWAY.ABS_MAX
    )
    scores.push(hipSwayScore * weights.hipSway)

    // Head stability score (lower is better)
    const headStabilityValue = metrics.headStability ?? DEFAULTS.HEAD_STABILITY
    const headStabilityScore = scoreInRange(
      1 - headStabilityValue,
      SCORING_RANGES.HEAD_STABILITY.IDEAL_MIN,
      SCORING_RANGES.HEAD_STABILITY.IDEAL_MAX,
      SCORING_RANGES.HEAD_STABILITY.ABS_MIN,
      SCORING_RANGES.HEAD_STABILITY.ABS_MAX
    )
    scores.push(headStabilityScore * weights.headStability)

    // Impact extension score (higher is better)
    const impactExtensionValue = metrics.impactExtension ?? DEFAULTS.IMPACT_EXTENSION
    const impactExtensionScore = scoreInRange(
      impactExtensionValue,
      SCORING_RANGES.IMPACT_EXTENSION.IDEAL_MIN,
      SCORING_RANGES.IMPACT_EXTENSION.IDEAL_MAX,
      SCORING_RANGES.IMPACT_EXTENSION.ABS_MIN,
      SCORING_RANGES.IMPACT_EXTENSION.ABS_MAX
    )
    scores.push(impactExtensionScore * weights.impactExtension)
  }

  return Math.round(scores.reduce((a, b) => a + b, 0))
}

/**
 * Score a value based on ideal range
 */
function scoreInRange(
  value: number,
  idealMin: number,
  idealMax: number,
  absoluteMin: number,
  absoluteMax: number
): number {
  if (value >= idealMin && value <= idealMax) {
    return 100
  }

  if (value < idealMin) {
    const range = idealMin - absoluteMin
    const distance = idealMin - value
    return Math.max(0, 100 - (distance / range) * 100)
  }

  const range = absoluteMax - idealMax
  const distance = value - idealMax
  return Math.max(0, 100 - (distance / range) * 100)
}

/**
 * Calculate score penalty based on detected swing mistakes
 * Higher severity and confidence = higher penalty
 * Capped to prevent excessive deductions
 */
function calculateMistakePenalty(detectedMistakes: DetectorResult[]): number {
  if (!detectedMistakes || detectedMistakes.length === 0) return 0

  let totalPenalty = 0
  for (const mistake of detectedMistakes) {
    // Severity tiers: High (70+) = 5pts, Medium (40-69) = 3pts, Low (<40) = 1pt
    const basePenalty = mistake.severity >= 70 ? 5 : mistake.severity >= 40 ? 3 : 1
    // Weight by detection confidence
    totalPenalty += basePenalty * mistake.confidence
  }

  // Cap at 25 points to prevent crushing scores
  return Math.min(25, Math.round(totalPenalty))
}

/**
 * Options for swing analysis
 */
export interface AnalyzeSwingOptions {
  /** Override the auto-detected club type */
  clubTypeOverride?: ClubType
}

/**
 * Main function to analyze a complete golf swing
 */
export function analyzeSwing(
  frames: PoseFrame[],
  videoId: string,
  options?: AnalyzeSwingOptions
): AnalysisResult {
  const clubTypeOverride = options?.clubTypeOverride

  // Detect camera angle from early frames
  const cameraAngleResult = detectCameraAngleFromFrames(frames.map(f => f.landmarks))
  logger.info('Camera Angle Detection:', {
    angle: cameraAngleResult.angle,
    confidence: cameraAngleResult.confidence.toFixed(2),
    ratio: cameraAngleResult.ratio.toFixed(2),
  })

  // Detect swing phases first (needed for address phase detection)
  const phaseResult = detectSwingPhases(frames)

  // Log key frame indices for debugging consistency
  logger.info('Key Frame Indices:', {
    addressFrameIdx: phaseResult.keyFrames.address?.frameIndex ?? null,
    topOfBackswingIdx: phaseResult.keyFrames.topOfBackswing?.frameIndex ?? null,
    impactFrameIdx: phaseResult.keyFrames.impact?.frameIndex ?? null,
    finishFrameIdx: phaseResult.keyFrames.finish?.frameIndex ?? null,
    totalFrames: frames.length,
  })

  // Detect club type from address phase frames (more stable than first 5 frames)
  // Find the end of address phase from the phases array
  let addressPhaseEndIdx = 0
  for (let i = 0; i < phaseResult.phases.length; i++) {
    if (phaseResult.phases[i].phase === 'address') {
      addressPhaseEndIdx = i
    } else {
      break // Address phase is contiguous from start
    }
  }

  // Sample frames from the middle/end of address phase when golfer is settled
  const sampleEndIdx = addressPhaseEndIdx
  const sampleStartIdx = Math.max(0, sampleEndIdx - 10)
  const addressFrames = frames.slice(sampleStartIdx, sampleEndIdx + 1).map(f => f.landmarks)

  // Fall back to first frames if address phase is too short
  const clubDetectionFrames = addressFrames.length >= 3
    ? addressFrames
    : frames.map(f => f.landmarks)

  const clubTypeResult = detectClubTypeFromFrames(clubDetectionFrames, cameraAngleResult.angle)

  // Use override if provided, otherwise use detected value
  const finalClubType: ClubType = clubTypeOverride ?? clubTypeResult.clubType
  const clubTypeOverridden = clubTypeOverride !== undefined

  logger.info('Club Type Detection:', {
    clubType: finalClubType,
    detectedClubType: clubTypeResult.clubType,
    overridden: clubTypeOverridden,
    confidence: clubTypeResult.confidence.toFixed(2),
    stanceRatio: clubTypeResult.signals.stanceRatio.toFixed(2),
    handDistance: clubTypeResult.signals.handDistance.toFixed(2),
    spineAngle: clubTypeResult.signals.spineAngle.toFixed(1),
    armExtension: clubTypeResult.signals.armExtension.toFixed(3),
    kneeFlexAngle: clubTypeResult.signals.kneeFlexAngle.toFixed(1),
    sampledFrames: `${sampleStartIdx}-${sampleEndIdx}`,
  })

  // Consolidate phases into segments
  const phaseSegments: PhaseSegment[] = consolidatePhases(phaseResult.phases)

  // Log phase segments in copy-paste format for proVideos.ts
  logger.info('Phase Segments for proVideos.ts:', phaseSegments.map(seg => ({
    phase: seg.phase,
    startFrame: seg.startFrame,
    endFrame: seg.endFrame,
    startTime: Number(seg.startTime.toFixed(3)),
    endTime: Number(seg.endTime.toFixed(3)),
    duration: Number(seg.duration.toFixed(3)),
  })))

  // Calculate tempo metrics
  const tempo = calculateTempoMetrics(phaseSegments)
  const tempoEvaluation = evaluateTempo(tempo)

  // Calculate swing metrics (now with camera angle for proper rotation calculation)
  const metrics = calculateSwingMetrics(
    phaseResult.phases,
    frames,
    phaseResult.isRightHanded,
    cameraAngleResult.angle
  )

  // Log normalized swing metrics for debugging
  logger.info('Swing Metrics (normalized to address):', {
    maxXFactor: metrics.maxXFactor.toFixed(1),
    maxShoulderRotation: metrics.maxShoulderRotation.toFixed(1),
    maxHipRotation: metrics.maxHipRotation.toFixed(1),
    addressSpineAngle: metrics.addressSpineAngle.toFixed(1),
    impactSpineAngle: metrics.impactSpineAngle.toFixed(1),
  })

  // Run modular mistake detectors
  const detectorInput: DetectorInput = {
    frames,
    phaseSegments,
    metrics,
    tempo,
    isRightHanded: phaseResult.isRightHanded,
    cameraAngle: cameraAngleResult.angle,
    clubType: finalClubType,
    clubTypeOverridden,
  }
  const detectedMistakes = getDetectedMistakes(detectorInput)

  logger.info('Detected Mistakes:', {
    count: detectedMistakes.length,
    mistakes: detectedMistakes.map(m => ({ id: m.mistakeId, severity: m.severity })),
  })

  // Calculate overall score with mistake penalty
  const baseScore = calculateOverallScore(metrics, tempoEvaluation.score, cameraAngleResult.angle, finalClubType)
  const mistakePenalty = calculateMistakePenalty(detectedMistakes)
  const overallScore = Math.max(0, baseScore - mistakePenalty)

  logger.info('Score Calculation:', {
    baseScore,
    mistakePenalty,
    overallScore,
    mistakeCount: detectedMistakes.length,
  })

  return {
    id: generateId(),
    videoId,
    createdAt: Date.now(),
    frames,
    phaseSegments,
    metrics,
    tempo,
    isRightHanded: phaseResult.isRightHanded,
    overallScore,
    cameraAngle: cameraAngleResult.angle,
    cameraAngleConfidence: cameraAngleResult.confidence,
    clubType: finalClubType,
    clubTypeConfidence: clubTypeOverridden ? 1.0 : clubTypeResult.confidence,
    clubTypeOverridden,
    detectedMistakes,
  }
}

/**
 * Get feedback messages based on analysis results
 */
export interface SwingFeedback {
  category: 'rotation' | 'tempo' | 'posture' | 'arm' | 'general' | 'balance' | 'stability' | 'extension'
  type: 'positive' | 'suggestion' | 'warning'
  message: string
}

export function generateSwingFeedback(result: AnalysisResult): SwingFeedback[] {
  const feedback: SwingFeedback[] = []
  const isDTL = result.cameraAngle === 'dtl'
  const isFaceOn = result.cameraAngle === 'face-on'

  // X-Factor feedback (skip for DTL - rotation metrics unreliable from down-the-line view)
  // For face-on, use wider ideal range (35-65°) for pro swings
  if (!isDTL) {
    if (result.metrics.maxXFactor >= SCORING_RANGES.X_FACTOR.IDEAL_MIN &&
        result.metrics.maxXFactor <= SCORING_RANGES.X_FACTOR.IDEAL_MAX) {
      feedback.push({
        category: 'rotation',
        type: 'positive',
        message: `Great X-factor of ${Math.round(result.metrics.maxXFactor)}°. Good separation between shoulders and hips.`,
      })
    } else if (result.metrics.maxXFactor < SCORING_RANGES.X_FACTOR.IDEAL_MIN) {
      feedback.push({
        category: 'rotation',
        type: 'suggestion',
        message: `X-factor of ${Math.round(result.metrics.maxXFactor)}° is low. Try rotating your shoulders more while keeping hips stable.`,
      })
    } else {
      feedback.push({
        category: 'rotation',
        type: 'warning',
        message: `X-factor of ${Math.round(result.metrics.maxXFactor)}° is very high. This may cause consistency issues.`,
      })
    }
  }

  // Spine angle consistency
  const spineDiff = Math.abs(result.metrics.addressSpineAngle - result.metrics.impactSpineAngle)
  const spineThresholds = isFaceOn ? FEEDBACK_THRESHOLDS.SPINE_DIFF.FACE_ON : FEEDBACK_THRESHOLDS.SPINE_DIFF.DEFAULT

  if (spineDiff < spineThresholds.GOOD) {
    feedback.push({
      category: 'posture',
      type: 'positive',
      message: isFaceOn
        ? 'Good spine dynamics with appropriate secondary tilt at impact.'
        : 'Excellent posture maintenance through the swing.',
    })
  } else if (spineDiff < spineThresholds.WARNING) {
    feedback.push({
      category: 'posture',
      type: 'suggestion',
      message: 'Minor posture change during swing. Focus on maintaining spine angle.',
    })
  } else {
    feedback.push({
      category: 'posture',
      type: 'warning',
      message: 'Significant posture change during swing. Work on maintaining your spine angle from address to impact.',
    })
  }

  // Lead arm at top
  const leadArmThresholds = isFaceOn ? FEEDBACK_THRESHOLDS.LEAD_ARM.FACE_ON : FEEDBACK_THRESHOLDS.LEAD_ARM.DEFAULT

  if (result.metrics.topLeadArmExtension >= leadArmThresholds.GOOD) {
    feedback.push({
      category: 'arm',
      type: 'positive',
      message: 'Good lead arm extension at the top of the backswing.',
    })
  } else if (result.metrics.topLeadArmExtension >= leadArmThresholds.OK) {
    feedback.push({
      category: 'arm',
      type: 'suggestion',
      message: 'Slightly bent lead arm at top. Work on keeping it straighter for more width.',
    })
  } else {
    feedback.push({
      category: 'arm',
      type: 'warning',
      message: 'Lead arm is quite bent at top. This reduces swing arc and power.',
    })
  }

  // Tempo feedback
  const tempoEval = evaluateTempo(result.tempo)
  feedback.push({
    category: 'tempo',
    type: tempoEval.rating === 'excellent' || tempoEval.rating === 'good' ? 'positive' : 'suggestion',
    message: tempoEval.feedback,
  })

  // Face-on specific feedback
  if (isFaceOn) {
    // Hip sway feedback (lower is better)
    if (result.metrics.hipSway !== undefined) {
      if (result.metrics.hipSway < FEEDBACK_THRESHOLDS.HIP_SWAY.GOOD) {
        feedback.push({
          category: 'balance',
          type: 'positive',
          message: 'Good hip stability with controlled lateral movement.',
        })
      } else if (result.metrics.hipSway < FEEDBACK_THRESHOLDS.HIP_SWAY.OK) {
        feedback.push({
          category: 'balance',
          type: 'suggestion',
          message: 'Some hip sway detected. Focus on rotating around your spine rather than sliding laterally.',
        })
      } else {
        feedback.push({
          category: 'balance',
          type: 'warning',
          message: 'Excessive hip sway. Work on keeping your lower body more stable during the swing.',
        })
      }
    }

    // Head stability feedback (lower is better)
    if (result.metrics.headStability !== undefined) {
      if (result.metrics.headStability < FEEDBACK_THRESHOLDS.HEAD_STABILITY.GOOD) {
        feedback.push({
          category: 'stability',
          type: 'positive',
          message: 'Good head stability throughout the swing.',
        })
      } else if (result.metrics.headStability < FEEDBACK_THRESHOLDS.HEAD_STABILITY.OK) {
        feedback.push({
          category: 'stability',
          type: 'suggestion',
          message: 'Minor head movement detected. Try to keep your head steadier for more consistent contact.',
        })
      } else {
        feedback.push({
          category: 'stability',
          type: 'warning',
          message: 'Significant head movement during swing. Focus on keeping your head still for better consistency.',
        })
      }
    }

    // Impact extension feedback (higher is better)
    if (result.metrics.impactExtension !== undefined) {
      if (result.metrics.impactExtension >= FEEDBACK_THRESHOLDS.IMPACT_EXTENSION.GOOD) {
        feedback.push({
          category: 'extension',
          type: 'positive',
          message: 'Excellent arm extension through impact.',
        })
      } else if (result.metrics.impactExtension >= FEEDBACK_THRESHOLDS.IMPACT_EXTENSION.OK) {
        feedback.push({
          category: 'extension',
          type: 'suggestion',
          message: 'Could improve extension through impact. Focus on reaching toward the target post-impact.',
        })
      } else {
        feedback.push({
          category: 'extension',
          type: 'warning',
          message: 'Limited extension through impact. Work on releasing the club fully toward the target.',
        })
      }
    }
  }

  return feedback
}
