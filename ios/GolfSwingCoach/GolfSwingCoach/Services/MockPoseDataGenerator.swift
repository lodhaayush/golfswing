import Foundation
import CoreGraphics

/// Generates mock pose data for golf swing analysis on iOS Simulator
/// where Vision framework's body pose detection is unavailable.
final class MockPoseDataGenerator {

    /// Generate mock pose frames for a golf swing
    /// - Parameters:
    ///   - duration: Video duration in seconds
    ///   - fps: Target frames per second (default 15)
    /// - Returns: Array of PoseFrame with realistic golf swing positions
    static func generateSwingFrames(duration: TimeInterval, fps: Double = 15.0) -> [PoseFrame] {
        let frameCount = Int(duration * fps)
        guard frameCount > 0 else { return [] }

        var frames: [PoseFrame] = []

        for frameIndex in 0..<frameCount {
            let timestamp = Double(frameIndex) / fps
            let progress = Double(frameIndex) / Double(frameCount)

            let landmarks = generateLandmarks(at: progress)
            let frame = PoseFrame(
                frameIndex: frameIndex,
                timestamp: timestamp,
                landmarks: landmarks
            )
            frames.append(frame)
        }

        log.info("MockPoseDataGenerator | Generated \(frames.count) mock frames for \(String(format: "%.1f", duration))s video")

        return frames
    }

    /// Generate landmarks for a specific point in the swing (0.0 to 1.0)
    private static func generateLandmarks(at progress: Double) -> [Landmark] {
        // Determine swing phase based on progress
        let phase = SwingPhase.from(progress: progress)

        // Get keyframe poses for interpolation
        let (startPose, endPose, phaseProgress) = getInterpolationData(for: phase, at: progress)

        // Interpolate between keyframe poses
        var landmarks = [Landmark]()
        for joint in VisionJoint.allCases {
            let start = startPose[joint.rawValue]
            let end = endPose[joint.rawValue]

            // Smooth interpolation using ease-in-out
            let t = smoothstep(phaseProgress)

            let landmark = Landmark(
                x: lerp(start.x, end.x, t),
                y: lerp(start.y, end.y, t),
                z: 0,
                visibility: 0.95  // High confidence for mock data
            )
            landmarks.append(landmark)
        }

        return landmarks
    }

    /// Swing phases with their time ranges
    private enum SwingPhase {
        case setup       // 0-12%
        case backswing   // 12-38%
        case top         // 38-50%
        case downswing   // 50-62%
        case impact      // 62-70%
        case followThrough // 70-100%

        static func from(progress: Double) -> SwingPhase {
            switch progress {
            case 0..<0.12: return .setup
            case 0.12..<0.38: return .backswing
            case 0.38..<0.50: return .top
            case 0.50..<0.62: return .downswing
            case 0.62..<0.70: return .impact
            default: return .followThrough
            }
        }

        var range: (start: Double, end: Double) {
            switch self {
            case .setup: return (0.0, 0.12)
            case .backswing: return (0.12, 0.38)
            case .top: return (0.38, 0.50)
            case .downswing: return (0.50, 0.62)
            case .impact: return (0.62, 0.70)
            case .followThrough: return (0.70, 1.0)
            }
        }
    }

    private static func getInterpolationData(for phase: SwingPhase, at progress: Double) -> (start: [Landmark], end: [Landmark], progress: Double) {
        let range = phase.range
        let phaseProgress = (progress - range.start) / (range.end - range.start)

        switch phase {
        case .setup:
            return (setupPose, setupPose, phaseProgress)  // Static at address
        case .backswing:
            return (setupPose, topPose, phaseProgress)
        case .top:
            return (topPose, topPose, phaseProgress)  // Brief pause at top
        case .downswing:
            return (topPose, impactPose, phaseProgress)
        case .impact:
            return (impactPose, impactPose, phaseProgress)  // Brief at impact
        case .followThrough:
            return (impactPose, finishPose, phaseProgress)
        }
    }

