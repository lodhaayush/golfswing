import Foundation
import Vision
import AVFoundation
import CoreImage

/// Service for detecting poses in video frames using Apple's Vision framework
final class PoseDetectionService: @unchecked Sendable {

    /// Target frames per second for extraction
    private let targetFPS: Double = 15.0

    /// Detect poses in all frames of a video
    /// - Parameters:
    ///   - videoURL: URL to the video file
    ///   - progress: Progress callback (0.0 to 1.0)
    /// - Returns: Array of PoseFrame objects
    func detectPoses(
        in videoURL: URL,
        progress: @escaping @Sendable (Double) -> Void
    ) async throws -> [PoseFrame] {

        log.info("Pose Detection Started | {\"videoURL\": \"\(videoURL.lastPathComponent)\", \"targetFPS\": \(targetFPS)}")

        let asset = AVAsset(url: videoURL)

        // Get video duration and calculate frame times
        let duration = try await asset.load(.duration)
        let durationSeconds = CMTimeGetSeconds(duration)
        let frameInterval = 1.0 / targetFPS
        let frameCount = Int(durationSeconds * targetFPS)

        guard frameCount > 0 else {
            throw PoseDetectionError.invalidVideo
        }

        // Create image generator
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = CMTime(seconds: frameInterval / 2, preferredTimescale: 600)
        generator.requestedTimeToleranceAfter = CMTime(seconds: frameInterval / 2, preferredTimescale: 600)

        var frames: [PoseFrame] = []

        // Process each frame
        for frameIndex in 0..<frameCount {
            let timestamp = Double(frameIndex) * frameInterval
            let time = CMTime(seconds: timestamp, preferredTimescale: 600)

            do {
                let (cgImage, _) = try await generator.image(at: time)

                // Detect pose in this frame
                if let landmarks = try await detectPose(in: cgImage) {
                    let frame = PoseFrame(
                        frameIndex: frameIndex,
                        timestamp: timestamp,
                        landmarks: landmarks
                    )
                    frames.append(frame)
                }
            } catch {
                // Skip frames that fail to extract
                log.warning("Frame Extraction Failed | {\"frameIndex\": \(frameIndex), \"error\": \"\(error.localizedDescription)\"}")
            }

            // Report progress
            progress(Double(frameIndex + 1) / Double(frameCount))
        }

        let successRate = frameCount > 0 ? Double(frames.count) / Double(frameCount) * 100 : 0
        log.info("Pose Detection Complete | {\"extractedFrames\": \(frames.count), \"expectedFrames\": \(frameCount), \"successRate\": \(String(format: "%.1f", successRate))}")

        return frames
    }

    /// Detect pose in a single image
    private func detectPose(in cgImage: CGImage) async throws -> [Landmark]? {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanBodyPoseRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let observations = request.results as? [VNHumanBodyPoseObservation],
                      let observation = observations.first else {
                    continuation.resume(returning: nil)
                    return
                }

                do {
                    let landmarks = try self.extractLandmarks(from: observation)
                    continuation.resume(returning: landmarks)
                } catch {
                    continuation.resume(throwing: error)
                }
            }

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    /// Extract landmarks from Vision observation
    private func extractLandmarks(from observation: VNHumanBodyPoseObservation) throws -> [Landmark] {
        // Map Vision joint names to our indices
        let jointMapping: [(VNHumanBodyPoseObservation.JointName, VisionJoint)] = [
            (.nose, .nose),
            (.leftEye, .leftEye),
            (.rightEye, .rightEye),
            (.leftEar, .leftEar),
            (.rightEar, .rightEar),
            (.leftShoulder, .leftShoulder),
            (.rightShoulder, .rightShoulder),
            (.leftElbow, .leftElbow),
            (.rightElbow, .rightElbow),
            (.leftWrist, .leftWrist),
            (.rightWrist, .rightWrist),
            (.leftHip, .leftHip),
            (.rightHip, .rightHip),
            (.leftKnee, .leftKnee),
            (.rightKnee, .rightKnee),
            (.leftAnkle, .leftAnkle),
            (.rightAnkle, .rightAnkle)
        ]

        // Create array with space for all landmarks including derived ones
        var landmarks = [Landmark](repeating: Landmark(x: 0, y: 0, visibility: 0), count: VisionJoint.allCases.count)

        // Extract direct landmarks
        for (visionName, joint) in jointMapping {
            if let point = try? observation.recognizedPoint(visionName) {
                // Vision coordinates: origin at bottom-left, normalized 0-1
                // Convert to top-left origin (matching MediaPipe)
                landmarks[joint.rawValue] = Landmark(
                    x: point.location.x,
                    y: 1.0 - point.location.y,  // Flip Y axis
                    z: 0,
                    visibility: Float(point.confidence)
                )
            }
        }

        // Derive neck point (midpoint of shoulders)
        let leftShoulder = landmarks[VisionJoint.leftShoulder.rawValue]
        let rightShoulder = landmarks[VisionJoint.rightShoulder.rawValue]
        if leftShoulder.visibility > 0 && rightShoulder.visibility > 0 {
            landmarks[VisionJoint.neck.rawValue] = Landmark(
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2,
                visibility: min(leftShoulder.visibility, rightShoulder.visibility)
            )
        }

        // Derive root point (midpoint of hips)
        let leftHip = landmarks[VisionJoint.leftHip.rawValue]
        let rightHip = landmarks[VisionJoint.rightHip.rawValue]
        if leftHip.visibility > 0 && rightHip.visibility > 0 {
            landmarks[VisionJoint.root.rawValue] = Landmark(
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2,
                visibility: min(leftHip.visibility, rightHip.visibility)
            )
        }

        return landmarks
    }
}

enum PoseDetectionError: Error, LocalizedError {
    case invalidVideo
    case noFramesExtracted
    case noPoseDetected

    var errorDescription: String? {
        switch self {
        case .invalidVideo:
            return "Invalid or empty video file"
        case .noFramesExtracted:
            return "Could not extract frames from video"
        case .noPoseDetected:
            return "No human pose detected in video"
        }
    }
}
