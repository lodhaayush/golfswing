import Foundation
import CoreGraphics

// MARK: - Early Extension Detector

/// Detects when hips thrust toward the ball during downswing (losing the "tush line")
struct EarlyExtensionDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .earlyExtension
    let name = "Early Extension"
    let applicablePhases: [SwingPhase] = [.downswing, .impact]
    let supportedCameraAngles: [CameraAngle] = [.dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .faceOn else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires DTL camera angle")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let topIndices = input.getPhaseFrameIndices(for: .top),
              let downswingIndices = input.getPhaseFrameIndices(for: .downswing) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing address frame")
        }

        // Get reference positions at address
        guard let leftHipAddr = addressFrame.landmark(for: .leftHip),
              let rightHipAddr = addressFrame.landmark(for: .rightHip),
              let leftAnkleAddr = addressFrame.landmark(for: .leftAnkle),
              let rightAnkleAddr = addressFrame.landmark(for: .rightAnkle),
              let leftShoulderAddr = addressFrame.landmark(for: .leftShoulder) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing landmarks at address")
        }

        let addressHipCenterY = (leftHipAddr.y + rightHipAddr.y) / 2
        let addressAnkleCenterY = (leftAnkleAddr.y + rightAnkleAddr.y) / 2
        let addressHipAnkleOffset = addressHipCenterY - addressAnkleCenterY

        let torsoHeight = abs(leftShoulderAddr.y - leftHipAddr.y)
        guard torsoHeight > 0 else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Invalid torso height")
        }

        // Track forward hip thrust through downswing
        var maxForwardThrust: CGFloat = 0
        let impactIndices = input.getPhaseFrameIndices(for: .impact)
        let endIdx = impactIndices?.endFrame ?? downswingIndices.endFrame

        for i in topIndices.startFrame...min(endIdx, input.frames.count - 1) {
            guard let frame = input.getFrame(at: i),
                  let leftHip = frame.landmark(for: .leftHip),
                  let rightHip = frame.landmark(for: .rightHip),
                  let leftAnkle = frame.landmark(for: .leftAnkle),
                  let rightAnkle = frame.landmark(for: .rightAnkle) else {
                continue
            }

            let hipCenterY = (leftHip.y + rightHip.y) / 2
            let ankleCenterY = (leftAnkle.y + rightAnkle.y) / 2
            let currentHipAnkleOffset = hipCenterY - ankleCenterY

            let forwardThrust = addressHipAnkleOffset - currentHipAnkleOffset
            maxForwardThrust = max(maxForwardThrust, forwardThrust)
        }

        let normalizedThrust = maxForwardThrust / torsoHeight
        let threshold: CGFloat = 0.12
        let severeThreshold: CGFloat = 0.20

        if normalizedThrust < threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.75,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, Double(normalizedThrust / (severeThreshold + 0.08)) * 100)

        let message = normalizedThrust > severeThreshold
            ? "Significant early extension - hips thrusting toward the ball. Focus on maintaining your tush line."
            : "Slight early extension detected. Keep your hips back through the downswing."

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: message,
            details: String(format: "Hips moved forward %.1f%% of torso height", normalizedThrust * 100)
        )
    }
}

// MARK: - Hanging Back Detector

/// Detects weight staying on trail side through impact
struct HangingBackDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .hangingBack
    let name = "Hanging Back"
    let applicablePhases: [SwingPhase] = [.downswing, .impact]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let impactIndices = input.getPhaseFrameIndices(for: .impact) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let impactFrame = input.getFrame(at: impactIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        // Get hip center at address and impact
        guard let leftHipAddr = addressFrame.landmark(for: .leftHip),
              let rightHipAddr = addressFrame.landmark(for: .rightHip),
              let leftHipImpact = impactFrame.landmark(for: .leftHip),
              let rightHipImpact = impactFrame.landmark(for: .rightHip) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing hip landmarks")
        }

        let hipCenterAddrX = (leftHipAddr.x + rightHipAddr.x) / 2
        let hipCenterImpactX = (leftHipImpact.x + rightHipImpact.x) / 2

        // Calculate expected weight shift direction
        // Right-handers: should shift left (lower X) toward target
        // Left-handers: should shift right (higher X) toward target
        let hipShift = hipCenterImpactX - hipCenterAddrX
        let expectedShift: CGFloat = input.isRightHanded ? -0.02 : 0.02

        // Normalize by stance width
        guard let leftAnkle = addressFrame.landmark(for: .leftAnkle),
              let rightAnkle = addressFrame.landmark(for: .rightAnkle) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing ankle landmarks")
        }

        let stanceWidth = abs(rightAnkle.x - leftAnkle.x)
        guard stanceWidth > 0 else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Invalid stance width")
        }

        let normalizedShift = hipShift / stanceWidth

        // Hanging back = hips still on trail side at impact
        let isHangingBack = input.isRightHanded
            ? normalizedShift > -0.05  // Should have shifted left, didn't
            : normalizedShift < 0.05   // Should have shifted right, didn't

        if !isHangingBack {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let shiftDeficit = abs(normalizedShift - expectedShift)
        let severity = min(100, Double(shiftDeficit) * 300)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: "Hanging back through impact. Transfer your weight to your lead foot.",
            details: String(format: "Hip shift: %.1f%% (expected: toward target)", normalizedShift * 100)
        )
    }
}

// MARK: - Loss of Spine Angle Detector

/// Detects loss of spine angle during downswing
struct LossOfSpineAngleDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .lossOfSpineAngle
    let name = "Loss of Spine Angle"
    let applicablePhases: [SwingPhase] = [.downswing, .impact]
    let supportedCameraAngles: [CameraAngle] = [.dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .faceOn else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires DTL view")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let impactIndices = input.getPhaseFrameIndices(for: .impact) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let impactFrame = input.getFrame(at: impactIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        let addressSpineAngle = abs(calculateSpineAngle(frame: addressFrame))
        let impactSpineAngle = abs(calculateSpineAngle(frame: impactFrame))

        // Loss of spine angle = standing up through impact (spine becoming more vertical)
        let angleLoss = addressSpineAngle - impactSpineAngle
        let threshold: Double = 8  // degrees

        if angleLoss < threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.75,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (angleLoss - threshold) * 5)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: "Loss of spine angle through impact. Maintain your forward tilt through the ball.",
            details: String(format: "Spine angle changed from %.0f° to %.0f° (%.0f° loss)", addressSpineAngle, impactSpineAngle, angleLoss)
        )
    }
}

// MARK: - Sliding Hips Detector

/// Detects excessive lateral hip slide instead of rotation
struct SlidingHipsDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .slidingHips
    let name = "Sliding Hips"
    let applicablePhases: [SwingPhase] = [.downswing]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address),
              let impactIndices = input.getPhaseFrameIndices(for: .impact) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Required phases not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame),
              let impactFrame = input.getFrame(at: impactIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing frames")
        }

        // Calculate hip sway
        let addressFrames = input.getFrames(for: .address)
        let downswingFrames = input.getFrames(for: .downswing)
        let allSwingFrames = downswingFrames + input.getFrames(for: .impact)

        let hipSway = calculateHipSway(frames: allSwingFrames, addressFrame: addressFrame)

        // Ideal: some hip slide is normal (0.1-0.2), excessive is 0.3+
        let excessiveThreshold: Double = 0.25

        if hipSway < excessiveThreshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (hipSway - excessiveThreshold) * 200)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: "Excessive hip slide instead of rotation. Focus on rotating your hips, not sliding them.",
            details: String(format: "Hip sway: %.0f%% of stance width", hipSway * 100)
        )
    }
}
