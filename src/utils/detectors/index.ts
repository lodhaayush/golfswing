// Core types
export type {
  DetectorInput,
  DetectorResult,
  MistakeDetector,
} from './types'

export {
  getCategoryFromMistakeId,
  createNotDetectedResult,
  getPhaseFrameIndices,
} from './types'

// Orchestrator functions
export {
  runAllDetectors,
  getDetectedMistakes,
  getDetectedMistakesBySeverity,
  getTopMistakes,
} from './runAllDetectors'

// Setup detectors
export { detectPoorPosture } from './setup/poorPosture'
export { detectStanceWidthIssue } from './setup/stanceWidthIssue'

// Backswing detectors
export { detectSwaying } from './backswing/swaying'
export { detectReversePivot } from './backswing/reversePivot'
export { detectInsufficientShoulderTurn } from './backswing/insufficientShoulderTurn'
export { detectOverRotation } from './backswing/overRotation'
export { detectBentLeadArm } from './backswing/bentLeadArm'
export { detectLiftingHead } from './backswing/liftingHead'
export { detectRushingBackswing } from './backswing/rushingBackswing'

// Downswing detectors
export { detectEarlyExtension } from './downswing/earlyExtension'
export { detectHangingBack } from './downswing/hangingBack'
export { detectLossOfSpineAngle } from './downswing/lossOfSpineAngle'
export { detectSlidingHips } from './downswing/slidingHips'

// Impact detectors
export { detectChickenWing } from './impact/chickenWing'
export { detectPoorArmExtension } from './impact/poorArmExtension'
export { detectHeadMovement } from './impact/headMovement'

// Follow-through detectors
export { detectIncompleteFollowThrough } from './followThrough/incompleteFollowThrough'
export { detectUnbalancedFinish } from './followThrough/unbalancedFinish'
export { detectReverseCFinish } from './followThrough/reverseCFinish'

// Tempo detectors
export { detectPoorTempoRatio } from './tempo/poorTempoRatio'
