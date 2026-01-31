import type { Landmark } from '@/types/pose'
import { POSE_LANDMARKS } from '@/types/pose'
import type { ClubType } from '@/types/analysis'
import { CAMERA_ANGLE_DETECTION, CLUB_DETECTION } from './constants'
import { logger } from './debugLogger'

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
 * Calculate the angle between three points in 2D (X/Y only)
 * Returns angle at point B in degrees
 *
 * NOTE: We intentionally ignore the Z-axis because MediaPipe's depth
 * estimation is unreliable, especially for DTL camera angles where
 * limbs extend toward/away from the camera. Using only X/Y provides
 * more consistent and accurate angle measurements.
 */
export function calculateAngle3D(
  pointA: Landmark,
  pointB: Landmark,
  pointC: Landmark
): number {
  const vectorBA = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
  }
  const vectorBC = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y,
  }

  const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y
  const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2)
  const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2)

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
 * Calculate the horizontal width (X-distance) between two body parts
 * Used for face-on rotation detection via width narrowing
 */
export function calculateBodyWidth(
  landmarks: Landmark[],
  bodyPart: 'shoulders' | 'hips'
): number {
  const leftIdx = bodyPart === 'shoulders' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.LEFT_HIP
  const rightIdx = bodyPart === 'shoulders' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.RIGHT_HIP

  const left = landmarks[leftIdx]
  const right = landmarks[rightIdx]

  if (!left || !right) return 0

  return Math.abs(right.x - left.x)
}

/**
 * Calculate rotation angle for face-on video using width narrowing
 *
 * When a golfer rotates away from the camera:
 * - Shoulder/hip width appears to narrow
 * - At 90° rotation, width approaches zero (seen edge-on)
 * - Formula: rotation = acos(currentWidth / addressWidth) × (180/π)
 *
 * Returns rotation in degrees (0 at address, increases as body turns)
 */
export function calculateRotationFromWidth(
  currentLandmarks: Landmark[],
  addressLandmarks: Landmark[],
  bodyPart: 'shoulders' | 'hips'
): number {
  const addressWidth = calculateBodyWidth(addressLandmarks, bodyPart)
  const currentWidth = calculateBodyWidth(currentLandmarks, bodyPart)

  if (addressWidth === 0) return 0

  // Ratio of current to address width (1.0 = no rotation, 0.0 = 90° rotation)
  // Clamp to [0, 1] to handle noise where width might exceed address
  const widthRatio = Math.max(0, Math.min(1, currentWidth / addressWidth))

  // Convert ratio to angle: acos gives us the rotation angle
  const rotationRadians = Math.acos(widthRatio)
  return rotationRadians * (180 / Math.PI)
}

/**
 * Calculate hip sway for face-on view
 * Measures how much the hip center moves horizontally during the swing
 * Returns normalized sway as a fraction of stance width (0-1 scale)
 * Lower values indicate less sway (better)
 */
export function calculateHipSway(
  allFramesLandmarks: Landmark[][],
  addressLandmarks: Landmark[]
): number {
  if (allFramesLandmarks.length === 0) return 0

  const leftHipAddr = addressLandmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHipAddr = addressLandmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftAnkleAddr = addressLandmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkleAddr = addressLandmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  if (!leftHipAddr || !rightHipAddr || !leftAnkleAddr || !rightAnkleAddr) return 0

  // Calculate address hip center X position
  const addressHipCenterX = (leftHipAddr.x + rightHipAddr.x) / 2

  // Calculate stance width for normalization
  const stanceWidth = Math.abs(rightAnkleAddr.x - leftAnkleAddr.x)
  if (stanceWidth === 0) return 0

  // Track min and max hip center X positions throughout swing
  let minHipX = addressHipCenterX
  let maxHipX = addressHipCenterX

  for (const landmarks of allFramesLandmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
    if (!leftHip || !rightHip) continue

    const hipCenterX = (leftHip.x + rightHip.x) / 2
    minHipX = Math.min(minHipX, hipCenterX)
    maxHipX = Math.max(maxHipX, hipCenterX)
  }

  // Total sway distance normalized to stance width
  const swayDistance = maxHipX - minHipX
  return swayDistance / stanceWidth
}

