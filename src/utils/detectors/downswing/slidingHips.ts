import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'
import { logger } from '@/utils/debugLogger'

/**
 * SLIDING_HIPS detector
 * Consolidated hip sway/slide detector for both backswing and downswing
 *
 * Detection method:
 * 1. Backswing: Hip center should stay stable (minimal lateral movement from address)
 * 2. Downswing: Some lateral movement OK, but lead hip shouldn't go past lead ankle
 *
 * Only reliable for face-on camera angle
 */
export const detectSlidingHips: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, isRightHanded } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    logger.info('SLIDING_HIPS: Skipped (not face-on)', { cameraAngle })
    return createNotDetectedResult('SLIDING_HIPS', 'Requires face-on camera angle')
  }

  // Get required phases
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')
  const topPhase = getPhaseFrameIndices(phaseSegments, 'top')
  const impactPhase = getPhaseFrameIndices(phaseSegments, 'impact')

  if (!addressPhase || !topPhase || !impactPhase) {
    return createNotDetectedResult('SLIDING_HIPS', 'Required phases not detected')
  }

  // Get address landmarks for reference
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('SLIDING_HIPS', 'No landmarks at address')
  }

  const leftHipAddr = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHipAddr = addressLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftAnkleAddr = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkleAddr = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  if (!leftHipAddr || !rightHipAddr || !leftAnkleAddr || !rightAnkleAddr) {
    return createNotDetectedResult('SLIDING_HIPS', 'Missing landmarks at address')
  }

  const stanceWidth = Math.abs(rightAnkleAddr.x - leftAnkleAddr.x)
  if (stanceWidth === 0) {
    return createNotDetectedResult('SLIDING_HIPS', 'Invalid stance width')
  }

  const addressHipCenterX = (leftHipAddr.x + rightHipAddr.x) / 2

  // Determine target direction
  const leadAnkleAddrX = isRightHanded ? leftAnkleAddr.x : rightAnkleAddr.x
  const trailAnkleAddrX = isRightHanded ? rightAnkleAddr.x : leftAnkleAddr.x
  const targetIsHigherX = leadAnkleAddrX > trailAnkleAddrX

  // ========== BACKSWING CHECK ==========
  // During backswing (address to top), hip center should stay stable
  // Measure max deviation from address position
  let maxBackswingSway = 0
  const backswingStart = addressPhase.endFrame + 1
  const backswingEnd = topPhase.endFrame

  for (let i = backswingStart; i <= backswingEnd && i < frames.length; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
    if (!leftHip || !rightHip) continue

    const hipCenterX = (leftHip.x + rightHip.x) / 2
    const deviation = Math.abs(hipCenterX - addressHipCenterX)
    maxBackswingSway = Math.max(maxBackswingSway, deviation)
  }

  const backswingSwayPct = (maxBackswingSway / stanceWidth) * 100

  // Backswing thresholds (should be minimal movement)
  const BACKSWING_SWAY_THRESHOLD = 10  // Allow up to 10% deviation
  const BACKSWING_SEVERE_THRESHOLD = 20

  // ========== DOWNSWING CHECK ==========
  // At impact, lead hip shouldn't go past lead ankle
  const impactIdx = impactPhase.startFrame
  const impactLandmarks = frames[impactIdx]?.landmarks

  let downswingSlidePct = 0

  if (impactLandmarks) {
    const leadHip = isRightHanded
      ? impactLandmarks[POSE_LANDMARKS.LEFT_HIP]
      : impactLandmarks[POSE_LANDMARKS.RIGHT_HIP]
    const leadAnkle = isRightHanded
      ? impactLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
      : impactLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]

    if (leadHip && leadAnkle) {
      // Calculate how far lead hip is past lead ankle (toward target)
      let hipPastAnkle: number
      if (targetIsHigherX) {
        hipPastAnkle = leadHip.x - leadAnkle.x
      } else {
        hipPastAnkle = leadAnkle.x - leadHip.x
      }
      downswingSlidePct = (hipPastAnkle / stanceWidth) * 100
    }
  }

  // Downswing thresholds (some movement toward target is OK)
  const DOWNSWING_SLIDE_THRESHOLD = 5   // Allow up to 5% past ankle
  const DOWNSWING_SEVERE_THRESHOLD = 15

  // ========== DETERMINE RESULT ==========
  const backswingIssue = backswingSwayPct > BACKSWING_SWAY_THRESHOLD
  const downswingIssue = downswingSlidePct > DOWNSWING_SLIDE_THRESHOLD

  logger.info('SLIDING_HIPS Debug:', {
    isRightHanded,
    targetIsHigherX,
    backswingSwayPct: backswingSwayPct.toFixed(1) + '%',
    backswingThreshold: BACKSWING_SWAY_THRESHOLD + '%',
    backswingIssue,
    downswingSlidePct: downswingSlidePct.toFixed(1) + '%',
    downswingThreshold: DOWNSWING_SLIDE_THRESHOLD + '%',
    downswingIssue,
    detected: backswingIssue || downswingIssue,
  })

  if (!backswingIssue && !downswingIssue) {
    return {
      mistakeId: 'SLIDING_HIPS',
      detected: false,
      confidence: 0.85,
      severity: 0,
      message: '',
    }
  }

  // Calculate severity based on the worse issue
  let severity = 0
  const messages: string[] = []

  if (backswingIssue) {
    const backswingExcess = backswingSwayPct - BACKSWING_SWAY_THRESHOLD
    const backswingSeverity = Math.min(100, (backswingExcess / (BACKSWING_SEVERE_THRESHOLD - BACKSWING_SWAY_THRESHOLD)) * 100)
    severity = Math.max(severity, backswingSeverity)

    if (backswingSwayPct > BACKSWING_SEVERE_THRESHOLD) {
      messages.push('Excessive hip sway during backswing. Keep your lower body stable and rotate around your spine.')
    } else {
      messages.push('Hip sway detected in backswing. Focus on rotating rather than sliding laterally.')
    }
  }

  if (downswingIssue) {
    const downswingExcess = downswingSlidePct - DOWNSWING_SLIDE_THRESHOLD
    const downswingSeverity = Math.min(100, (downswingExcess / (DOWNSWING_SEVERE_THRESHOLD - DOWNSWING_SLIDE_THRESHOLD)) * 100)
    severity = Math.max(severity, downswingSeverity)

    if (downswingSlidePct > DOWNSWING_SEVERE_THRESHOLD) {
      messages.push('Lead hip sliding well past lead ankle at impact. Rotate hips rather than sliding toward target.')
    } else {
      messages.push('Lead hip moving past lead ankle. Keep lead hip stacked over ankle while rotating.')
    }
  }

  const details = []
  if (backswingIssue) details.push(`Backswing sway: ${backswingSwayPct.toFixed(0)}%`)
  if (downswingIssue) details.push(`Impact slide: ${downswingSlidePct.toFixed(0)}% past ankle`)

  return {
    mistakeId: 'SLIDING_HIPS',
    detected: true,
    confidence: 0.85,
    severity,
    message: messages.join(' '),
    details: details.join(', '),
  }
}
