import Foundation
import CoreGraphics

/// A single pose landmark with position and visibility
struct Landmark: Codable, Equatable {
    let x: CGFloat
    let y: CGFloat
    let z: CGFloat
    let visibility: Float

    init(x: CGFloat, y: CGFloat, z: CGFloat = 0, visibility: Float = 1.0) {
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility
    }
}

/// A frame of pose data with all detected landmarks
struct PoseFrame: Codable {
    let frameIndex: Int
    let timestamp: TimeInterval
    let landmarks: [Landmark]

    /// Get landmark by Vision joint name
    func landmark(for joint: VisionJoint) -> Landmark? {
        guard joint.rawValue < landmarks.count else { return nil }
        return landmarks[joint.rawValue]
    }
}

/// Vision framework joint names mapped to indices
/// Note: Vision has 19 body points vs MediaPipe's 33
enum VisionJoint: Int, CaseIterable {
    case nose = 0
    case leftEye = 1
    case rightEye = 2
    case leftEar = 3
    case rightEar = 4
    case leftShoulder = 5
    case rightShoulder = 6
    case leftElbow = 7
    case rightElbow = 8
    case leftWrist = 9
    case rightWrist = 10
    case leftHip = 11
    case rightHip = 12
    case leftKnee = 13
    case rightKnee = 14
    case leftAnkle = 15
    case rightAnkle = 16
    // Derived points
    case neck = 17
    case root = 18  // Center hip

    var displayName: String {
        switch self {
        case .nose: return "Nose"
        case .leftEye: return "Left Eye"
        case .rightEye: return "Right Eye"
        case .leftEar: return "Left Ear"
        case .rightEar: return "Right Ear"
        case .leftShoulder: return "Left Shoulder"
        case .rightShoulder: return "Right Shoulder"
        case .leftElbow: return "Left Elbow"
        case .rightElbow: return "Right Elbow"
        case .leftWrist: return "Left Wrist"
        case .rightWrist: return "Right Wrist"
        case .leftHip: return "Left Hip"
        case .rightHip: return "Right Hip"
        case .leftKnee: return "Left Knee"
        case .rightKnee: return "Right Knee"
        case .leftAnkle: return "Left Ankle"
        case .rightAnkle: return "Right Ankle"
        case .neck: return "Neck"
        case .root: return "Root"
        }
    }
}

/// Mapping from MediaPipe indices to Vision indices
/// Used when porting detector logic
struct LandmarkMapping {
    // MediaPipe indices for reference
    static let MEDIAPIPE_NOSE = 0
    static let MEDIAPIPE_LEFT_SHOULDER = 11
    static let MEDIAPIPE_RIGHT_SHOULDER = 12
    static let MEDIAPIPE_LEFT_ELBOW = 13
    static let MEDIAPIPE_RIGHT_ELBOW = 14
    static let MEDIAPIPE_LEFT_WRIST = 15
    static let MEDIAPIPE_RIGHT_WRIST = 16
    static let MEDIAPIPE_LEFT_HIP = 23
    static let MEDIAPIPE_RIGHT_HIP = 24
    static let MEDIAPIPE_LEFT_KNEE = 25
    static let MEDIAPIPE_RIGHT_KNEE = 26
    static let MEDIAPIPE_LEFT_ANKLE = 27
    static let MEDIAPIPE_RIGHT_ANKLE = 28

    /// Convert MediaPipe index to Vision joint
    static func visionJoint(fromMediaPipe index: Int) -> VisionJoint? {
        switch index {
        case MEDIAPIPE_NOSE: return .nose
        case MEDIAPIPE_LEFT_SHOULDER: return .leftShoulder
        case MEDIAPIPE_RIGHT_SHOULDER: return .rightShoulder
        case MEDIAPIPE_LEFT_ELBOW: return .leftElbow
        case MEDIAPIPE_RIGHT_ELBOW: return .rightElbow
        case MEDIAPIPE_LEFT_WRIST: return .leftWrist
        case MEDIAPIPE_RIGHT_WRIST: return .rightWrist
        case MEDIAPIPE_LEFT_HIP: return .leftHip
        case MEDIAPIPE_RIGHT_HIP: return .rightHip
        case MEDIAPIPE_LEFT_KNEE: return .leftKnee
        case MEDIAPIPE_RIGHT_KNEE: return .rightKnee
        case MEDIAPIPE_LEFT_ANKLE: return .leftAnkle
        case MEDIAPIPE_RIGHT_ANKLE: return .rightAnkle
        default: return nil
        }
    }
}
