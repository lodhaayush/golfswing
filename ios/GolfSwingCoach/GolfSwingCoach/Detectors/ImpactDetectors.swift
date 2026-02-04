import Foundation
import CoreGraphics

// MARK: - Chicken Wing Detector

/// Detects chicken wing (lead elbow bending through impact)
struct ChickenWingDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .chickenWing
    let name = "Chicken Wing"
    let applicablePhases: [SwingPhase] = [.impact, .followThrough]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let impactIndices = input.getPhaseFrameIndices(for: .impact) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Impact phase not found")
        }

        // Get follow-through frames too
        let followThroughIndices = input.getPhaseFrameIndices(for: .followThrough)
        let endIdx = followThroughIndices?.startFrame ?? impactIndices.endFrame

        // Lead arm is left for right-handers
        let leadSide: Side = input.isRightHanded ? .left : .right

        var minArmExtension: Double = 180
        var chickenWingFrame: Int = 0

        // Check arm extension from impact through early follow-through
        for i in impactIndices.startFrame...min(endIdx + 3, input.frames.count - 1) {
            guard let frame = input.getFrame(at: i) else { continue }
            let armExtension = calculateArmExtension(frame: frame, side: leadSide)

            if armExtension < minArmExtension {
                minArmExtension = armExtension
                chickenWingFrame = i
            }
        }

        // Threshold: arm should be at least 150 degrees through impact
        let threshold: Double = 150

        if minArmExtension >= threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.8,
                severity: 0,
                message: ""
            )
        }

        let bendAmount = 180 - minArmExtension
        let severity = min(100, (threshold - minArmExtension) * 3)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.8,
            severity: severity,
            message: "Chicken wing detected - lead elbow bending through impact. Extend your arms through the ball.",
            details: String(format: "Lead arm bent to %.0f° (%.0f° bend)", minArmExtension, bendAmount),
            affectedFrames: [chickenWingFrame]
        )
    }
}

// MARK: - Poor Arm Extension Detector

/// Detects poor arm extension through impact
struct PoorArmExtensionDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .poorArmExtension
    let name = "Poor Arm Extension"
    let applicablePhases: [SwingPhase] = [.impact, .followThrough]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on view")
        }

        guard let impactIndices = input.getPhaseFrameIndices(for: .impact) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Impact phase not found")
        }

        guard let impactFrame = input.getFrame(at: impactIndices.startFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing impact frame")
        }

        // Check both arms
        let leftExtension = calculateArmExtension(frame: impactFrame, side: .left)
        let rightExtension = calculateArmExtension(frame: impactFrame, side: .right)
        let avgExtension = (leftExtension + rightExtension) / 2

        // Good extension: both arms near straight (170+)
        let threshold: Double = 165

        if avgExtension >= threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.75,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (threshold - avgExtension) * 3)

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: "Arms not fully extended through impact. Extend your arms to create width and power.",
            details: String(format: "Average arm extension: %.0f° (ideal: 170°+)", avgExtension)
        )
    }
}

// MARK: - Head Movement Detector

/// Detects excessive head movement during the swing
struct HeadMovementDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .headMovement
    let name = "Head Movement"
    let applicablePhases: [SwingPhase] = [.backswing, .downswing, .impact]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard let addressIndices = input.getPhaseFrameIndices(for: .address) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Address phase not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Missing address frame")
        }

        // Get all swing frames (backswing through impact)
        let addressFrames = input.getFrames(for: .address)
        var swingFrames: [PoseFrame] = []
        swingFrames.append(contentsOf: input.getFrames(for: .backswing))
        swingFrames.append(contentsOf: input.getFrames(for: .top))
        swingFrames.append(contentsOf: input.getFrames(for: .downswing))
        swingFrames.append(contentsOf: input.getFrames(for: .impact))

        let headStability = calculateHeadStability(
            swingFrames: swingFrames,
            addressFrames: addressFrames,
            addressFrame: addressFrame
        )

        // Threshold: head movement should be less than 8% of body height
        let threshold: Double = 0.08
        let severeThreshold: Double = 0.15

        if headStability < threshold {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.75,
                severity: 0,
                message: ""
            )
        }

        let severity = min(100, (headStability / severeThreshold) * 100)

        let message = headStability > severeThreshold
            ? "Significant head movement during swing. Keep your head still to maintain consistency."
            : "Some head movement detected. Try to keep your head more stable."

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: message,
            details: String(format: "Head moved %.1f%% of body height", headStability * 100)
        )
    }
}
