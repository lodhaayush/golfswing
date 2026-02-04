import Foundation

/// Complete analysis result for a swing
struct AnalysisResult: Codable, Equatable {
    static func == (lhs: AnalysisResult, rhs: AnalysisResult) -> Bool {
        lhs.overallScore == rhs.overallScore &&
        lhs.cameraAngle == rhs.cameraAngle &&
        lhs.clubType == rhs.clubType &&
        lhs.isRightHanded == rhs.isRightHanded
    }

    let overallScore: Double
    let cameraAngle: CameraAngle
    let clubType: ClubType
    let isRightHanded: Bool
    let phases: [PhaseSegment]
    let metrics: SwingMetrics?
    let tempo: TempoMetrics
    let detectedMistakes: [DetectorResult]
    let frames: [PoseFrame]
}

/// Swing metrics calculated from pose data
struct SwingMetrics: Codable {
    // Rotation metrics
    let maxShoulderRotation: Double
    let maxHipRotation: Double
    let maxXFactor: Double  // Shoulder - hip rotation

    // Spine metrics
    let addressSpineAngle: Double
    let impactSpineAngle: Double

    // Arm metrics
    let topLeadArmExtension: Double
    let impactLeadArmExtension: Double

    // Face-on specific metrics
    let hipSway: Double?
    let headStability: Double?
    let impactExtension: Double?
}

/// Tempo metrics
struct TempoMetrics: Codable {
    let backswingDuration: TimeInterval
    let downswingDuration: TimeInterval
    let tempoRatio: Double  // backswing / downswing, ideal ~3:1
    let totalSwingDuration: TimeInterval
}

/// Result from a single detector
struct DetectorResult: Codable {
    let mistakeId: SwingMistakeId
    let detected: Bool
    let confidence: Double  // 0-1
    let severity: Double    // 0-100
    let message: String
    let details: String?
    let affectedFrames: [Int]?

    init(
        mistakeId: SwingMistakeId,
        detected: Bool,
        confidence: Double,
        severity: Double,
        message: String,
        details: String? = nil,
        affectedFrames: [Int]? = nil
    ) {
        self.mistakeId = mistakeId
        self.detected = detected
        self.confidence = confidence
        self.severity = severity
        self.message = message
        self.details = details
        self.affectedFrames = affectedFrames
    }

    /// Create a "not detected" result
    static func notDetected(mistakeId: SwingMistakeId, reason: String) -> DetectorResult {
        DetectorResult(
            mistakeId: mistakeId,
            detected: false,
            confidence: 0,
            severity: 0,
            message: reason
        )
    }
}

/// All possible swing mistake IDs
enum SwingMistakeId: String, Codable, CaseIterable {
    // Setup
    case poorPosture = "POOR_POSTURE"
    case stanceWidthIssue = "STANCE_WIDTH_ISSUE"

    // Backswing
    case reversePivot = "REVERSE_PIVOT"
    case insufficientShoulderTurn = "INSUFFICIENT_SHOULDER_TURN"
    case overRotation = "OVER_ROTATION"
    case bentLeadArm = "BENT_LEAD_ARM"
    case liftingHead = "LIFTING_HEAD"

    // Downswing
    case earlyExtension = "EARLY_EXTENSION"
    case hangingBack = "HANGING_BACK"
    case lossOfSpineAngle = "LOSS_OF_SPINE_ANGLE"
    case slidingHips = "SLIDING_HIPS"

    // Impact
    case chickenWing = "CHICKEN_WING"
    case poorArmExtension = "POOR_ARM_EXTENSION"
    case headMovement = "HEAD_MOVEMENT"

    // Follow-through
    case incompleteFollowThrough = "INCOMPLETE_FOLLOW_THROUGH"
    case unbalancedFinish = "UNBALANCED_FINISH"
    case reverseCFinish = "REVERSE_C_FINISH"

    // Tempo
    case poorTempoRatio = "POOR_TEMPO_RATIO"

    var displayName: String {
        switch self {
        case .poorPosture: return "Poor Posture"
        case .stanceWidthIssue: return "Stance Width Issue"
        case .reversePivot: return "Reverse Pivot"
        case .insufficientShoulderTurn: return "Insufficient Shoulder Turn"
        case .overRotation: return "Over Rotation"
        case .bentLeadArm: return "Bent Lead Arm"
        case .liftingHead: return "Lifting Head"
        case .earlyExtension: return "Early Extension"
        case .hangingBack: return "Hanging Back"
        case .lossOfSpineAngle: return "Loss of Spine Angle"
        case .slidingHips: return "Sliding Hips"
        case .chickenWing: return "Chicken Wing"
        case .poorArmExtension: return "Poor Arm Extension"
        case .headMovement: return "Head Movement"
        case .incompleteFollowThrough: return "Incomplete Follow Through"
        case .unbalancedFinish: return "Unbalanced Finish"
        case .reverseCFinish: return "Reverse C Finish"
        case .poorTempoRatio: return "Poor Tempo"
        }
    }

    var category: SwingPhase {
        switch self {
        case .poorPosture, .stanceWidthIssue:
            return .address
        case .reversePivot, .insufficientShoulderTurn, .overRotation, .bentLeadArm, .liftingHead:
            return .backswing
        case .earlyExtension, .hangingBack, .lossOfSpineAngle, .slidingHips:
            return .downswing
        case .chickenWing, .poorArmExtension, .headMovement:
            return .impact
        case .incompleteFollowThrough, .unbalancedFinish, .reverseCFinish:
            return .followThrough
        case .poorTempoRatio:
            return .backswing  // Tempo spans multiple phases but categorize under backswing
        }
    }
}