/**
 * Calculate head stability for face-on view
 * Measures how much the head moves from its address position
 * Returns normalized movement (0-1 scale, lower is better)
 */
export function calculateHeadStability(
  swingFramesLandmarks: Landmark[][],
  addressFramesLandmarks: Landmark[][],
  addressLandmarks: Landmark[]
): number {
  if (swingFramesLandmarks.length === 0) return 0

  // Use nose as head reference point (from address position)
  const noseAddr = addressLandmarks[POSE_LANDMARKS.NOSE]
  if (!noseAddr) return 0

  // Calculate median body height across address phase frames for robustness
  // Using shoulder-to-ankle for full body height (more intuitive normalization)
  const bodyHeights: number[] = []

  for (const landmarks of addressFramesLandmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    if (leftShoulder && leftAnkle) {
      const height = Math.abs(leftShoulder.y - leftAnkle.y)
      if (height > 0) {
        bodyHeights.push(height)
      }
    }
  }

  if (bodyHeights.length === 0) return 0

  // Use median for robustness against outliers
  bodyHeights.sort((a, b) => a - b)
  const medianIndex = Math.floor(bodyHeights.length / 2)
  const medianBodyHeight = bodyHeights.length % 2 === 0
    ? (bodyHeights[medianIndex - 1] + bodyHeights[medianIndex]) / 2
    : bodyHeights[medianIndex]

  if (medianBodyHeight === 0) return 0

  // Collect all deviations from address head position (during swing only)
  const deviations: number[] = []

  for (const landmarks of swingFramesLandmarks) {
    const nose = landmarks[POSE_LANDMARKS.NOSE]
    if (!nose) continue

    // Calculate 2D distance from address position
    const dx = nose.x - noseAddr.x
    const dy = nose.y - noseAddr.y
    const deviation = Math.sqrt(dx * dx + dy * dy)

    deviations.push(deviation)
  }

  if (deviations.length === 0) return 0

  // Use 95th percentile instead of max to filter outliers from pose detection errors
  deviations.sort((a, b) => a - b)
  const percentile95Index = Math.floor(deviations.length * 0.95)
  const percentile95Deviation = deviations[Math.min(percentile95Index, deviations.length - 1)]

  // Normalize to median body height
  return percentile95Deviation / medianBodyHeight
}

/**
 * Calculate arm extension through impact for face-on view
 * Measures how well the arms extend toward the target post-impact
 * Returns a score from 0-1 (higher is better extension)
 */
