import Foundation
import CoreGraphics

// MARK: - Phase Detection Constants

struct PhaseDetectionConstants {
    static let smoothingWindow = 5
    static let minPeakWidth = 3
    static let impactSearchStartFraction = 0.2
    static let impactSearchEndFraction = 0.8
    static let velocityDropThreshold = 0.7
    static let velocityDropSearchFrames = 8
    static let handHeightSearchFrames = 5
    static let maxHandHeightOffset = 6
    static let topSearchStartFraction = 0.05
    static let finishStartFraction = 0.8
    static let addressVelocityMultiplier = 2.0
    static let addressPeakVelocityFraction = 0.05
    static let addressHandMovementThreshold: CGFloat = 0.03

    // Slow motion adjustments
    static let slowMotionFrameThreshold = 150
    static let slowMotionSmoothingScale = 2.0
    static let slowMotionSearchScale = 3.0
}

// MARK: - Phase Detection Result

struct SwingPhaseResult {
    let phaseFrames: [PhaseFrame]
    let keyFrames: KeyFrames
    let isRightHanded: Bool

    struct KeyFrames {
        let address: PhaseFrame?
        let topOfBackswing: PhaseFrame?
        let impact: PhaseFrame?
        let finish: PhaseFrame?
    }
}

struct PhaseFrame {
    let frameIndex: Int
    let timestamp: TimeInterval
    var phase: SwingPhase
    let metrics: FrameMetrics
    var confidence: Double
}

// MARK: - Main Detection Function

