import Foundation

/// Swing phases in order of occurrence
enum SwingPhase: String, CaseIterable, Codable {
    case address
    case backswing
    case top
    case downswing
    case impact
    case followThrough = "follow-through"
    case finish

    var displayName: String {
        switch self {
        case .address: return "Address"
        case .backswing: return "Backswing"
        case .top: return "Top"
        case .downswing: return "Downswing"
        case .impact: return "Impact"
        case .followThrough: return "Follow Through"
        case .finish: return "Finish"
        }
    }

    var order: Int {
        switch self {
        case .address: return 0
        case .backswing: return 1
        case .top: return 2
        case .downswing: return 3
        case .impact: return 4
        case .followThrough: return 5
        case .finish: return 6
        }
    }
}

/// A segment of frames belonging to a specific phase
struct PhaseSegment: Codable {
    let phase: SwingPhase
    let startFrame: Int
    let endFrame: Int
    let startTime: TimeInterval
    let endTime: TimeInterval

    var duration: TimeInterval {
        endTime - startTime
    }

    var frameCount: Int {
        endFrame - startFrame + 1
    }
}

/// Camera angle for the video
enum CameraAngle: String, Codable {
    case faceOn = "face-on"
    case dtl = "dtl"
    case oblique = "oblique"

    var displayName: String {
        switch self {
        case .faceOn: return "Face-On"
        case .dtl: return "Down the Line"
        case .oblique: return "Oblique"
        }
    }
}

/// Club type detected or specified
enum ClubType: String, Codable {
    case driver
    case iron
    case unknown

    var displayName: String {
        switch self {
        case .driver: return "Driver"
        case .iron: return "Iron"
        case .unknown: return "Unknown"
        }
    }
}
