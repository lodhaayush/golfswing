import Foundation
import CoreGraphics

// MARK: - Incomplete Follow Through Detector

/// Detects incomplete follow-through after impact
struct IncompleteFollowThroughDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .incompleteFollowThrough
    let name = "Incomplete Follow Through"
    let applicablePhases: [SwingPhase] = [.followThrough, .finish]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let finishIndices = input.getPhaseFrameIndices(for: .finish) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Finish phase not found")
        }

        guard let finishFrame = input.getFrame(at: finishIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing finish frame")
        }

        // At finish, hands should be high (near shoulder level or above)
        // Lead hand should be above shoulders
        let leadSide: Side = input.isRightHanded ? .left : .right
        let handPos = getHandPosition(frame: finishFrame, side: leadSide)

        guard let leftShoulder = finishFrame.landmark(for: .leftShoulder),
              let rightShoulder = finishFrame.landmark(for: .rightShoulder) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing shoulder landmarks")
        }

        let shoulderY = (leftShoulder.y + rightShoulder.y) / 2
        let hipY = finishFrame.landmark(for: .leftHip)?.y ?? 0.6

        // Hand position is relative to hip center, so convert to absolute
        let absoluteHandY = hipY + handPos.y

        // At finish, hands should be at or above shoulder level
        // (In normalized coords, lower Y = higher position)
        let isHighFinish = absoluteHandY < shoulderY + 0.05

        if isHighFinish {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        // Calculate how much below ideal the hands are
        let shortfall = absoluteHandY - shoulderY
        let severity = min(100, Double(shortfall) * 300)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: "Incomplete follow-through. Finish with your hands high for a full release.",
            details: String(format: "Hands finished %.0f%% below shoulder level", shortfall * 100)
        )
    }
}

// MARK: - Unbalanced Finish Detector

/// Detects poor balance at finish position
struct UnbalancedFinishDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .unbalancedFinish
    let name = "Unbalanced Finish"
    let applicablePhases: [SwingPhase] = [.finish]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let finishIndices = input.getPhaseFrameIndices(for: .finish) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Finish phase not found")
        }

        // Sample the last few frames for stability analysis
        let finishFrameCount = min(5, finishIndices.endFrame - finishIndices.startFrame + 1)
        let startIdx = finishIndices.endFrame - finishFrameCount + 1

        var hipCenterPositions: [CGFloat] = []
        var shoulderCenterPositions: [CGFloat] = []

        for i in startIdx...finishIndices.endFrame {
            guard let frame = input.getFrame(at: i),
                  let leftHip = frame.landmark(for: .leftHip),
                  let rightHip = frame.landmark(for: .rightHip),
                  let leftShoulder = frame.landmark(for: .leftShoulder),
                  let rightShoulder = frame.landmark(for: .rightShoulder) else {
                continue
            }

            hipCenterPositions.append((leftHip.x + rightHip.x) / 2)
            shoulderCenterPositions.append((leftShoulder.x + rightShoulder.x) / 2)
        }

        guard hipCenterPositions.count >= 2 else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Not enough finish frames")
        }

        // Calculate wobble (variance in position)
        let hipVariance = calculateVariance(hipCenterPositions)
        let shoulderVariance = calculateVariance(shoulderCenterPositions)
        let totalWobble = hipVariance + shoulderVariance

        // Also check if weight ended on lead foot
        guard let finishFrame = input.getFrame(at: finishIndices.endFrame),
              let leftAnkle = finishFrame.landmark(for: .leftAnkle),
              let rightAnkle = finishFrame.landmark(for: .rightAnkle),
              let leftHip = finishFrame.landmark(for: .leftHip),
              let rightHip = finishFrame.landmark(for: .rightHip) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing landmarks")
        }

        let hipCenterX = (leftHip.x + rightHip.x) / 2
        let leadAnkleX = input.isRightHanded ? leftAnkle.x : rightAnkle.x
        let trailAnkleX = input.isRightHanded ? rightAnkle.x : leftAnkle.x

        // Weight should be over lead foot at finish
        let weightOnLead = input.isRightHanded
            ? hipCenterX < (leadAnkleX + trailAnkleX) / 2
            : hipCenterX > (leadAnkleX + trailAnkleX) / 2

        let wobbleThreshold: Double = 0.002
        let isBalanced = totalWobble < wobbleThreshold && weightOnLead

        if isBalanced {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        var message = ""
        var severity = 0.0

        if totalWobble >= wobbleThreshold {
            severity += totalWobble * 10000
            message += "Wobbling at finish indicates loss of balance. "
        }

        if !weightOnLead {
            severity += 30
            message += "Weight not fully transferred to lead foot. "
        }

        severity = min(100, severity)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: message.trimmingCharacters(in: .whitespaces) + " Hold your finish for better balance.",
            details: String(format: "Wobble: %.4f, Weight on lead: %@", totalWobble, weightOnLead ? "Yes" : "No")
        )
    }

    private func calculateVariance(_ values: [CGFloat]) -> Double {
        guard !values.isEmpty else { return 0 }
        let mean = values.reduce(0, +) / CGFloat(values.count)
        let squaredDiffs = values.map { ($0 - mean) * ($0 - mean) }
        return Double(squaredDiffs.reduce(0, +) / CGFloat(values.count))
    }
}

// MARK: - Reverse C Finish Detector

/// Detects reverse C finish (excessive spine bend away from target)
struct ReverseCFinishDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .reverseCFinish
    let name = "Reverse C Finish"
    let applicablePhases: [SwingPhase] = [.finish]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let finishIndices = input.getPhaseFrameIndices(for: .finish) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Finish phase not found")
        }

        guard let finishFrame = input.getFrame(at: finishIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing finish frame")
        }

        // Check spine lateral tilt at finish
        guard let leftShoulder = finishFrame.landmark(for: .leftShoulder),
              let rightShoulder = finishFrame.landmark(for: .rightShoulder),
              let leftHip = finishFrame.landmark(for: .leftHip),
              let rightHip = finishFrame.landmark(for: .rightHip) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing landmarks")
        }

        let shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2
        let shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
        let hipCenterX = (leftHip.x + rightHip.x) / 2
        let hipCenterY = (leftHip.y + rightHip.y) / 2

        // Calculate lateral spine tilt
        let dx = shoulderCenterX - hipCenterX
        let dy = shoulderCenterY - hipCenterY

        // Lateral tilt angle (positive = leaning toward target, negative = leaning away)
        let lateralTilt = atan2(Double(dx), Double(-dy)) * (180 / .pi)

        // For right-handers, reverse C = leaning right (positive tilt)
        // For left-handers, reverse C = leaning left (negative tilt)
        let reverseCTilt = input.isRightHanded ? lateralTilt : -lateralTilt
        let threshold: Double = 12  // degrees

        if reverseCTilt < threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (reverseCTilt - threshold) * 5)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: "Reverse C finish detected. This can stress your lower back. Finish more upright.",
            details: String(format: "Spine tilt: %.0f° away from target", reverseCTilt)
        )
    }
}
