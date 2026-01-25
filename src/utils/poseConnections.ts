import { POSE_LANDMARKS } from '@/types/pose'

// Skeleton connections for drawing pose
export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],

  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],

  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],

  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],

  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
]

// Color scheme for different body parts
export const SKELETON_COLORS = {
  face: '#E5E7EB', // gray-200
  torso: '#10B981', // green-500
  leftArm: '#3B82F6', // blue-500
  rightArm: '#8B5CF6', // purple-500
  leftLeg: '#F59E0B', // amber-500
  rightLeg: '#EF4444', // red-500
  default: '#6B7280', // gray-500
}

// Get color for a connection based on its landmarks
export function getConnectionColor(startIdx: number, endIdx: number): string {
  const leftArmLandmarks: number[] = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.LEFT_WRIST,
    POSE_LANDMARKS.LEFT_PINKY,
    POSE_LANDMARKS.LEFT_INDEX,
    POSE_LANDMARKS.LEFT_THUMB,
  ]

  const rightArmLandmarks: number[] = [
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.RIGHT_WRIST,
    POSE_LANDMARKS.RIGHT_PINKY,
    POSE_LANDMARKS.RIGHT_INDEX,
    POSE_LANDMARKS.RIGHT_THUMB,
  ]

  const leftLegLandmarks: number[] = [
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.LEFT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.LEFT_HEEL,
    POSE_LANDMARKS.LEFT_FOOT_INDEX,
  ]

  const rightLegLandmarks: number[] = [
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.RIGHT_ANKLE,
    POSE_LANDMARKS.RIGHT_HEEL,
    POSE_LANDMARKS.RIGHT_FOOT_INDEX,
  ]

  const faceLandmarks: number[] = [
    POSE_LANDMARKS.NOSE,
    POSE_LANDMARKS.LEFT_EYE,
    POSE_LANDMARKS.RIGHT_EYE,
    POSE_LANDMARKS.LEFT_EAR,
    POSE_LANDMARKS.RIGHT_EAR,
  ]

  const torsoLandmarks: number[] = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ]

  // Check if both endpoints belong to the same body part
  if (faceLandmarks.includes(startIdx) && faceLandmarks.includes(endIdx)) {
    return SKELETON_COLORS.face
  }

  // Arms (excluding shoulder which is shared with torso)
  if (leftArmLandmarks.slice(1).includes(startIdx) || leftArmLandmarks.slice(1).includes(endIdx)) {
    if (leftArmLandmarks.includes(startIdx) && leftArmLandmarks.includes(endIdx)) {
      return SKELETON_COLORS.leftArm
    }
  }

  if (rightArmLandmarks.slice(1).includes(startIdx) || rightArmLandmarks.slice(1).includes(endIdx)) {
    if (rightArmLandmarks.includes(startIdx) && rightArmLandmarks.includes(endIdx)) {
      return SKELETON_COLORS.rightArm
    }
  }

  // Legs (excluding hip which is shared with torso)
  if (leftLegLandmarks.slice(1).includes(startIdx) || leftLegLandmarks.slice(1).includes(endIdx)) {
    if (leftLegLandmarks.includes(startIdx) && leftLegLandmarks.includes(endIdx)) {
      return SKELETON_COLORS.leftLeg
    }
  }

  if (rightLegLandmarks.slice(1).includes(startIdx) || rightLegLandmarks.slice(1).includes(endIdx)) {
    if (rightLegLandmarks.includes(startIdx) && rightLegLandmarks.includes(endIdx)) {
      return SKELETON_COLORS.rightLeg
    }
  }

  // Torso connections
  if (torsoLandmarks.includes(startIdx) && torsoLandmarks.includes(endIdx)) {
    return SKELETON_COLORS.torso
  }

  return SKELETON_COLORS.default
}

// Get point color based on visibility/confidence
export function getPointColor(visibility: number): string {
  if (visibility >= 0.8) return '#10B981' // green-500
  if (visibility >= 0.5) return '#F59E0B' // amber-500
  if (visibility >= 0.3) return '#EF4444' // red-500
  return '#6B7280' // gray-500
}

// Get point size based on visibility
export function getPointSize(visibility: number, baseSize: number = 4): number {
  return baseSize * Math.max(0.5, visibility)
}

// Line width based on confidence
export function getLineWidth(
  startVisibility: number,
  endVisibility: number,
  baseWidth: number = 2
): number {
  const avgVisibility = (startVisibility + endVisibility) / 2
  return baseWidth * Math.max(0.3, avgVisibility)
}