export function calculateImpactExtension(
  impactLandmarks: Landmark[],
  postImpactFrames: Landmark[][],
  isRightHanded: boolean
): number {
  // Lead arm is left for right-handers
  const leadShoulderIdx = isRightHanded ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER
  const leadWristIdx = isRightHanded ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST
  const trailWristIdx = isRightHanded ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST

  const leadShoulder = impactLandmarks[leadShoulderIdx]
  const leadWrist = impactLandmarks[leadWristIdx]
  const trailWrist = impactLandmarks[trailWristIdx]

  if (!leadShoulder || !leadWrist || !trailWrist) return 0.5

  // Calculate arm reach at impact (distance from shoulder to hands)
  const handsCenterX = (leadWrist.x + trailWrist.x) / 2
  const handsCenterY = (leadWrist.y + trailWrist.y) / 2

  const impactReach = Math.sqrt(
    (handsCenterX - leadShoulder.x) ** 2 +
    (handsCenterY - leadShoulder.y) ** 2
  )

  // Calculate reach for post-impact frames and take median
  if (postImpactFrames.length > 0) {
    const postImpactReaches: number[] = []

    for (const landmarks of postImpactFrames) {
      const ftLeadShoulder = landmarks[leadShoulderIdx]
      const ftLeadWrist = landmarks[leadWristIdx]
      const ftTrailWrist = landmarks[trailWristIdx]

      if (ftLeadShoulder && ftLeadWrist && ftTrailWrist) {
        const ftHandsCenterX = (ftLeadWrist.x + ftTrailWrist.x) / 2
        const ftHandsCenterY = (ftLeadWrist.y + ftTrailWrist.y) / 2

        const ftReach = Math.sqrt(
          (ftHandsCenterX - ftLeadShoulder.x) ** 2 +
          (ftHandsCenterY - ftLeadShoulder.y) ** 2
        )
        postImpactReaches.push(ftReach)
      }
    }

    if (postImpactReaches.length > 0 && impactReach > 0) {
      // Take median of post-impact reaches
      postImpactReaches.sort((a, b) => a - b)
      const medianIdx = Math.floor(postImpactReaches.length / 2)
      const medianReach = postImpactReaches.length % 2 === 0
        ? (postImpactReaches[medianIdx - 1] + postImpactReaches[medianIdx]) / 2
        : postImpactReaches[medianIdx]

      const extensionRatio = medianReach / impactReach
      const score = Math.min(1, Math.max(0, extensionRatio - 0.5) * 2)

      logger.info('Impact Extension Debug:', {
        impactReach: impactReach.toFixed(3),
        medianPostImpactReach: medianReach.toFixed(3),
        extensionRatio: extensionRatio.toFixed(2),
        score: score.toFixed(2),
        sampledFrames: postImpactReaches.length,
      })

      return score
    }
  }

  // Fallback: just check if arms are reasonably extended at impact
  // Compare to shoulder width as reference
  const leftShoulder = impactLandmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = impactLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  if (leftShoulder && rightShoulder) {
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x)
    if (shoulderWidth > 0) {
      // Good extension = reach > 1.5x shoulder width
      const extensionRatio = impactReach / shoulderWidth
      const score = Math.min(1, Math.max(0, (extensionRatio - 1) / 1.5))

      logger.info('Impact Extension Debug (fallback):', {
        impactReach: impactReach.toFixed(3),
        shoulderWidth: shoulderWidth.toFixed(3),
        extensionRatio: extensionRatio.toFixed(2),
        score: score.toFixed(2),
      })

      return score
    }
  }

  return 0.5
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
  const shoulderRatio = shoulderDx / (shoulderDz + CAMERA_ANGLE_DETECTION.EPSILON)
  const hipRatio = hipDx / (hipDz + CAMERA_ANGLE_DETECTION.EPSILON)
  const avgRatio = (shoulderRatio + hipRatio) / 2

  let angle: CameraAngle
  let confidence: number

  if (avgRatio > CAMERA_ANGLE_DETECTION.FACE_ON_THRESHOLD) {
    angle = 'face-on'
    // Higher ratio = more confident it's face-on
    confidence = Math.min(1, (avgRatio - CAMERA_ANGLE_DETECTION.FACE_ON_THRESHOLD) / 3 + 0.7)
  } else if (avgRatio < CAMERA_ANGLE_DETECTION.DTL_THRESHOLD) {
    angle = 'dtl'
    // Lower ratio = more confident it's DTL
    confidence = Math.min(1, (CAMERA_ANGLE_DETECTION.DTL_THRESHOLD - avgRatio) / 0.4 + 0.7)
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
  const sampleCount = Math.min(CAMERA_ANGLE_DETECTION.SAMPLE_COUNT, framesLandmarks.length)
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

  if (avgRatio > CAMERA_ANGLE_DETECTION.FACE_ON_THRESHOLD) {
    angle = 'face-on'
    confidence = Math.min(1, (avgRatio - CAMERA_ANGLE_DETECTION.FACE_ON_THRESHOLD) / 3 + 0.7)
  } else if (avgRatio < CAMERA_ANGLE_DETECTION.DTL_THRESHOLD) {
    angle = 'dtl'
    confidence = Math.min(1, (CAMERA_ANGLE_DETECTION.DTL_THRESHOLD - avgRatio) / 0.4 + 0.7)
  } else {
    angle = 'oblique'
    confidence = 0.5
  }

  return { angle, confidence, ratio: avgRatio }
}

// =============================================================================
// CLUB TYPE DETECTION
// =============================================================================

export interface ClubTypeResult {
  clubType: ClubType
  confidence: number
  signals: {
    stanceRatio: number
    handDistance: number
    spineAngle: number
    armExtension: number
    kneeFlexAngle: number
  }
}