/// Detect swing phases for all frames using velocity and hand position analysis
func detectSwingPhases(frames: [PoseFrame]) -> SwingPhaseResult {
    guard !frames.isEmpty else {
        return SwingPhaseResult(
            phaseFrames: [],
            keyFrames: .init(address: nil, topOfBackswing: nil, impact: nil, finish: nil),
            isRightHanded: true
        )
    }

    let isRightHanded = detectHandedness(frames: frames)
    let leadSide: Side = isRightHanded ? .left : .right
    let isSlowMotion = frames.count > PhaseDetectionConstants.slowMotionFrameThreshold

    var phaseFrames: [PhaseFrame] = []
    var handHeights: [CGFloat] = []
    var velocities: [Double] = []
    var handXPositions: [CGFloat] = []

    // First pass: collect metrics
    for i in 0..<frames.count {
        let frame = frames[i]
        let metrics = calculateFrameMetrics(frame: frame)

        let handPos = getHandPosition(frame: frame, side: leadSide)
        handHeights.append(handPos.y)
        handXPositions.append(handPos.x)

        // Calculate velocity
        if i > 0 {
            let deltaTime = frame.timestamp - frames[i - 1].timestamp
            let velocity = calculateHandVelocity(
                prevFrame: frames[i - 1],
                currFrame: frame,
                deltaTime: deltaTime,
                side: leadSide
            )
            velocities.append(velocity)
        } else {
            velocities.append(0)
        }

        phaseFrames.append(PhaseFrame(
            frameIndex: frame.frameIndex,
            timestamp: frame.timestamp,
            phase: .address,  // Will be updated
            metrics: metrics,
            confidence: 0.5
        ))
    }

    // Apply smoothing
    let smoothingWindow = isSlowMotion
        ? Int(Double(PhaseDetectionConstants.smoothingWindow) * PhaseDetectionConstants.slowMotionSmoothingScale)
        : PhaseDetectionConstants.smoothingWindow
    let smoothedVelocities = smoothArray(velocities, windowSize: smoothingWindow)
    let smoothedHandHeights = smoothArray(handHeights.map { Double($0) }, windowSize: smoothingWindow)

    // Step 1: Find impact frame using velocity peak
    let impactSearchStart = Int(Double(frames.count) * PhaseDetectionConstants.impactSearchStartFraction)
    let impactSearchEnd = Int(Double(frames.count) * PhaseDetectionConstants.impactSearchEndFraction)

    var impactIdx = findRobustPeakIndex(
        values: smoothedVelocities,
        startIdx: impactSearchStart,
        endIdx: impactSearchEnd,
        minPeakWidth: PhaseDetectionConstants.minPeakWidth
    )

    // Fallback: simple max if no robust peak found
    if impactIdx == impactSearchStart {
        var maxVelocity = 0.0
        for i in impactSearchStart..<impactSearchEnd {
            if smoothedVelocities[i] > maxVelocity {
                maxVelocity = smoothedVelocities[i]
                impactIdx = i
            }
        }
    }

    // Refine impact using hand height (lowest hand = impact)
    let handHeightCheckStart = max(0, impactIdx - 8)
    let handHeightCheckEnd = min(frames.count, impactIdx + PhaseDetectionConstants.handHeightSearchFrames)
    var maxHandY = -Double.infinity
    var maxHandYIdx = impactIdx

    for i in handHeightCheckStart..<handHeightCheckEnd {
        if smoothedHandHeights[i] > maxHandY {
            maxHandY = smoothedHandHeights[i]
            maxHandYIdx = i
        }
    }

    // Prefer hand height when close to velocity peak
    let distanceFromPeak = maxHandYIdx - impactIdx
    if abs(distanceFromPeak) <= PhaseDetectionConstants.maxHandHeightOffset {
        impactIdx = (impactIdx + maxHandYIdx) / 2
    }

    // Step 2: Find top of backswing (highest hand position before impact)
    let searchStartIdx = Int(Double(frames.count) * PhaseDetectionConstants.topSearchStartFraction)
    let searchEndIdx = max(searchStartIdx + 3, impactIdx - 3)

    var topOfBackswingIdx = findMinIndex(values: smoothedHandHeights, startIdx: searchStartIdx, endIdx: searchEndIdx)

    // Also check velocity dip
    let velocityDipIdx = findMinIndex(values: smoothedVelocities, startIdx: searchStartIdx, endIdx: searchEndIdx)
    if abs(velocityDipIdx - topOfBackswingIdx) <= 3 {
        topOfBackswingIdx = (velocityDipIdx + topOfBackswingIdx) / 2
    }

    // Ensure top is before impact
    if topOfBackswingIdx >= impactIdx - 2 {
        topOfBackswingIdx = max(searchStartIdx, impactIdx - 4)
    }

    // Step 3: Find address end (when velocity starts increasing)
    let addressSearchEnd = min(topOfBackswingIdx, frames.count / 2)
    var addressEndIdx = 0

    let baselineFrameCount = min(5, searchStartIdx)
    var baselineVelocity = 0.0
    for i in 0..<baselineFrameCount {
        baselineVelocity += smoothedVelocities[i]
    }
    baselineVelocity = baselineFrameCount > 0 ? baselineVelocity / Double(baselineFrameCount) : 0

    let velocityThreshold = max(
        baselineVelocity * PhaseDetectionConstants.addressVelocityMultiplier,
        smoothedVelocities[impactIdx] * PhaseDetectionConstants.addressPeakVelocityFraction
    )

    for i in 2..<addressSearchEnd {
        if smoothedVelocities[i] > velocityThreshold &&
           i + 1 < smoothedVelocities.count &&
           smoothedVelocities[i + 1] > velocityThreshold {
            addressEndIdx = max(0, i - 1)
            break
        }
    }

    // Fallback: use hand movement
    if addressEndIdx < 3 {
        let initialHandX = handXPositions[0]
        let initialHandY = handHeights[0]

        for i in 3..<addressSearchEnd {
            let handDelta = abs(CGFloat(smoothedHandHeights[i]) - initialHandY) +
                           abs(handXPositions[i] - initialHandX)
            if handDelta > PhaseDetectionConstants.addressHandMovementThreshold {
                addressEndIdx = max(0, i - 2)
                break
            }
        }
    }

    if addressEndIdx < 2 {
        addressEndIdx = min(5, topOfBackswingIdx / 5)
    }

    // Step 4: Assign phases to all frames
    let followThroughStartIdx = impactIdx + 2
    let finishStartIdx = Int(Double(frames.count) * PhaseDetectionConstants.finishStartFraction)

    for i in 0..<phaseFrames.count {
        var phase: SwingPhase
        var confidence = 0.7

        if i <= addressEndIdx {
            phase = .address
            confidence = i == 0 ? 0.9 : 0.7
        } else if i < topOfBackswingIdx {
            phase = .backswing
            confidence = 0.8
        } else if i >= topOfBackswingIdx && i <= topOfBackswingIdx + 1 {
            phase = .top
            confidence = 0.9
        } else if i < impactIdx {
            phase = .downswing
            confidence = 0.8
        } else if i >= impactIdx && i < followThroughStartIdx {
            phase = .impact
            confidence = i == impactIdx ? 0.9 : 0.7
        } else if i < finishStartIdx {
            phase = .followThrough
            confidence = 0.75
        } else {
            phase = .finish
            confidence = i == frames.count - 1 ? 0.9 : 0.7
        }

        phaseFrames[i].phase = phase
        phaseFrames[i].confidence = confidence
    }

    // Extract key frames
    let addressFrame = phaseFrames.first { $0.phase == .address }
    let topFrame = topOfBackswingIdx < phaseFrames.count ? phaseFrames[topOfBackswingIdx] : nil
    let impactFrame = impactIdx < phaseFrames.count ? phaseFrames[impactIdx] : nil
    let finishFrame = phaseFrames.last

    log.info("Key Frames | {\"addressEndIdx\": \(addressEndIdx), \"topOfBackswingIdx\": \(topOfBackswingIdx), \"impactIdx\": \(impactIdx), \"finishStartIdx\": \(finishStartIdx), \"isSlowMotion\": \(isSlowMotion)}")

    return SwingPhaseResult(
        phaseFrames: phaseFrames,
        keyFrames: .init(
            address: addressFrame,
            topOfBackswing: topFrame,
            impact: impactFrame,
            finish: finishFrame
        ),
        isRightHanded: isRightHanded
    )
}

