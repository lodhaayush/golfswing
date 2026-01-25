import type { PoseFrame } from '@/types/pose'
import type { AnalysisResult, SwingMetrics, PhaseSegment } from '@/types/analysis'
import { detectSwingPhases, type PhaseFrame as DetectedPhaseFrame } from './phaseDetection'
import { consolidatePhases, calculateTempoMetrics, evaluateTempo } from './tempoAnalysis'
import { detectCameraAngleFromFrames } from './angleCalculations'
import { logger } from './debugLogger'

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
 * Calculate aggregate swing metrics from phase frames
 * Rotations are normalized relative to the address position for camera-angle independence
 */
function calculateSwingMetrics(
  phases: DetectedPhaseFrame[],
  isRightHanded: boolean
): SwingMetrics {
  // Find key frames by phase
  const addressFrame = phases.find((p) => p.phase === 'address')
  const topFrame = phases.find((p) => p.phase === 'top')
  const impactFrame = phases.find((p) => p.phase === 'impact')

  // Get baseline rotations from address position
  const baselineHipRotation = addressFrame?.metrics.hipRotation ?? 0
  const baselineShoulderRotation = addressFrame?.metrics.shoulderRotation ?? 0

  // Calculate max values across all frames, relative to address position
  let maxHipRotation = 0
  let maxShoulderRotation = 0
  let maxXFactor = 0

  for (const phase of phases) {
    // Calculate rotation relative to address position using proper angular difference
    const relativeHipRotation = angularDifference(phase.metrics.hipRotation, baselineHipRotation)
    const relativeShoulderRotation = angularDifference(phase.metrics.shoulderRotation, baselineShoulderRotation)
    // X-factor is the separation between shoulder and hip rotation at each frame
    const relativeXFactor = relativeShoulderRotation - relativeHipRotation

    const absHipRotation = Math.abs(relativeHipRotation)
    const absShoulderRotation = Math.abs(relativeShoulderRotation)
    const absXFactor = Math.abs(relativeXFactor)

    if (absHipRotation > maxHipRotation) maxHipRotation = absHipRotation
    if (absShoulderRotation > maxShoulderRotation) maxShoulderRotation = absShoulderRotation
    if (absXFactor > maxXFactor) maxXFactor = absXFactor
  }

  // Determine lead arm based on handedness
  const getLeadArmExtension = (metrics: DetectedPhaseFrame['metrics']) => {
    return isRightHanded ? metrics.leftArmExtension : metrics.rightArmExtension
  }

  const getLeadKneeFlex = (metrics: DetectedPhaseFrame['metrics']) => {
    return isRightHanded ? metrics.leftKneeFlex : metrics.rightKneeFlex
  }

  return {
    maxHipRotation,
    maxShoulderRotation,
    maxXFactor,
    addressSpineAngle: addressFrame?.metrics.spineAngle ?? 0,
    topSpineAngle: topFrame?.metrics.spineAngle ?? 0,
    impactSpineAngle: impactFrame?.metrics.spineAngle ?? 0,
    topLeadArmExtension: topFrame ? getLeadArmExtension(topFrame.metrics) : 180,
    impactLeadArmExtension: impactFrame ? getLeadArmExtension(impactFrame.metrics) : 180,
    addressKneeFlex: addressFrame ? getLeadKneeFlex(addressFrame.metrics) : 180,
    topKneeFlex: topFrame ? getLeadKneeFlex(topFrame.metrics) : 180,
  }
}

/**
 * Calculate overall swing score based on metrics
 * Weights are adjusted based on camera angle since rotation metrics
 * are unreliable for DTL (down-the-line) videos
 */