/**
 * Calculate stance width ratio (stance width / hip width)
 * Driver stance is typically wider relative to hip width
 */
function calculateStanceRatio(landmarks: Landmark[]): number {
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftAnkle || !rightAnkle || !leftHip || !rightHip) return 1.0

  const stanceWidth = Math.abs(rightAnkle.x - leftAnkle.x)
  const hipWidth = Math.abs(rightHip.x - leftHip.x)

  if (hipWidth === 0) return 1.0
  return stanceWidth / hipWidth
}

/**
 * Calculate hand distance from body (normalized to shoulder width)
 * Longer clubs = hands further from body at address
 */
function calculateHandDistance(landmarks: Landmark[]): number {
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]

  if (!leftWrist || !rightWrist || !leftHip || !rightHip || !leftShoulder || !rightShoulder) {
    return 0.7 // Default middle value
  }

  // Calculate hand center and hip center
  const handCenterX = (leftWrist.x + rightWrist.x) / 2
  const handCenterY = (leftWrist.y + rightWrist.y) / 2
  const hipCenterX = (leftHip.x + rightHip.x) / 2
  const hipCenterY = (leftHip.y + rightHip.y) / 2

  // Calculate distance from hands to hip center
  const handDistance = Math.sqrt(
    (handCenterX - hipCenterX) ** 2 + (handCenterY - hipCenterY) ** 2
  )

  // Normalize to shoulder width
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x)
  if (shoulderWidth === 0) return 0.7

  return handDistance / shoulderWidth
}

/**
 * Calculate absolute spine angle at address (degrees from vertical)
 */
function calculateAbsSpineAngle(landmarks: Landmark[]): number {
  const spineAngle = calculateSpineAngle(landmarks)
  return Math.abs(spineAngle)
}

/**
 * Calculate arm extension ratio (vertical drop from shoulders to hands / body height)
 * Higher values = hands lower relative to body = more bent over (typical for irons)
 * Works reliably in face-on view (uses Y-axis only)
 */
function calculateArmExtensionRatio(landmarks: Landmark[]): number {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist || !leftAnkle || !rightAnkle) {
    return 0.40 // Default middle value
  }

  // Calculate vertical centers (Y increases downward in video coordinates)
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
  const handCenterY = (leftWrist.y + rightWrist.y) / 2
  const ankleCenterY = (leftAnkle.y + rightAnkle.y) / 2

  // Body height from shoulders to ankles
  const bodyHeight = Math.abs(ankleCenterY - shoulderCenterY)
  if (bodyHeight === 0) return 0.40

  // Arm drop (how far hands are below shoulders)
  const armDrop = handCenterY - shoulderCenterY // Positive = hands below shoulders

  // Normalize to body height
  return armDrop / bodyHeight
}

/**
 * Calculate average knee flex angle at address (degrees)
 * Lower angle = more knee flex = iron (shorter club, more bent stance)
 * Works reliably in face-on view
 */
function calculateKneeFlexAngle(landmarks: Landmark[]): number {
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return 155 // Default nearly straight
  }

  const leftKneeAngle = calculateAngle2D(leftHip, leftKnee, leftAnkle)
  const rightKneeAngle = calculateAngle2D(rightHip, rightKnee, rightAnkle)

  return (leftKneeAngle + rightKneeAngle) / 2
}

/**
 * Detect club type from address position landmarks
 * Uses stance width, hand position, spine angle, arm extension, and knee flex as signals
 * Camera angle determines which signals are reliable
 */