    // MARK: - Keyframe Poses (Right-handed golfer, face-on view)
    // Coordinates are normalized 0-1, origin top-left

    /// Address/Setup position
    private static let setupPose: [Landmark] = createPose(
        nose: (0.50, 0.15),
        leftEye: (0.52, 0.13),
        rightEye: (0.48, 0.13),
        leftEar: (0.54, 0.14),
        rightEar: (0.46, 0.14),
        leftShoulder: (0.55, 0.28),
        rightShoulder: (0.45, 0.28),
        leftElbow: (0.58, 0.38),
        rightElbow: (0.42, 0.38),
        leftWrist: (0.50, 0.45),
        rightWrist: (0.50, 0.45),
        leftHip: (0.52, 0.50),
        rightHip: (0.48, 0.50),
        leftKnee: (0.53, 0.68),
        rightKnee: (0.47, 0.68),
        leftAnkle: (0.54, 0.85),
        rightAnkle: (0.46, 0.85)
    )

    /// Top of backswing
    private static let topPose: [Landmark] = createPose(
        nose: (0.48, 0.15),
        leftEye: (0.50, 0.13),
        rightEye: (0.46, 0.13),
        leftEar: (0.52, 0.14),
        rightEar: (0.44, 0.14),
        leftShoulder: (0.60, 0.25),
        rightShoulder: (0.40, 0.30),
        leftElbow: (0.55, 0.22),
        rightElbow: (0.38, 0.25),
        leftWrist: (0.42, 0.18),
        rightWrist: (0.40, 0.20),
        leftHip: (0.54, 0.50),
        rightHip: (0.46, 0.50),
        leftKnee: (0.55, 0.68),
        rightKnee: (0.45, 0.70),
        leftAnkle: (0.54, 0.85),
        rightAnkle: (0.46, 0.85)
    )

    /// Impact position
    private static let impactPose: [Landmark] = createPose(
        nose: (0.50, 0.15),
        leftEye: (0.52, 0.13),
        rightEye: (0.48, 0.13),
        leftEar: (0.54, 0.14),
        rightEar: (0.46, 0.14),
        leftShoulder: (0.52, 0.28),
        rightShoulder: (0.48, 0.28),
        leftElbow: (0.54, 0.36),
        rightElbow: (0.46, 0.38),
        leftWrist: (0.50, 0.48),
        rightWrist: (0.50, 0.48),
        leftHip: (0.50, 0.50),
        rightHip: (0.50, 0.50),
        leftKnee: (0.52, 0.68),
        rightKnee: (0.48, 0.70),
        leftAnkle: (0.53, 0.85),
        rightAnkle: (0.47, 0.85)
    )

    /// Finish position
    private static let finishPose: [Landmark] = createPose(
        nose: (0.55, 0.15),
        leftEye: (0.57, 0.13),
        rightEye: (0.53, 0.13),
        leftEar: (0.59, 0.14),
        rightEar: (0.51, 0.14),
        leftShoulder: (0.45, 0.28),
        rightShoulder: (0.55, 0.30),
        leftElbow: (0.50, 0.22),
        rightElbow: (0.60, 0.25),
        leftWrist: (0.58, 0.18),
        rightWrist: (0.62, 0.22),
        leftHip: (0.48, 0.50),
        rightHip: (0.52, 0.50),
        leftKnee: (0.50, 0.68),
        rightKnee: (0.50, 0.70),
        leftAnkle: (0.52, 0.85),
        rightAnkle: (0.48, 0.85)
    )

