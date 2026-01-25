import type { Landmark } from '@/types/pose'
import { POSE_LANDMARKS } from '@/types/pose'

/**
 * Calculate the angle between three points in 2D (ignoring z-coordinate)
 * Returns angle at point B in degrees
 */
export function calculateAngle2D(
  pointA: Landmark,
  pointB: Landmark,
  pointC: Landmark
): number {
  const vectorBA = { x: pointA.x - pointB.x, y: pointA.y - pointB.y }
  const vectorBC = { x: pointC.x - pointB.x, y: pointC.y - pointB.y }

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2)
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2)

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0

  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magnitudeBA * magnitudeBC)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

/**
 * Calculate the angle between three points in 3D
 * Returns angle at point B in degrees
 */
export function calculateAngle3D(
  pointA: Landmark,
  pointB: Landmark,
  pointC: Landmark
): number {
  const vectorBA = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
    z: pointA.z - pointB.z,
  }
  const vectorBC = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y,
    z: pointC.z - pointB.z,
  }

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2)
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2)

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0

  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magnitudeBA * magnitudeBC)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

/**
 * Calculate rotation angle in the horizontal plane (XZ plane)
 * Returns angle in degrees, where 0 is facing camera, positive is rotated left
 */
export function calculateHorizontalRotation(
  leftPoint: Landmark,
  rightPoint: Landmark
): number {
  const dx = rightPoint.x - leftPoint.x
  const dz = rightPoint.z - leftPoint.z
  return Math.atan2(dz, dx) * (180 / Math.PI)
}

/**
 * Calculate hip rotation from landmarks
 * Returns angle in degrees relative to facing the camera
 */
export function calculateHipRotation(landmarks: Landmark[]): number {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftHip || !rightHip) return 0

  return calculateHorizontalRotation(leftHip, rightHip)
}

/**
 * Calculate shoulder rotation from landmarks
 * Returns angle in degrees relative to facing the camera
 */
export function calculateShoulderRotation(landmarks: Landmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

  if (!leftShoulder || !rightShoulder) return 0

  return calculateHorizontalRotation(leftShoulder, rightShoulder)
}

/**
 * Calculate X-factor (difference between shoulder and hip rotation)
 * This is a key metric for power generation in the golf swing
 */
export function calculateXFactor(landmarks: Landmark[]): number {
  const shoulderRotation = calculateShoulderRotation(landmarks)
  const hipRotation = calculateHipRotation(landmarks)
  return shoulderRotation - hipRotation
}

/**
 * Calculate spine angle (forward tilt)
 * Returns angle in degrees from vertical
 */
export function calculateSpineAngle(landmarks: Landmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0

  // Calculate midpoints
  const midShoulder = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2,
  }
  const midHip = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
  }

  // Calculate angle from vertical (Y-axis)
  const dx = midShoulder.x - midHip.x
  const dy = midShoulder.y - midHip.y

  // In MediaPipe, Y increases downward, so we adjust
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI)
  return angle
}

/**
 * Calculate arm extension (elbow angle)
 * Returns angle in degrees (180 = fully extended)
 */
export function calculateArmExtension(
  landmarks: Landmark[],
  side: 'left' | 'right'
): number {
  const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER
  const elbowIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST

  const shoulder = landmarks[shoulderIdx]
  const elbow = landmarks[elbowIdx]
  const wrist = landmarks[wristIdx]

  if (!shoulder || !elbow || !wrist) return 180

  return calculateAngle3D(shoulder, elbow, wrist)
}

/**
 * Calculate knee flex angle
 * Returns angle in degrees (180 = fully extended)
 */
export function calculateKneeFlex(
  landmarks: Landmark[],
  side: 'left' | 'right'
): number {
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP
  const kneeIdx = side === 'left' ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE
  const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE

  const hip = landmarks[hipIdx]
  const knee = landmarks[kneeIdx]
  const ankle = landmarks[ankleIdx]

  if (!hip || !knee || !ankle) return 180

  return calculateAngle3D(hip, knee, ankle)
}

/**
 * Calculate wrist hinge angle
 * Measures the angle between forearm and hand
 */
export function calculateWristHinge(
  landmarks: Landmark[],
  side: 'left' | 'right'
): number {
  const elbowIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST
  const indexIdx = side === 'left' ? POSE_LANDMARKS.LEFT_INDEX : POSE_LANDMARKS.RIGHT_INDEX

  const elbow = landmarks[elbowIdx]
  const wrist = landmarks[wristIdx]
  const index = landmarks[indexIdx]

  if (!elbow || !wrist || !index) return 180

  return calculateAngle3D(elbow, wrist, index)
}

/**
 * Estimate hand position relative to body (for club position inference)
 * Returns normalized coordinates relative to hip center
 */
export function getHandPosition(
  landmarks: Landmark[],
  side: 'left' | 'right'
): { x: number; y: number; z: number } {
  const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const wrist = landmarks[wristIdx]

  if (!leftHip || !rightHip || !wrist) {
    return { x: 0, y: 0, z: 0 }
  }

  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
  }

  return {
    x: wrist.x - hipCenter.x,
    y: wrist.y - hipCenter.y,
    z: wrist.z - hipCenter.z,
  }
}