export function detectClubType(landmarks: Landmark[], cameraAngle: CameraAngle): ClubTypeResult {
  const stanceRatio = calculateStanceRatio(landmarks)
  const handDistance = calculateHandDistance(landmarks)
  const spineAngle = calculateAbsSpineAngle(landmarks)
  const armExtension = calculateArmExtensionRatio(landmarks)
  const kneeFlexAngle = calculateKneeFlexAngle(landmarks)

  // Score each signal for driver vs iron
  // Positive = driver, negative = iron
  let driverScore = 0
  let signalCount = 0

  const isFaceOn = cameraAngle === 'face-on'
  const isDTL = cameraAngle === 'dtl'

  // Stance ratio signal - only reliable for face-on and oblique (uses X-axis)
  // For face-on, this is the primary signal for club detection
  // Single threshold - no ambiguous zone
  if (!isDTL) {
    if (stanceRatio >= CLUB_DETECTION.STANCE_RATIO.THRESHOLD) {
      driverScore += 1
      signalCount++
    } else {
      driverScore -= 1
      signalCount++
    }
  }

  // Hand distance signal - only reliable for oblique views
  // Face-on: can't see depth (Z-axis)
  // DTL: shoulder width normalization is broken (shoulders stacked in X)
  if (!isFaceOn && !isDTL) {
    const handWeight = 0.7
    if (handDistance >= CLUB_DETECTION.HAND_DISTANCE.DRIVER_MIN) {
      driverScore += handWeight
      signalCount += handWeight
    } else if (handDistance <= CLUB_DETECTION.HAND_DISTANCE.IRON_MAX) {
      driverScore -= handWeight
      signalCount += handWeight
    } else {
      signalCount += handWeight * 0.5
    }
  }

  // Spine angle signal - only reliable for DTL (face-on shows lateral tilt)
  // Single threshold at 45° - no ambiguous zone
  if (!isFaceOn) {
    if (spineAngle <= CLUB_DETECTION.SPINE_ANGLE.THRESHOLD) {
      driverScore += 1
      signalCount++
    } else {
      driverScore -= 1
      signalCount++
    }
  }

  // Knee flex signal - only reliable for DTL and oblique
  // Face-on: knee flex happens in Z-axis (toward/away from camera), not visible
  // More flex (lower angle) = iron
  if (!isFaceOn) {
    const kneeWeight = 0.6
    if (kneeFlexAngle >= CLUB_DETECTION.KNEE_FLEX.DRIVER_MIN) {
      driverScore += kneeWeight
      signalCount += kneeWeight
    } else if (kneeFlexAngle <= CLUB_DETECTION.KNEE_FLEX.IRON_MAX) {
      driverScore -= kneeWeight
      signalCount += kneeWeight
    } else {
      signalCount += kneeWeight * 0.5 // Ambiguous zone
    }
  }

  // Calculate confidence based on signal agreement
  const normalizedScore = signalCount > 0 ? driverScore / signalCount : 0
  const confidence = Math.abs(normalizedScore)

  let clubType: ClubType
  if (confidence < CLUB_DETECTION.MIN_CONFIDENCE) {
    clubType = 'unknown'
  } else if (normalizedScore > 0) {
    clubType = 'driver'
  } else {
    clubType = 'iron'
  }

  return {
    clubType,
    confidence,
    signals: {
      stanceRatio,
      handDistance,
      spineAngle,
      armExtension,
      kneeFlexAngle,
    },
  }
}

/**
 * Detect club type from multiple frames for more stable detection
 * Samples early frames (address position)
 */