// MARK: - Helper Functions

/// Detect if the golfer is right-handed or left-handed
private func detectHandedness(frames: [PoseFrame]) -> Bool {
    guard !frames.isEmpty else { return true }

    let sampleFrames = Array(frames.prefix(min(5, frames.count)))
    var leftHandHigherCount = 0

    for frame in sampleFrames {
        let leftHand = getHandPosition(frame: frame, side: .left)
        let rightHand = getHandPosition(frame: frame, side: .right)

        if leftHand.y < rightHand.y {
            leftHandHigherCount += 1
        }
    }

    return leftHandHigherCount > sampleFrames.count / 2
}

/// Calculate velocity of hand movement between frames
private func calculateHandVelocity(
    prevFrame: PoseFrame,
    currFrame: PoseFrame,
    deltaTime: TimeInterval,
    side: Side
) -> Double {
    let prevPos = getHandPosition(frame: prevFrame, side: side)
    let currPos = getHandPosition(frame: currFrame, side: side)

    let dx = currPos.x - prevPos.x
    let dy = currPos.y - prevPos.y
    let dz = currPos.z - prevPos.z

    let distance = sqrt(Double(dx * dx + dy * dy + dz * dz))
    return deltaTime > 0 ? distance / deltaTime : 0
}

/// Apply moving average smoothing to an array of values
private func smoothArray(_ values: [Double], windowSize: Int) -> [Double] {
    guard !values.isEmpty else { return [] }

    let halfWindow = windowSize / 2
    var smoothed: [Double] = []

    for i in 0..<values.count {
        let start = max(0, i - halfWindow)
        let end = min(values.count - 1, i + halfWindow)
        var sum = 0.0
        var count = 0

        for j in start...end {
            sum += values[j]
            count += 1
        }

        smoothed.append(sum / Double(count))
    }

    return smoothed
}

/// Find a robust peak by requiring the peak to be higher than surrounding frames
private func findRobustPeakIndex(
    values: [Double],
    startIdx: Int,
    endIdx: Int,
    minPeakWidth: Int
) -> Int {
    guard !values.isEmpty else { return 0 }

    var bestPeakIdx = startIdx
    var bestPeakScore = -Double.infinity

    for i in startIdx..<endIdx {
        var isLocalMax = true
        let peakScore = values[i]

        for offset in 1...minPeakWidth where isLocalMax {
            let leftIdx = i - offset
            let rightIdx = i + offset

            if leftIdx >= 0 && values[leftIdx] > values[i] {
                isLocalMax = false
            }
            if rightIdx < values.count && values[rightIdx] > values[i] {
                isLocalMax = false
            }
        }

        if isLocalMax && peakScore > bestPeakScore {
            bestPeakScore = peakScore
            bestPeakIdx = i
        }
    }

    return bestPeakIdx
}

/// Find the minimum value index in a range
private func findMinIndex(values: [Double], startIdx: Int, endIdx: Int) -> Int {
    var minIdx = startIdx
    var minVal = Double.infinity

    for i in startIdx..<endIdx where i < values.count {
        if values[i] < minVal {
            minVal = values[i]
            minIdx = i
        }
    }

    return minIdx
}

// MARK: - Phase Segment Conversion

/// Convert phase frames to phase segments for detector input
func createPhaseSegments(from phaseFrames: [PhaseFrame]) -> [PhaseSegment] {
    guard !phaseFrames.isEmpty else { return [] }

    var segments: [PhaseSegment] = []
    var currentPhase = phaseFrames[0].phase
    var startFrame = 0
    var startTime = phaseFrames[0].timestamp

    for i in 1..<phaseFrames.count {
        if phaseFrames[i].phase != currentPhase {
            // End current segment
            segments.append(PhaseSegment(
                phase: currentPhase,
                startFrame: startFrame,
                endFrame: i - 1,
                startTime: startTime,
                endTime: phaseFrames[i - 1].timestamp
            ))

            // Start new segment
            currentPhase = phaseFrames[i].phase
            startFrame = i
            startTime = phaseFrames[i].timestamp
        }
    }

    // Add final segment
    segments.append(PhaseSegment(
        phase: currentPhase,
        startFrame: startFrame,
        endFrame: phaseFrames.count - 1,
        startTime: startTime,
        endTime: phaseFrames.last?.timestamp ?? 0
    ))

    return segments
}
