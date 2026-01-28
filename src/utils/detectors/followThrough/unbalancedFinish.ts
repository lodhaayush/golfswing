import type { DetectorInput, DetectorResult, MistakeDetector } from '../types'
import { createNotDetectedResult, getPhaseFrameIndices } from '../types'
import { POSE_LANDMARKS } from '@/types/pose'

/**
 * UNBALANCED_FINISH detector
 * Detects when the golfer's finish position is unstable
 *
 * Detection method:
 * - Check hip alignment relative to lead foot ankle at finish
 * - A proper finish should have hips over or near the lead foot
 * - Penalize if hips drift past the lead foot (over-rotation)
 * - Penalize if hips are too far back from lead foot (falling back)
 *
 * Works for face-on camera angle
 */
export const detectUnbalancedFinish: MistakeDetector = (input: DetectorInput): DetectorResult => {
  const { frames, phaseSegments, cameraAngle, isRightHanded } = input

  // Only reliable for face-on camera angle
  if (cameraAngle !== 'face-on') {
    return createNotDetectedResult('UNBALANCED_FINISH', 'Requires face-on camera angle')
  }

  // Get finish phase
  const finishPhase = getPhaseFrameIndices(phaseSegments, 'finish')
  const addressPhase = getPhaseFrameIndices(phaseSegments, 'address')

  if (!finishPhase || !addressPhase) {
    return createNotDetectedResult('UNBALANCED_FINISH', 'Required phases not detected')
  }

  // Get address landmarks for stance width reference
  const addressIdx = addressPhase.endFrame
  const addressLandmarks = frames[addressIdx]?.landmarks
  if (!addressLandmarks) {
    return createNotDetectedResult('UNBALANCED_FINISH', 'No landmarks at address')
  }

  const addressLeftAnkle = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const addressRightAnkle = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  if (!addressLeftAnkle || !addressRightAnkle) {
    return createNotDetectedResult('UNBALANCED_FINISH', 'Missing ankle landmarks at address')
  }

  const stanceWidth = Math.abs(addressRightAnkle.x - addressLeftAnkle.x)
  if (stanceWidth === 0) {
    return createNotDetectedResult('UNBALANCED_FINISH', 'Invalid stance width')
  }

  // Sample the last few frames of finish
  const finishEnd = Math.min(finishPhase.endFrame, frames.length - 1)
  const finishStart = Math.max(finishPhase.startFrame, finishEnd - 5)

  let maxOverRotation = 0
  let maxFallingBack = 0

  for (let i = finishStart; i <= finishEnd; i++) {
    const landmarks = frames[i]?.landmarks
    if (!landmarks) continue

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

    if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) continue

    const hipCenterX = (leftHip.x + rightHip.x) / 2
    // Lead foot is left for right-handed, right for left-handed
    const leadAnkleX = isRightHanded ? leftAnkle.x : rightAnkle.x
    const ankleCenterX = (leftAnkle.x + rightAnkle.x) / 2

    // Check for over-rotation (hips past lead foot)
    // For right-handed: lead ankle has higher X, so penalize if hipCenterX > leadAnkleX
    // For left-handed: lead ankle has lower X, so penalize if hipCenterX < leadAnkleX
    if (isRightHanded && hipCenterX > leadAnkleX) {
      const offset = (hipCenterX - leadAnkleX) / stanceWidth
      if (offset > maxOverRotation) maxOverRotation = offset
    } else if (!isRightHanded && hipCenterX < leadAnkleX) {
      const offset = (leadAnkleX - hipCenterX) / stanceWidth
      if (offset > maxOverRotation) maxOverRotation = offset
    }

    // Check for falling back (hips too far behind toward trail foot)
    // For right-handed: if hipCenterX is closer to trailAnkleX (lower X) than ankleCenterX
    // For left-handed: if hipCenterX is closer to trailAnkleX (higher X) than ankleCenterX
    if (isRightHanded && hipCenterX < ankleCenterX) {
      const offset = (ankleCenterX - hipCenterX) / stanceWidth
      if (offset > maxFallingBack) maxFallingBack = offset
    } else if (!isRightHanded && hipCenterX > ankleCenterX) {
      const offset = (hipCenterX - ankleCenterX) / stanceWidth
      if (offset > maxFallingBack) maxFallingBack = offset
    }
  }

  // Threshold: hips shouldn't drift past lead ankle or fall back more than threshold
  const OVER_ROTATION_THRESHOLD = 0.30
  const FALLING_BACK_THRESHOLD = 0.25  // Slightly stricter - weight should transfer forward
  const SEVERE_THRESHOLD = 0.50

  const isOverRotation = maxOverRotation > OVER_ROTATION_THRESHOLD
  const isFallingBack = maxFallingBack > FALLING_BACK_THRESHOLD

  if (!isOverRotation && !isFallingBack) {
    return {
      mistakeId: 'UNBALANCED_FINISH',
      detected: false,
      confidence: 0.75,
      severity: 0,
      message: '',
    }
  }

  // Use the worse issue for severity calculation
  const useOverRotation = maxOverRotation > maxFallingBack
  const maxOffset = useOverRotation ? maxOverRotation : maxFallingBack
  const severity = Math.min(100, (maxOffset / (SEVERE_THRESHOLD + 0.2)) * 100)

  let message: string
  if (useOverRotation) {
    if (maxOverRotation > SEVERE_THRESHOLD) {
      message = 'Finish position is very unbalanced - rotating too far past lead foot.'
    } else {
      message = 'Slight over-rotation at finish. Focus on stopping with weight centered over lead foot.'
    }
  } else {
    if (maxFallingBack > SEVERE_THRESHOLD) {
      message = 'Falling back at finish - weight staying on trail foot. Work on transferring weight forward.'
    } else {
      message = 'Weight not fully transferred to lead foot at finish. Focus on driving through to a balanced finish.'
    }
  }

  const details = useOverRotation
    ? `Over-rotation past lead foot: ${(maxOverRotation * 100).toFixed(0)}% of stance width`
    : `Weight behind center: ${(maxFallingBack * 100).toFixed(0)}% of stance width`

  return {
    mistakeId: 'UNBALANCED_FINISH',
    detected: true,
    confidence: 0.7,
    severity,
    message,
    details,
  }
}