export function detectClubTypeFromFrames(
  framesLandmarks: Landmark[][],
  cameraAngle: CameraAngle
): ClubTypeResult {
  if (framesLandmarks.length === 0) {
    return {
      clubType: 'unknown',
      confidence: 0,
      signals: { stanceRatio: 0, handDistance: 0, spineAngle: 0, armExtension: 0, kneeFlexAngle: 0 },
    }
  }

  const sampleCount = Math.min(CLUB_DETECTION.SAMPLE_FRAMES, framesLandmarks.length)

  let totalStanceRatio = 0
  let totalHandDistance = 0
  let totalSpineAngle = 0
  let totalArmExtension = 0
  let totalKneeFlexAngle = 0

  // Accumulate signals from all sampled frames regardless of individual confidence
  // Individual frame confidence can be 0 when signals are in the ambiguous zone,
  // but the signal values are still valid and should be averaged
  for (let i = 0; i < sampleCount; i++) {
    const result = detectClubType(framesLandmarks[i], cameraAngle)
    totalStanceRatio += result.signals.stanceRatio
    totalHandDistance += result.signals.handDistance
    totalSpineAngle += result.signals.spineAngle
    totalArmExtension += result.signals.armExtension
    totalKneeFlexAngle += result.signals.kneeFlexAngle
  }

  const avgSignals = {
    stanceRatio: totalStanceRatio / sampleCount,
    handDistance: totalHandDistance / sampleCount,
    spineAngle: totalSpineAngle / sampleCount,
    armExtension: totalArmExtension / sampleCount,
    kneeFlexAngle: totalKneeFlexAngle / sampleCount,
  }

  // Re-run detection logic with averaged values
  let driverScore = 0
  let signalCount = 0

  const isFaceOn = cameraAngle === 'face-on'
  const isDTL = cameraAngle === 'dtl'

  // Stance ratio signal - only reliable for face-on and oblique
  // For face-on, use lower weight since pro golfers have varying stance widths
  if (!isDTL) {
    const stanceWeight = isFaceOn ? 0.3 : 1.0
    if (avgSignals.stanceRatio >= CLUB_DETECTION.STANCE_RATIO.DRIVER_MIN) {
      driverScore += stanceWeight
      signalCount += stanceWeight
    } else if (avgSignals.stanceRatio <= CLUB_DETECTION.STANCE_RATIO.IRON_MAX) {
      driverScore -= stanceWeight
      signalCount += stanceWeight
    } else {
      signalCount += stanceWeight * 0.5
    }
  }

  // Hand distance signal - only reliable for oblique views
  // Face-on: can't see depth (Z-axis)
  // DTL: shoulder width normalization is broken (shoulders stacked in X)
  if (!isFaceOn && !isDTL) {
    const handWeight = 0.7
    if (avgSignals.handDistance >= CLUB_DETECTION.HAND_DISTANCE.DRIVER_MIN) {
      driverScore += handWeight
      signalCount += handWeight
    } else if (avgSignals.handDistance <= CLUB_DETECTION.HAND_DISTANCE.IRON_MAX) {
      driverScore -= handWeight
      signalCount += handWeight
    } else {
      signalCount += handWeight * 0.5
    }
  }

  // Spine angle signal - only reliable for DTL
  // Single threshold at 45° - no ambiguous zone
  if (!isFaceOn) {
    if (avgSignals.spineAngle <= CLUB_DETECTION.SPINE_ANGLE.THRESHOLD) {
      driverScore += 1
      signalCount++
    } else {
      driverScore -= 1
      signalCount++
    }
  }

  // Arm extension signal - reliable for face-on and oblique (uses Y-axis)
  // Higher extension = more bent over = iron
  // For face-on, this is the primary signal - use higher weight
  if (!isDTL) {
    const armWeight = isFaceOn ? 1.2 : 0.8
    if (avgSignals.armExtension <= CLUB_DETECTION.ARM_EXTENSION.DRIVER_MAX) {
      driverScore += armWeight
      signalCount += armWeight
    } else if (avgSignals.armExtension >= CLUB_DETECTION.ARM_EXTENSION.IRON_MIN) {
      driverScore -= armWeight
      signalCount += armWeight
    } else {
      signalCount += armWeight * 0.5
    }
  }

  // Knee flex signal - only reliable for DTL and oblique
  // Face-on: knee flex happens in Z-axis (toward/away from camera), not visible
  // More flex (lower angle) = iron
  if (!isFaceOn) {
    const kneeWeight = 0.6
    if (avgSignals.kneeFlexAngle >= CLUB_DETECTION.KNEE_FLEX.DRIVER_MIN) {
      driverScore += kneeWeight
      signalCount += kneeWeight
    } else if (avgSignals.kneeFlexAngle <= CLUB_DETECTION.KNEE_FLEX.IRON_MAX) {
      driverScore -= kneeWeight
      signalCount += kneeWeight
    } else {
      signalCount += kneeWeight * 0.5
    }
  }

  const normalizedScore = signalCount > 0 ? driverScore / signalCount : 0
  const confidence = Math.abs(normalizedScore)

  let clubType: ClubType
  if (confidence < CLUB_DETECTION.MIN_CONFIDENCE) {
    clubType = 'unknown'
  } else if (normalizedScore > 0) {
    clubType = 'driver'
  } else {
    clubType = 'iron'
  }

  return {
    clubType,
    confidence,
    signals: avgSignals,
  }
}
