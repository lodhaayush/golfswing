import Foundation
import CoreGraphics

// MARK: - Reverse Pivot Detector

/// Detects reverse pivot (weight moving toward target in backswing)
struct ReversePivotDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .reversePivot
    let name = "Reverse Pivot"
    let applicablePhases: [SwingPhase] = [.backswing, .top]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let topIndices = input.getPhaseFrameIndices(for: .top) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let topFrame = input.getFrame(at: topIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        // Get head position at address and top
        guard let headAddr = addressFrame.landmark(for: .nose),
              let headTop = topFrame.landmark(for: .nose) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing head landmarks")
        }

        // For right-handers, weight should shift right (higher X) in backswing
        // Reverse pivot = head moves toward target (lower X for right-handers)
        let headShift = headTop.x - headAddr.x
        let isRightHanded = input.isRightHanded

        // Normalize by shoulder width
        guard let leftShoulder = addressFrame.landmark(for: .leftShoulder),
              let rightShoulder = addressFrame.landmark(for: .rightShoulder) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing shoulder landmarks")
        }

        let shoulderWidth = abs(rightShoulder.x - leftShoulder.x)
        guard shoulderWidth > 0 else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Invalid shoulder width")
        }

        let normalizedShift = headShift / shoulderWidth

        // Reverse pivot detection:
        // Right-handers: negative shift (toward target/left) indicates reverse pivot
        // Left-handers: positive shift (toward target/right) indicates reverse pivot
        let isReversePivot = isRightHanded ? normalizedShift < -0.05 : normalizedShift > 0.05
        let shiftAmount = abs(normalizedShift)

        if !isReversePivot {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.75,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, shiftAmount * 200)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: "Reverse pivot detected - weight moving toward target in backswing. Load into your trail leg.",
            details: String(format: "Head shifted %.1f%% toward target", shiftAmount * 100)
        )
    }
}

// MARK: - Insufficient Shoulder Turn Detector

/// Detects insufficient shoulder rotation in backswing
struct InsufficientShoulderTurnDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .insufficientShoulderTurn
    let name = "Insufficient Shoulder Turn"
    let applicablePhases: [SwingPhase] = [.top]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let topIndices = input.getPhaseFrameIndices(for: .top) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let topFrame = input.getFrame(at: topIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        // For face-on, use width-based rotation calculation
        let shoulderRotation: Double
        if input.cameraAngle == .faceOn {
            shoulderRotation = calculateRotationFromWidth(
                currentFrame: topFrame,
                addressFrame: addressFrame,
                bodyPart: .shoulders
            )
        } else {
            shoulderRotation = abs(calculateShoulderRotation(frame: topFrame))
        }

        // Ideal shoulder turn: 80-100 degrees for most golfers
        let minimumTurn: Double = 70
        let idealTurn: Double = 90

        if shoulderRotation >= minimumTurn {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.8,
                severity: 0,
                message: ""
            )
        }

        let shortfall = minimumTurn - shoulderRotation
        let severity = min(100, shortfall * 3)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: "Insufficient shoulder turn limits power. Focus on rotating your shoulders more fully.",
            details: String(format: "Shoulder rotation: %.0f° (ideal: %.0f°+)", shoulderRotation, idealTurn)
        )
    }
}

// MARK: - Over Rotation Detector