function calculateOverallScore(
  metrics: SwingMetrics,
  tempoScore: number,
  cameraAngle: 'face-on' | 'dtl' | 'oblique'
): number {
  const scores: number[] = []

  // Adjust weights based on camera angle
  // For DTL, rotation metrics are unreliable due to Z-coordinate noise
  const isDTL = cameraAngle === 'dtl'

  // Weights for face-on vs DTL
  const weights = isDTL ? {
    xFactor: 0,        // Unreliable for DTL
    shoulder: 0,       // Unreliable for DTL
    hip: 0,            // Unreliable for DTL
    spine: 0.30,       // Very reliable for DTL (side view shows spine clearly)
    leadArm: 0.35,     // Very reliable for DTL
    tempo: 0.35,       // Reliable for all angles
  } : {
    xFactor: 0.20,
    shoulder: 0.15,
    hip: 0.10,
    spine: 0.15,
    leadArm: 0.15,
    tempo: 0.25,
  }

  // X-Factor score (ideal range: 35-55 degrees)
  const xFactorScore = scoreInRange(metrics.maxXFactor, 35, 55, 20, 70)
  scores.push(xFactorScore * weights.xFactor)

  // Shoulder rotation score (ideal: 80-100 degrees)
  const shoulderScore = scoreInRange(metrics.maxShoulderRotation, 80, 100, 60, 120)
  scores.push(shoulderScore * weights.shoulder)

  // Hip rotation score (ideal: 40-55 degrees)
  const hipScore = scoreInRange(metrics.maxHipRotation, 40, 55, 25, 70)
  scores.push(hipScore * weights.hip)

  // Spine angle consistency (should be similar at address and impact)
  const spineConsistency = 100 - Math.min(100, Math.abs(metrics.addressSpineAngle - metrics.impactSpineAngle) * 3)
  scores.push(spineConsistency * weights.spine)

  // Lead arm extension at top (ideal: 160-180 degrees = straight arm)
  const leadArmScore = scoreInRange(metrics.topLeadArmExtension, 160, 180, 120, 180)
  scores.push(leadArmScore * weights.leadArm)

  // Tempo score
  scores.push(tempoScore * weights.tempo)

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
 * Main function to analyze a complete golf swing
 */
export function analyzeSwing(
  frames: PoseFrame[],
  videoId: string
): AnalysisResult {
  // Detect camera angle from early frames
  const cameraAngleResult = detectCameraAngleFromFrames(frames.map(f => f.landmarks))
  logger.info('Camera Angle Detection:', {
    angle: cameraAngleResult.angle,
    confidence: cameraAngleResult.confidence.toFixed(2),
    ratio: cameraAngleResult.ratio.toFixed(2),
  })

  // Detect swing phases
  const phaseResult = detectSwingPhases(frames)

  // Log key frame indices for debugging consistency
  logger.info('Key Frame Indices:', {
    addressFrameIdx: phaseResult.keyFrames.address?.frameIndex ?? null,
    topOfBackswingIdx: phaseResult.keyFrames.topOfBackswing?.frameIndex ?? null,
    impactFrameIdx: phaseResult.keyFrames.impact?.frameIndex ?? null,
    finishFrameIdx: phaseResult.keyFrames.finish?.frameIndex ?? null,
    totalFrames: frames.length,
  })

  // Consolidate phases into segments
  const phaseSegments: PhaseSegment[] = consolidatePhases(phaseResult.phases)

  // Calculate tempo metrics
  const tempo = calculateTempoMetrics(phaseSegments)
  const tempoEvaluation = evaluateTempo(tempo)

  // Calculate swing metrics
  const metrics = calculateSwingMetrics(phaseResult.phases, phaseResult.isRightHanded)

  // Log normalized swing metrics for debugging
  logger.info('Swing Metrics (normalized to address):', {
    maxXFactor: metrics.maxXFactor.toFixed(1),
    maxShoulderRotation: metrics.maxShoulderRotation.toFixed(1),
    maxHipRotation: metrics.maxHipRotation.toFixed(1),
    addressSpineAngle: metrics.addressSpineAngle.toFixed(1),
    impactSpineAngle: metrics.impactSpineAngle.toFixed(1),
  })

  // Calculate overall score (weights adjusted based on camera angle)
  const overallScore = calculateOverallScore(metrics, tempoEvaluation.score, cameraAngleResult.angle)

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
  }
}

/**
 * Get feedback messages based on analysis results
 */
export interface SwingFeedback {
  category: 'rotation' | 'tempo' | 'posture' | 'arm' | 'general'
  type: 'positive' | 'suggestion' | 'warning'
  message: string
}

export function generateSwingFeedback(result: AnalysisResult): SwingFeedback[] {
  const feedback: SwingFeedback[] = []
  const isDTL = result.cameraAngle === 'dtl'

  // X-Factor feedback (skip for DTL - rotation metrics unreliable from side view)
  if (!isDTL) {
    if (result.metrics.maxXFactor >= 35 && result.metrics.maxXFactor <= 55) {
      feedback.push({
        category: 'rotation',
        type: 'positive',
        message: `Great X-factor of ${Math.round(result.metrics.maxXFactor)}°. Good separation between shoulders and hips.`,
      })
    } else if (result.metrics.maxXFactor < 35) {
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
  if (spineDiff < 5) {
    feedback.push({
      category: 'posture',
      type: 'positive',
      message: 'Excellent posture maintenance through the swing.',
    })
  } else if (spineDiff < 10) {
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
  if (result.metrics.topLeadArmExtension >= 160) {
    feedback.push({
      category: 'arm',
      type: 'positive',
      message: 'Good lead arm extension at the top of the backswing.',
    })
  } else if (result.metrics.topLeadArmExtension >= 140) {
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

  return feedback
}
