import Foundation

// MARK: - Poor Posture Detector

/// Detects poor posture at address (spine angle issues)
struct PoorPostureDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .poorPosture
    let name = "Poor Posture"
    let applicablePhases: [SwingPhase] = [.address]
    let supportedCameraAngles: [CameraAngle] = [.dtl, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .faceOn else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires DTL camera angle")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Address phase not found")
        }

        // Get address frame
        guard let addressFrame = input.getFrame(at: addressIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "No address frame")
        }

        let spineAngle = abs(calculateSpineAngle(frame: addressFrame))

        // Ideal spine angle is 25-45 degrees for irons, 20-40 for driver
        let idealMin: Double = input.clubType == .driver ? 20 : 25
        let idealMax: Double = input.clubType == .driver ? 40 : 45

        let detected = spineAngle < idealMin || spineAngle > idealMax
        log.debug("Poor Posture Debug | {\"spineAngle\": \"\(String(format: "%.1f", spineAngle))°\", \"idealRange\": \"\(String(format: "%.0f", idealMin))-\(String(format: "%.0f", idealMax))°\", \"clubType\": \"\(input.clubType.rawValue)\", \"detected\": \(detected)}")

        if spineAngle >= idealMin && spineAngle <= idealMax {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.8,
                severity: 0,
                message: ""
            )
        }

        let isTooUpright = spineAngle < idealMin
        let deviation = isTooUpright ? (idealMin - spineAngle) : (spineAngle - idealMax)
        let severity = min(100, deviation * 5)

        let message = isTooUpright
            ? "Standing too upright at address. Bend more from the hips."
            : "Too much forward bend at address. Stand a bit taller."

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: message,
            details: String(format: "Spine angle: %.1f° (ideal: %.0f-%.0f°)", spineAngle, idealMin, idealMax)
        )
    }
}

// MARK: - Stance Width Issue Detector

/// Detects incorrect stance width for the club type
struct StanceWidthIssueDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .stanceWidthIssue
    let name = "Stance Width Issue"
    let applicablePhases: [SwingPhase] = [.address]
    let supportedCameraAngles: [CameraAngle] = [.faceOn, .oblique]

    func detect(input: SwingDetectorInput) -> DetectorResult {
        guard input.cameraAngle != .dtl else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Requires face-on camera angle")
        }

        guard let addressIndices = input.getPhaseFrameIndices(for: .address) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "Address phase not found")
        }

        guard let addressFrame = input.getFrame(at: addressIndices.endFrame) else {
            return createNotDetectedResult(mistakeId: mistakeId, details: "No address frame")
        }

        let stanceRatio = calculateStanceRatio(frame: addressFrame)

        // Ideal stance ratio: Driver ~2.5-3.0, Iron ~2.0-2.5
        let idealMin: Double = input.clubType == .driver ? 2.3 : 1.8
        let idealMax: Double = input.clubType == .driver ? 3.2 : 2.6

        let detected = stanceRatio < idealMin || stanceRatio > idealMax
        log.debug("Stance Width Debug | {\"stanceRatio\": \(String(format: "%.2f", stanceRatio)), \"idealRange\": \"\(String(format: "%.1f", idealMin))-\(String(format: "%.1f", idealMax))\", \"clubType\": \"\(input.clubType.rawValue)\", \"detected\": \(detected)}")

        if stanceRatio >= idealMin && stanceRatio <= idealMax {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.7,
                severity: 0,
                message: ""
            )
        }

        let isTooNarrow = stanceRatio < idealMin
        let severity = min(100, abs(stanceRatio - (isTooNarrow ? idealMin : idealMax)) * 30)

        let message = isTooNarrow
            ? "Stance is too narrow for \(input.clubType.displayName.lowercased()). Widen your stance for better stability."
            : "Stance is too wide. A narrower stance improves mobility."

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.7,
            severity: severity,
            message: message,
            details: String(format: "Stance ratio: %.2f (ideal: %.1f-%.1f)", stanceRatio, idealMin, idealMax)
        )
    }
}
