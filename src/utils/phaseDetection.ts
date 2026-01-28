import type { Landmark, PoseFrame } from '@/types/pose'
import type { SwingPhase } from '@/types/analysis'
import {
  getHandPosition,
  calculateFrameMetrics,
  type FrameMetrics,
} from './angleCalculations'
import { logger } from './debugLogger'
import { PHASE_DETECTION } from './constants'

export interface PhaseFrame {
  frameIndex: number
  timestamp: number
  phase: SwingPhase
  metrics: FrameMetrics
  confidence: number
}

export interface SwingPhaseResult {
  phases: PhaseFrame[]
  keyFrames: {
    address: PhaseFrame | null
    topOfBackswing: PhaseFrame | null
    impact: PhaseFrame | null
    finish: PhaseFrame | null
  }
  isRightHanded: boolean
}

/**
 * Detect if the golfer is right-handed or left-handed based on hand positions
 * Right-handed golfers have their left hand higher on the club (closer to body at address)
 */
function detectHandedness(frames: PoseFrame[]): boolean {
  if (frames.length === 0) return true

  // Sample the first few frames (address position)
  const sampleFrames = frames.slice(0, Math.min(5, frames.length))

  let leftHandHigherCount = 0
  for (const frame of sampleFrames) {
    const leftHand = getHandPosition(frame.landmarks, 'left')
    const rightHand = getHandPosition(frame.landmarks, 'right')

    // In golf address, the lead hand (left for right-handers) is typically
    // positioned differently than the trail hand
    if (leftHand.y < rightHand.y) {
      leftHandHigherCount++
    }
  }

  // If left hand is typically higher, golfer is right-handed
  return leftHandHigherCount > sampleFrames.length / 2
}

/**
 * Calculate velocity of hand movement between frames
 */
function calculateHandVelocity(
  prevLandmarks: Landmark[],
  currLandmarks: Landmark[],
  deltaTime: number,
  side: 'left' | 'right'
): number {
  const prevPos = getHandPosition(prevLandmarks, side)
  const currPos = getHandPosition(currLandmarks, side)

  const dx = currPos.x - prevPos.x
  const dy = currPos.y - prevPos.y
  const dz = currPos.z - prevPos.z

  const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
  return deltaTime > 0 ? distance / deltaTime : 0
}

/**
 * Apply moving average smoothing to an array of values
 * This reduces noise and makes peak detection more stable
 */
function smoothArray(values: number[], windowSize: number): number[] {
  if (values.length === 0) return []

  const halfWindow = Math.floor(windowSize / 2)
  const smoothed: number[] = []

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(values.length - 1, i + halfWindow)
    let sum = 0
    let count = 0

    for (let j = start; j <= end; j++) {
      sum += values[j]
      count++
    }

    smoothed.push(sum / count)
  }

  return smoothed
}

/**
 * Find a robust peak by requiring the peak to be higher than surrounding frames
 * Returns the index of the most stable peak
 */
function findRobustPeakIndex(
  values: number[],
  startIdx: number,
  endIdx: number,
  minPeakWidth: number = 3
): number {
  if (values.length === 0) return 0

  let bestPeakIdx = startIdx
  let bestPeakScore = -Infinity

  for (let i = startIdx; i < endIdx; i++) {
    // Check if this is a local maximum with sufficient width
    let isLocalMax = true
    let peakScore = values[i]

    // Check neighbors on both sides
    for (let offset = 1; offset <= minPeakWidth && isLocalMax; offset++) {
      const leftIdx = i - offset
      const rightIdx = i + offset

      if (leftIdx >= 0 && values[leftIdx] > values[i]) {
        isLocalMax = false
      }
      if (rightIdx < values.length && values[rightIdx] > values[i]) {
        isLocalMax = false
      }
    }

    // Score considers both the peak value and how much higher it is than neighbors
    if (isLocalMax && peakScore > bestPeakScore) {
      bestPeakScore = peakScore
      bestPeakIdx = i
    }
  }

  return bestPeakIdx
}

/**
 * Find the minimum value index in a range
 */
function findMinIndex(values: number[], startIdx: number, endIdx: number): number {
  let minIdx = startIdx
  let minVal = Infinity

  for (let i = startIdx; i < endIdx; i++) {
    if (values[i] < minVal) {
      minVal = values[i]
      minIdx = i
    }
  }

  return minIdx
}