    /// Helper to create a pose from joint positions
    private static func createPose(
        nose: (CGFloat, CGFloat),
        leftEye: (CGFloat, CGFloat),
        rightEye: (CGFloat, CGFloat),
        leftEar: (CGFloat, CGFloat),
        rightEar: (CGFloat, CGFloat),
        leftShoulder: (CGFloat, CGFloat),
        rightShoulder: (CGFloat, CGFloat),
        leftElbow: (CGFloat, CGFloat),
        rightElbow: (CGFloat, CGFloat),
        leftWrist: (CGFloat, CGFloat),
        rightWrist: (CGFloat, CGFloat),
        leftHip: (CGFloat, CGFloat),
        rightHip: (CGFloat, CGFloat),
        leftKnee: (CGFloat, CGFloat),
        rightKnee: (CGFloat, CGFloat),
        leftAnkle: (CGFloat, CGFloat),
        rightAnkle: (CGFloat, CGFloat)
    ) -> [Landmark] {
        var landmarks = [Landmark](repeating: Landmark(x: 0, y: 0, visibility: 0), count: VisionJoint.allCases.count)

        landmarks[VisionJoint.nose.rawValue] = Landmark(x: nose.0, y: nose.1, visibility: 0.95)
        landmarks[VisionJoint.leftEye.rawValue] = Landmark(x: leftEye.0, y: leftEye.1, visibility: 0.95)
        landmarks[VisionJoint.rightEye.rawValue] = Landmark(x: rightEye.0, y: rightEye.1, visibility: 0.95)
        landmarks[VisionJoint.leftEar.rawValue] = Landmark(x: leftEar.0, y: leftEar.1, visibility: 0.95)
        landmarks[VisionJoint.rightEar.rawValue] = Landmark(x: rightEar.0, y: rightEar.1, visibility: 0.95)
        landmarks[VisionJoint.leftShoulder.rawValue] = Landmark(x: leftShoulder.0, y: leftShoulder.1, visibility: 0.95)
        landmarks[VisionJoint.rightShoulder.rawValue] = Landmark(x: rightShoulder.0, y: rightShoulder.1, visibility: 0.95)
        landmarks[VisionJoint.leftElbow.rawValue] = Landmark(x: leftElbow.0, y: leftElbow.1, visibility: 0.95)
        landmarks[VisionJoint.rightElbow.rawValue] = Landmark(x: rightElbow.0, y: rightElbow.1, visibility: 0.95)
        landmarks[VisionJoint.leftWrist.rawValue] = Landmark(x: leftWrist.0, y: leftWrist.1, visibility: 0.95)
        landmarks[VisionJoint.rightWrist.rawValue] = Landmark(x: rightWrist.0, y: rightWrist.1, visibility: 0.95)
        landmarks[VisionJoint.leftHip.rawValue] = Landmark(x: leftHip.0, y: leftHip.1, visibility: 0.95)
        landmarks[VisionJoint.rightHip.rawValue] = Landmark(x: rightHip.0, y: rightHip.1, visibility: 0.95)
        landmarks[VisionJoint.leftKnee.rawValue] = Landmark(x: leftKnee.0, y: leftKnee.1, visibility: 0.95)
        landmarks[VisionJoint.rightKnee.rawValue] = Landmark(x: rightKnee.0, y: rightKnee.1, visibility: 0.95)
        landmarks[VisionJoint.leftAnkle.rawValue] = Landmark(x: leftAnkle.0, y: leftAnkle.1, visibility: 0.95)
        landmarks[VisionJoint.rightAnkle.rawValue] = Landmark(x: rightAnkle.0, y: rightAnkle.1, visibility: 0.95)

        // Derived points
        landmarks[VisionJoint.neck.rawValue] = Landmark(
            x: (leftShoulder.0 + rightShoulder.0) / 2,
            y: (leftShoulder.1 + rightShoulder.1) / 2,
            visibility: 0.95
        )
        landmarks[VisionJoint.root.rawValue] = Landmark(
            x: (leftHip.0 + rightHip.0) / 2,
            y: (leftHip.1 + rightHip.1) / 2,
            visibility: 0.95
        )

        return landmarks
    }

    // MARK: - Math Helpers

    /// Linear interpolation
    private static func lerp(_ a: CGFloat, _ b: CGFloat, _ t: Double) -> CGFloat {
        return a + (b - a) * CGFloat(t)
    }

    /// Smooth step for ease-in-out interpolation
    private static func smoothstep(_ t: Double) -> Double {
        let clamped = max(0, min(1, t))
        return clamped * clamped * (3 - 2 * clamped)
    }
}
