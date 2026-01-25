import type { PoseFrame } from './pose'
import type { CameraAngle } from '@/utils/angleCalculations'

// Simple phase identifier for each frame
export type SwingPhase =
  | 'address'
  | 'backswing'
  | 'top'
  | 'downswing'
  | 'impact'
  | 'follow-through'
  | 'finish'

// Detailed phase segment with timing
export interface PhaseSegment {
  phase: SwingPhase
  startFrame: number
  endFrame: number
  startTime: number
  endTime: number
  duration: number
}

export interface SwingMetrics {
  // Rotation metrics
  maxHipRotation: number
  maxShoulderRotation: number
  maxXFactor: number

  // At key positions
  addressSpineAngle: number
  topSpineAngle: number
  impactSpineAngle: number

  // Arm metrics
  topLeadArmExtension: number
  impactLeadArmExtension: number

  // Knee flex
  addressKneeFlex: number
  topKneeFlex: number
}

export interface TempoMetrics {
  backswingDuration: number
  downswingDuration: number
  tempoRatio: number // backswing / downswing, ideal is ~3:1
  totalSwingDuration: number
}

export interface AnalysisResult {
  id: string
  videoId: string
  createdAt: number
  frames: PoseFrame[]
  phaseSegments: PhaseSegment[]
  metrics: SwingMetrics
  tempo: TempoMetrics
  isRightHanded: boolean
  overallScore: number
  cameraAngle: CameraAngle
  cameraAngleConfidence: number
}