/**
 * Detect swing phases for all frames
 *
 * The algorithm works by:
 * 1. Finding the impact frame (peak velocity) - this anchors the timeline
 * 2. Finding top of backswing BEFORE impact (hand direction reversal + highest position before impact)
 * 3. Assigning other phases based on relative positions
 */
export function detectSwingPhases(frames: PoseFrame[]): SwingPhaseResult {
  if (frames.length === 0) {
    return {
      phases: [],
      keyFrames: {
        address: null,
        topOfBackswing: null,
        impact: null,
        finish: null,
      },
      isRightHanded: true,
    }
  }

  const isRightHanded = detectHandedness(frames)
  const leadHand = isRightHanded ? 'left' : 'right'

  const phaseFrames: PhaseFrame[] = []
  const handHeights: number[] = []
  const velocities: number[] = []
  const handXPositions: number[] = [] // Horizontal hand position for direction detection

  // First pass: collect metrics
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const metrics = calculateFrameMetrics(frame.landmarks)

    const handPos = getHandPosition(frame.landmarks, leadHand)
    handHeights.push(handPos.y)
    handXPositions.push(handPos.x)

    // Calculate velocity
    if (i > 0) {
      const deltaTime = frame.timestamp - frames[i - 1].timestamp
      const velocity = calculateHandVelocity(
        frames[i - 1].landmarks,
        frame.landmarks,
        deltaTime,
        leadHand
      )
      velocities.push(velocity)
    } else {
      velocities.push(0)
    }

    phaseFrames.push({
      frameIndex: frame.frameIndex,
      timestamp: frame.timestamp,
      phase: 'address', // Will be updated
      metrics,
      confidence: 0.5,
    })
  }

  // Apply smoothing to reduce noise
  const smoothedVelocities = smoothArray(velocities, PHASE_DETECTION.SMOOTHING_WINDOW)
  const smoothedHandHeights = smoothArray(handHeights, PHASE_DETECTION.SMOOTHING_WINDOW)

  // Step 1: Find impact frame using smoothed velocities
  // Use robust peak detection to find the most stable velocity peak
  const impactSearchStart = Math.floor(frames.length * PHASE_DETECTION.IMPACT_SEARCH.START_FRACTION)
  const impactSearchEnd = Math.floor(frames.length * PHASE_DETECTION.IMPACT_SEARCH.END_FRACTION)

  let impactIdx = findRobustPeakIndex(smoothedVelocities, impactSearchStart, impactSearchEnd, PHASE_DETECTION.MIN_PEAK_WIDTH)

  // Fallback: if no robust peak found, use simple max in the search range
  if (impactIdx === impactSearchStart) {
    let maxVelocity = 0
    for (let i = impactSearchStart; i < impactSearchEnd; i++) {
      if (smoothedVelocities[i] > maxVelocity) {
        maxVelocity = smoothedVelocities[i]
        impactIdx = i
      }
    }
  }

  // Refine impact detection: peak velocity often occurs several frames before actual impact
  // For slow-motion videos, this gap can be significant (10+ frames)
  const peakVelocity = smoothedVelocities[impactIdx]
  const velocityDropThreshold = peakVelocity * PHASE_DETECTION.VELOCITY_DROP_THRESHOLD

  // Search more frames after the peak for velocity drop
  for (let i = impactIdx; i < Math.min(impactIdx + PHASE_DETECTION.VELOCITY_DROP_SEARCH_FRAMES, impactSearchEnd); i++) {
    if (smoothedVelocities[i] < velocityDropThreshold) {
      // Impact is likely the frame just before the drop
      impactIdx = Math.max(impactIdx, i - 1)
      break
    }
  }

  // Alternative: if hands reach their lowest point (highest Y) near the velocity peak,
  // that's a strong indicator of impact. Use wider window for slow-motion videos.
  const handHeightCheckStart = Math.max(0, impactIdx - 3)
  const handHeightCheckEnd = Math.min(frames.length, impactIdx + PHASE_DETECTION.HAND_HEIGHT_SEARCH_FRAMES)
  let maxHandY = -Infinity
  let maxHandYIdx = impactIdx

  for (let i = handHeightCheckStart; i < handHeightCheckEnd; i++) {
    // In MediaPipe, higher Y = lower in frame, so look for max Y near impact
    if (smoothedHandHeights[i] > maxHandY) {
      maxHandY = smoothedHandHeights[i]
      maxHandYIdx = i
    }
  }

  // If the lowest hand position is after the velocity peak, consider using it
  // (velocity peak comes before ball contact, lowest hand position = ball contact)
  // But limit how far we look - if too far after velocity peak, it's likely follow-through
  if (maxHandYIdx > impactIdx && maxHandYIdx <= impactIdx + PHASE_DETECTION.MAX_HAND_HEIGHT_OFFSET) {
    // Within reasonable range, prefer hand height as more direct indicator
    impactIdx = maxHandYIdx
  } else if (maxHandYIdx > impactIdx + PHASE_DETECTION.MAX_HAND_HEIGHT_OFFSET) {
    // Too far - likely in follow-through. Use weighted average closer to velocity peak
    impactIdx = Math.round(impactIdx + PHASE_DETECTION.MAX_HAND_HEIGHT_OFFSET * 0.7)
  } else if (Math.abs(maxHandYIdx - impactIdx) <= 3) {
    // If close, average them
    impactIdx = Math.round((impactIdx + maxHandYIdx) / 2)
  }

  // Step 2: Find top of backswing BEFORE impact using smoothed hand heights
  // Look for: highest hand position (lowest Y value in MediaPipe coordinates)
  const searchStartIdx = Math.floor(frames.length * PHASE_DETECTION.TOP_SEARCH_START_FRACTION)
  const searchEndIdx = Math.max(searchStartIdx + 3, impactIdx - 3) // Must be before impact

  // Find the frame with highest hand position (minimum Y in smoothed data)
  let topOfBackswingIdx = findMinIndex(smoothedHandHeights, searchStartIdx, searchEndIdx)

  // Also look for velocity minimum in the smoothed data (transition point)
  const velocityDipIdx = findMinIndex(smoothedVelocities, searchStartIdx, searchEndIdx)

  // Combine both signals: if velocity dip is close to height peak, use average
  if (Math.abs(velocityDipIdx - topOfBackswingIdx) <= 3) {
    topOfBackswingIdx = Math.round((velocityDipIdx + topOfBackswingIdx) / 2)
  } else {
    // If they differ significantly, prefer the hand height (more reliable)
    // but ensure it's in a reasonable range
    topOfBackswingIdx = topOfBackswingIdx
  }

  // Ensure top is before impact with margin
  if (topOfBackswingIdx >= impactIdx - 2) {
    topOfBackswingIdx = Math.max(searchStartIdx, impactIdx - 4)
  }

  // Step 3: Find address end by looking for when velocity starts increasing
  // Address is the stable period at the start with low velocity
  const addressSearchEnd = Math.min(topOfBackswingIdx, Math.floor(frames.length * 0.5))
  let addressEndIdx = 0

  // Calculate baseline velocity from first few frames (should be low during address)
  const baselineFrames = Math.min(5, Math.floor(frames.length * PHASE_DETECTION.TOP_SEARCH_START_FRACTION))
  let baselineVelocity = 0
  for (let i = 0; i < baselineFrames; i++) {
    baselineVelocity += smoothedVelocities[i]
  }
  baselineVelocity = baselineVelocity / baselineFrames

  // Use multiple signals to find when swing actually starts
  const velocityThreshold = Math.max(
    baselineVelocity * PHASE_DETECTION.ADDRESS_DETECTION.VELOCITY_MULTIPLIER,
    smoothedVelocities[impactIdx] * PHASE_DETECTION.ADDRESS_DETECTION.PEAK_VELOCITY_FRACTION
  )

  // Look for sustained velocity increase (not just a single frame spike)
  for (let i = 2; i < addressSearchEnd; i++) {
    // Check if velocity exceeds threshold for at least 2 consecutive frames
    if (
      smoothedVelocities[i] > velocityThreshold &&
      smoothedVelocities[i + 1] > velocityThreshold
    ) {
      addressEndIdx = Math.max(0, i - 1)
      break
    }
  }

  // If no clear velocity increase found, use hand movement direction
  if (addressEndIdx < 3) {
    const initialHandX = handXPositions[0]

    for (let i = 3; i < addressSearchEnd; i++) {
      const handDelta = Math.abs(smoothedHandHeights[i] - smoothedHandHeights[0]) +
                        Math.abs(handXPositions[i] - initialHandX)
      if (handDelta > PHASE_DETECTION.ADDRESS_DETECTION.HAND_MOVEMENT_THRESHOLD) {
        addressEndIdx = Math.max(0, i - 2)
        break
      }
    }
  }

  // Ensure we have at least a few frames of address
  if (addressEndIdx < 2) {
    addressEndIdx = Math.min(5, Math.floor(topOfBackswingIdx * 0.2))
  }

  // Log phase detection results for debugging
  const videoDuration = frames[frames.length - 1].timestamp
  const fps = frames.length / videoDuration
  logger.info('Phase Detection:', {
    addressEndIdx,
    addressEndTime: frames[addressEndIdx]?.timestamp.toFixed(2),
    topOfBackswingIdx,
    topOfBackswingTime: frames[topOfBackswingIdx]?.timestamp.toFixed(2),
    impactIdx,
    impactTime: frames[impactIdx]?.timestamp.toFixed(2),
    totalFrames: frames.length,
    fps: fps.toFixed(1),
  })

  const followThroughStartIdx = impactIdx + 2
  const finishStartIdx = Math.floor(frames.length * PHASE_DETECTION.FINISH_START_FRACTION)

  for (let i = 0; i < phaseFrames.length; i++) {
    let phase: SwingPhase
    let confidence = 0.7

    if (i <= addressEndIdx) {
      // Address phase (start of swing)
      phase = 'address'
      confidence = i === 0 ? 0.9 : 0.7
    } else if (i < topOfBackswingIdx) {
      // Backswing (moving club back)
      phase = 'backswing'
      confidence = 0.8
    } else if (i >= topOfBackswingIdx && i <= topOfBackswingIdx + 1) {
      // Top of backswing (transition point)
      phase = 'top'
      confidence = 0.9
    } else if (i < impactIdx) {
      // Downswing (accelerating toward ball)
      phase = 'downswing'
      confidence = 0.8
    } else if (i >= impactIdx && i < followThroughStartIdx) {
      // Impact zone
      phase = 'impact'
      confidence = i === impactIdx ? 0.9 : 0.7
    } else if (i < finishStartIdx) {
      // Follow-through
      phase = 'follow-through'
      confidence = 0.75
    } else {
      // Finish
      phase = 'finish'
      confidence = i === frames.length - 1 ? 0.9 : 0.7
    }

    phaseFrames[i].phase = phase
    phaseFrames[i].confidence = confidence
  }

  // Extract key frames
  const addressFrame = phaseFrames.find((f) => f.phase === 'address') || null
  const topFrame = phaseFrames[topOfBackswingIdx] || null
  const impactFrame = phaseFrames[impactIdx] || null
  const finishFrame = phaseFrames[phaseFrames.length - 1] || null

  return {
    phases: phaseFrames,
    keyFrames: {
      address: addressFrame,
      topOfBackswing: topFrame,
      impact: impactFrame,
      finish: finishFrame,
    },
    isRightHanded,
  }
}

/**
 * Get the phase name as a display string
 */
export function getPhaseDisplayName(phase: SwingPhase): string {
  const names: Record<SwingPhase, string> = {
    address: 'Address',
    backswing: 'Backswing',
    top: 'Top of Backswing',
    downswing: 'Downswing',
    impact: 'Impact',
    'follow-through': 'Follow Through',
    finish: 'Finish',
  }
  return names[phase]
}

/**
 * Get phase color for visualization
 */
export function getPhaseColor(phase: SwingPhase): string {
  const colors: Record<SwingPhase, string> = {
    address: '#6B7280', // gray
    backswing: '#3B82F6', // blue
    top: '#8B5CF6', // purple
    downswing: '#F59E0B', // amber
    impact: '#EF4444', // red
    'follow-through': '#10B981', // green
    finish: '#6B7280', // gray
  }
  return colors[phase]
}