/// Detects excessive rotation in backswing
struct OverRotationDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .overRotation
    let name = "Over Rotation"
    let applicablePhases: [SwingPhase] = [.top]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let topIndices = input.getPhaseFrameIndices(for: .top) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let topFrame = input.getFrame(at: topIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        let shoulderRotation: Double
        let hipRotation: Double

        if input.cameraAngle == .faceOn {
            shoulderRotation = calculateRotationFromWidth(currentFrame: topFrame, addressFrame: addressFrame, bodyPart: .shoulders)
            hipRotation = calculateRotationFromWidth(currentFrame: topFrame, addressFrame: addressFrame, bodyPart: .hips)
        } else {
            shoulderRotation = abs(calculateShoulderRotation(frame: topFrame))
            hipRotation = abs(calculateHipRotation(frame: topFrame))
        }

        // Over-rotation thresholds
        let maxShoulderTurn: Double = 110
        let maxHipTurn: Double = 55

        let shoulderOverRotation = max(0, shoulderRotation - maxShoulderTurn)
        let hipOverRotation = max(0, hipRotation - maxHipTurn)

        if shoulderOverRotation == 0 && hipOverRotation == 0 {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (shoulderOverRotation + hipOverRotation) * 3)

        var message = "Over-rotation in backswing. "
        if shoulderOverRotation > 0 {
            message += "Shoulders rotating too far. "
        }
        if hipOverRotation > 0 {
            message += "Hips rotating too much, losing coil. "
        }

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: message.trimmingCharacters(in: .whitespaces),
            details: String(format: "Shoulder: %.0f° Hip: %.0f°", shoulderRotation, hipRotation)
        )
    }
}

// MARK: - Bent Lead Arm Detector

/// Detects bent lead arm at top of backswing
struct BentLeadArmDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .bentLeadArm
    let name = "Bent Lead Arm"
    let applicablePhases: [SwingPhase] = [.top]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let topIndices = input.getPhaseFrameIndices(for: .top) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Top phase not found")
        }

        guard let topFrame = input.getFrame(at: topIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frame")
        }

        // Lead arm is left for right-handers, right for left-handers
        let leadSide: Side = input.isRightHanded ? .left : .right
        let armExtension = calculateArmExtension(frame: topFrame, side: leadSide)

        // Ideal: 170-180 degrees (nearly straight)
        let minimumExtension: Double = 155

        if armExtension >= minimumExtension {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.8,
                severity: 0,
                message: ""
            )
        }

        let bendAmount = 180 - armExtension
        let severity = min(100, (minimumExtension - armExtension) * 3)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: "Lead arm is bent at the top. Keep your lead arm straighter for more consistent contact.",
            details: String(format: "Arm angle: %.0f° (%.0f° bend)", armExtension, bendAmount)
        )
    }
}

// MARK: - Lifting Head Detector

/// Detects head lifting during backswing
struct LiftingHeadDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .liftingHead
    let name = "Lifting Head"
    let applicablePhases: [SwingPhase] = [.backswing, .top]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let backswingIndices = input.getPhaseFrameIndices(for: .backswing) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing address frame")
        }

        guard let headAddr = addressFrame.landmark(for: .nose) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing head landmark")
        }

        // Get body height for normalization
        guard let shoulderAddr = addressFrame.landmark(for: .leftShoulder),
              let ankleAddr = addressFrame.landmark(for: .leftAnkle) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing body landmarks")
        }

        let bodyHeight = abs(ankleAddr.y - shoulderAddr.y)
        guard bodyHeight > 0 else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Invalid body height")
        }

        // Track head position through backswing
        var maxHeadLift: CGFloat = 0

        for i in backswingIndices.startFrame...min(backswingIndices.endFrame, input.frames.count - 1) {
            guard let frame = input.getFrame(at: i),
                  let head = frame.landmark(for: .nose) else {
                continue
            }

            // In normalized coordinates, Y increases downward
            // Head lift = address Y - current Y (positive means lifted)
            let headLift = headAddr.y - head.y
            maxHeadLift = max(maxHeadLift, headLift)
        }

        let normalizedLift = maxHeadLift / bodyHeight
        let threshold: CGFloat = 0.03  // 3% of body height

        if normalizedLift < threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, Double(normalizedLift) * 1000)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: "Head lifting during backswing. Keep your head level to maintain eye contact with the ball.",
            details: String(format: "Head rose %.1f%% of body height", normalizedLift * 100)
        )
    }
}
