import type { PoseFrame } from './pose'
import type { PhaseSegment, ClubType } from './analysis'
import type { CameraAngle } from '@/utils/angleCalculations'

/**
 * Reference data for a pro swing video
 */
export interface ProVideoReference {
  id: string
  name: string
  videoUrl: string                // e.g., "/videos/pro-faceon-driver.mp4"
  poseFrames: PoseFrame[]
  phaseSegments: PhaseSegment[]
  cameraAngle: CameraAngle
  clubType: ClubType
  isRightHanded: boolean
}
