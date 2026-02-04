import Foundation

// MARK: - Detector Protocol

/// Protocol for all swing mistake detectors
protocol SwingDetector {
    /// Unique identifier for this detector
    var mistakeId: SwingMistakeId { get }

    /// Human-readable name
    var name: String { get }

    /// Which phases this detector analyzes
    var applicablePhases: [SwingPhase] { get }

    /// Which camera angles this detector works with
    var supportedCameraAngles: [CameraAngle] { get }

    /// Run detection on the input
    func detect(input: SwingDetectorInput) -> DetectorResult
}

// MARK: - Detector Input

/// Input provided to every detector
struct SwingDetectorInput {
    let frames: [PoseFrame]
    let phaseSegments: [PhaseSegment]
    let metrics: SwingMetrics?
    let tempo: TempoMetrics
    let isRightHanded: Bool
    let cameraAngle: CameraAngle
    let clubType: ClubType

    /// Get frame indices for a specific phase
    func getPhaseFrameIndices(for phase: SwingPhase) -> (startFrame: Int, endFrame: Int)? {
        guard let segment = phaseSegments.first(where: { $0.phase == phase }) else {
            return nil
        }
        return (segment.startFrame, segment.endFrame)
    }

    /// Get all frames for a specific phase
    func getFrames(for phase: SwingPhase) -> [PoseFrame] {
        guard let indices = getPhaseFrameIndices(for: phase) else { return [] }
        return Array(frames[indices.startFrame...min(indices.endFrame, frames.count - 1)])
    }

    /// Get the frame at a specific index safely
    func getFrame(at index: Int) -> PoseFrame? {
        guard index >= 0 && index < frames.count else { return nil }
        return frames[index]
    }
}

// MARK: - Helper Functions

/// Create a "not detected" result
func createNotDetectedResult(
    mistakeId: SwingMistakeId,
    details: String? = nil
) -> DetectorResult {
    return DetectorResult(
        mistakeId: mistakeId,
        detected: false,
        confidence: 0,
        severity: 0,
        message: "",
        details: details
    )
}

/// Create a detected result with severity and message
func createDetectedResult(
    mistakeId: SwingMistakeId,
    confidence: Double,
    severity: Double,
    message: String,
    details: String? = nil,
    affectedFrames: [Int]? = nil
) -> DetectorResult {
    return DetectorResult(
        mistakeId: mistakeId,
        detected: true,
        confidence: confidence,
        severity: severity,
        message: message,
        details: details,
        affectedFrames: affectedFrames
    )
}

// MARK: - All Detectors Registry

/// All registered detectors
nonisolated(unsafe) let allDetectors: [SwingDetector] = [
    // Setup
    PoorPostureDetector(),
    StanceWidthIssueDetector(),
    // Backswing
    ReversePivotDetector(),
    InsufficientShoulderTurnDetector(),
    OverRotationDetector(),
    BentLeadArmDetector(),
    LiftingHeadDetector(),
    // Downswing
    EarlyExtensionDetector(),
    HangingBackDetector(),
    LossOfSpineAngleDetector(),
    SlidingHipsDetector(),
    // Impact
    ChickenWingDetector(),
    PoorArmExtensionDetector(),
    HeadMovementDetector(),
    // Follow-through
    IncompleteFollowThroughDetector(),
    UnbalancedFinishDetector(),
    ReverseCFinishDetector(),
    // Tempo
    PoorTempoRatioDetector(),
]

/// Run all detectors and return results
func runAllDetectors(input: SwingDetectorInput) -> [DetectorResult] {
    return allDetectors
        .filter { detector in
            // Only run detectors that support the current camera angle
            detector.supportedCameraAngles.contains(input.cameraAngle) ||
            detector.supportedCameraAngles.isEmpty  // Empty means all angles
        }
        .map { $0.detect(input: input) }
        .filter { $0.detected || $0.confidence > 0 }
}

/// Get only detected mistakes sorted by severity
func getDetectedMistakes(input: SwingDetectorInput) -> [DetectorResult] {
    return runAllDetectors(input: input)
        .filter { $0.detected }
        .sorted { $0.severity > $1.severity }
}
