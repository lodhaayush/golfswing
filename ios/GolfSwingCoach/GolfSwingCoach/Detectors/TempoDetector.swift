import Foundation

// MARK: - Poor Tempo Ratio Detector

/// Detects poor tempo ratio (backswing to downswing timing)
struct PoorTempoRatioDetector: SwingDetector {
    let mistakeId: SwingMistakeId = .poorTempoRatio
    let name = "Poor Tempo"
    let applicablePhases: [SwingPhase] = [.backswing, .downswing]
    let supportedCameraAngles: [CameraAngle] = []  // Works with all angles

    func detect(input: SwingDetectorInput) -> DetectorResult {
        let tempo = input.tempo

        // Ideal tempo ratio is around 3:1 (backswing 3x longer than downswing)
        // Acceptable range: 2:1 to 4:1
        let idealRatio: Double = 3.0
        let minRatio: Double = 2.0
        let maxRatio: Double = 4.0

        let ratio = tempo.tempoRatio

        // Check if ratio is in acceptable range
        if ratio >= minRatio && ratio <= maxRatio {
            return DetectorResult(
                mistakeId: mistakeId,
                detected: false,
                confidence: 0.8,
                severity: 0,
                message: ""
            )
        }

        let isTooFast = ratio < minRatio
        let deviation = isTooFast ? (minRatio - ratio) : (ratio - maxRatio)
        let severity = min(100, deviation * 30)

        var message: String
        if isTooFast {
            message = "Tempo is too quick - backswing too short relative to downswing. Slow down your takeaway."
        } else {
            message = "Tempo is too slow - downswing is rushed or backswing too long. Maintain a smooth transition."
        }

        return createDetectedResult(
            mistakeId: mistakeId,
            confidence: 0.75,
            severity: severity,
            message: message,
            details: String(format: "Tempo ratio: %.1f:1 (ideal: 3:1, backswing: %.2fs, downswing: %.2fs)",
                          ratio, tempo.backswingDuration, tempo.downswingDuration)
        )
    }
}
