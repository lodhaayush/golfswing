import SwiftUI

/// View that draws a pose skeleton overlay on video frames
struct PoseOverlayView: View {
    let frame: PoseFrame
    let videoSize: CGSize

    // Skeleton connection definitions
    private let connections: [(VisionJoint, VisionJoint, Color)] = [
        // Head
        (.nose, .leftEye, .cyan),
        (.nose, .rightEye, .cyan),
        (.leftEye, .leftEar, .cyan),
        (.rightEye, .rightEar, .cyan),

        // Torso
        (.leftShoulder, .rightShoulder, .blue),
        (.leftShoulder, .leftHip, .blue),
        (.rightShoulder, .rightHip, .blue),
        (.leftHip, .rightHip, .blue),

        // Left arm
        (.leftShoulder, .leftElbow, .green),
        (.leftElbow, .leftWrist, .green),

        // Right arm
        (.rightShoulder, .rightElbow, .orange),
        (.rightElbow, .rightWrist, .orange),

        // Left leg
        (.leftHip, .leftKnee, .purple),
        (.leftKnee, .leftAnkle, .purple),

        // Right leg
        (.rightHip, .rightKnee, .pink),
        (.rightKnee, .rightAnkle, .pink),
    ]

    var body: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                // Draw all connections
                for (joint1, joint2, color) in connections {
                    if let p1 = getScreenPoint(for: joint1, in: size),
                       let p2 = getScreenPoint(for: joint2, in: size) {
                        var path = Path()
                        path.move(to: p1)
                        path.addLine(to: p2)
                        context.stroke(path, with: .color(color), lineWidth: 3)
                    }
                }

                // Draw all joint points
                for joint in VisionJoint.allCases {
                    if let point = getScreenPoint(for: joint, in: size) {
                        let rect = CGRect(
                            x: point.x - 5,
                            y: point.y - 5,
                            width: 10,
                            height: 10
                        )
                        context.fill(Circle().path(in: rect), with: .color(.white))
                        context.stroke(Circle().path(in: rect), with: .color(.black), lineWidth: 1)
                    }
                }
            }
        }
    }

    /// Convert normalized landmark coordinates to screen coordinates
    private func getScreenPoint(for joint: VisionJoint, in size: CGSize) -> CGPoint? {
        guard let landmark = frame.landmark(for: joint),
              landmark.visibility > 0.5 else {
            return nil
        }

        // Landmarks are normalized (0-1), convert to screen coordinates
        return CGPoint(
            x: landmark.x * size.width,
            y: landmark.y * size.height
        )
    }
}

/// Simplified pose overlay for thumbnail/preview
struct SimplePoseOverlayView: View {
    let frame: PoseFrame

    var body: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                // Just draw key points for thumbnail
                let keyJoints: [VisionJoint] = [
                    .nose, .leftShoulder, .rightShoulder,
                    .leftElbow, .rightElbow, .leftWrist, .rightWrist,
                    .leftHip, .rightHip, .leftKnee, .rightKnee,
                    .leftAnkle, .rightAnkle
                ]

                for joint in keyJoints {
                    if let landmark = frame.landmark(for: joint),
                       landmark.visibility > 0.5 {
                        let point = CGPoint(
                            x: landmark.x * size.width,
                            y: landmark.y * size.height
                        )
                        let rect = CGRect(x: point.x - 3, y: point.y - 3, width: 6, height: 6)
                        context.fill(Circle().path(in: rect), with: .color(.green))
                    }
                }
            }
        }
    }
}