/**
 * Calculate all swing metrics for a single frame
 */
export interface FrameMetrics {
  hipRotation: number
  shoulderRotation: number
  xFactor: number
  spineAngle: number
  leftArmExtension: number
  rightArmExtension: number
  leftKneeFlex: number
  rightKneeFlex: number
  leftWristHinge: number
  rightWristHinge: number
  leftHandPosition: { x: number; y: number; z: number }
  rightHandPosition: { x: number; y: number; z: number }
}

export function calculateFrameMetrics(landmarks: Landmark[]): FrameMetrics {
  return {
    hipRotation: calculateHipRotation(landmarks),
    shoulderRotation: calculateShoulderRotation(landmarks),
    xFactor: calculateXFactor(landmarks),
    spineAngle: calculateSpineAngle(landmarks),
    leftArmExtension: calculateArmExtension(landmarks, 'left'),
    rightArmExtension: calculateArmExtension(landmarks, 'right'),
    leftKneeFlex: calculateKneeFlex(landmarks, 'left'),
    rightKneeFlex: calculateKneeFlex(landmarks, 'right'),
    leftWristHinge: calculateWristHinge(landmarks, 'left'),
    rightWristHinge: calculateWristHinge(landmarks, 'right'),
    leftHandPosition: getHandPosition(landmarks, 'left'),
    rightHandPosition: getHandPosition(landmarks, 'right'),
  }
}

/**
 * Camera angle types for golf swing videos
 */
export type CameraAngle = 'face-on' | 'dtl' | 'oblique'

export interface CameraAngleResult {
  angle: CameraAngle
  confidence: number
  ratio: number // dx/dz ratio used for detection
}

/**
 * Detect camera angle from pose landmarks
 *
 * Face-on: Large X separation between left/right shoulders, small Z separation
 * DTL (down-the-line): Small X separation, large Z separation
 *
 * Uses the ratio |dx| / |dz| where:
 * - ratio > 2.0 → Face-on
 * - ratio < 0.5 → DTL
 * - 0.5 to 2.0 → Oblique/angled
 */
export function detectCameraAngle(landmarks: Landmark[]): CameraAngleResult {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { angle: 'face-on', confidence: 0, ratio: 1 }
  }

  // Calculate dx and dz for both shoulders and hips
  const shoulderDx = Math.abs(rightShoulder.x - leftShoulder.x)
  const shoulderDz = Math.abs(rightShoulder.z - leftShoulder.z)
  const hipDx = Math.abs(rightHip.x - leftHip.x)
  const hipDz = Math.abs(rightHip.z - leftHip.z)

  // Average the ratios from shoulders and hips for robustness
  // Add small epsilon to avoid division by zero
  const epsilon = 0.001
  const shoulderRatio = shoulderDx / (shoulderDz + epsilon)
  const hipRatio = hipDx / (hipDz + epsilon)
  const avgRatio = (shoulderRatio + hipRatio) / 2

  let angle: CameraAngle
  let confidence: number

  if (avgRatio > 2.0) {
    angle = 'face-on'
    // Higher ratio = more confident it's face-on
    confidence = Math.min(1, (avgRatio - 2) / 3 + 0.7)
  } else if (avgRatio < 0.5) {
    angle = 'dtl'
    // Lower ratio = more confident it's DTL
    confidence = Math.min(1, (0.5 - avgRatio) / 0.4 + 0.7)
  } else {
    angle = 'oblique'
    // Confidence is lower for oblique angles
    confidence = 0.5
  }

  return { angle, confidence, ratio: avgRatio }
}

/**
 * Detect camera angle from multiple frames for more stable detection
 * Samples early frames (address position) where the golfer is most stationary
 */
export function detectCameraAngleFromFrames(
  framesLandmarks: Landmark[][]
): CameraAngleResult {
  if (framesLandmarks.length === 0) {
    return { angle: 'face-on', confidence: 0, ratio: 1 }
  }

  // Sample the first few frames (address position)
  const sampleCount = Math.min(10, framesLandmarks.length)
  let totalRatio = 0
  let validSamples = 0

  for (let i = 0; i < sampleCount; i++) {
    const result = detectCameraAngle(framesLandmarks[i])
    if (result.confidence > 0) {
      totalRatio += result.ratio
      validSamples++
    }
  }

  if (validSamples === 0) {
    return { angle: 'face-on', confidence: 0, ratio: 1 }
  }

  const avgRatio = totalRatio / validSamples

  let angle: CameraAngle
  let confidence: number

  if (avgRatio > 2.0) {
    angle = 'face-on'
    confidence = Math.min(1, (avgRatio - 2) / 3 + 0.7)
  } else if (avgRatio < 0.5) {
    angle = 'dtl'
    confidence = Math.min(1, (0.5 - avgRatio) / 0.4 + 0.7)
  } else {
    angle = 'oblique'
    confidence = 0.5
  }

  return { angle, confidence, ratio: avgRatio }
}
