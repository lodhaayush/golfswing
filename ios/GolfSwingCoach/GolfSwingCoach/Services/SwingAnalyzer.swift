import Foundation

/// Main swing analysis orchestrator
final class SwingAnalyzer: @unchecked Sendable {

    /// Analyze pose frames and return complete analysis result
    func analyze(
        frames: [PoseFrame],
        progress: @escaping @Sendable (Double) -> Void
    ) async throws -> AnalysisResult {

        guard !frames.isEmpty else {
            throw SwingAnalysisError.noFrames
        }

        progress(0.1)

        // Step 1: Detect camera angle
        let cameraAngle = detectCameraAngle(from: frames)
        progress(0.2)

        // Step 2: Detect club type
        let clubType = detectClubType(from: frames, cameraAngle: cameraAngle)
        progress(0.3)

        // Step 3: Detect swing phases using proper velocity-based detection
        let phaseResult = detectSwingPhases(frames: frames)
        let phases = createPhaseSegments(from: phaseResult.phaseFrames)
        let isRightHanded = phaseResult.isRightHanded
        progress(0.5)

        // Step 4: Calculate metrics
        let metrics = calculateMetrics(frames: frames, phases: phases, cameraAngle: cameraAngle, isRightHanded: isRightHanded)
        progress(0.6)

        // Step 5: Calculate tempo
        let tempo = calculateTempo(phases: phases)
        progress(0.7)

        // Step 6: Run all detectors
        let detectorInput = SwingDetectorInput(
            frames: frames,
            phaseSegments: phases,
            metrics: metrics,
            tempo: tempo,
            isRightHanded: isRightHanded,
            cameraAngle: cameraAngle,
            clubType: clubType
        )

        let mistakes = runAllDetectors(input: detectorInput)
        progress(0.9)

        // Step 7: Calculate overall score
        let overallScore = calculateOverallScore(mistakes: mistakes, metrics: metrics, tempo: tempo)
        progress(1.0)

        return AnalysisResult(
            overallScore: overallScore,
            cameraAngle: cameraAngle,
            clubType: clubType,
            isRightHanded: isRightHanded,
            phases: phases,
            metrics: metrics,
            tempo: tempo,
            detectedMistakes: mistakes.filter { $0.detected },
            frames: frames
        )
    }

    // MARK: - Camera Angle Detection

    private func detectCameraAngle(from frames: [PoseFrame]) -> CameraAngle {
        // Sample first few frames for stable detection
        let sampleCount = min(10, frames.count)
        var totalRatio: CGFloat = 0
        var validSamples = 0

        for i in 0..<sampleCount {
            let frame = frames[i]
            guard let leftShoulder = frame.landmark(for: .leftShoulder),
                  let rightShoulder = frame.landmark(for: .rightShoulder),
                  let leftHip = frame.landmark(for: .leftHip),
                  let rightHip = frame.landmark(for: .rightHip),
                  leftShoulder.visibility > 0.5, rightShoulder.visibility > 0.5 else {
                continue
            }

            let shoulderDx = abs(rightShoulder.x - leftShoulder.x)
            let shoulderDz = abs(rightShoulder.z - leftShoulder.z)
            let hipDx = abs(rightHip.x - leftHip.x)
            let hipDz = abs(rightHip.z - leftHip.z)

            let epsilon: CGFloat = 0.001
            let shoulderRatio = shoulderDx / (shoulderDz + epsilon)
            let hipRatio = hipDx / (hipDz + epsilon)
            let avgRatio = (shoulderRatio + hipRatio) / 2

            totalRatio += avgRatio
            validSamples += 1
        }

        guard validSamples > 0 else { return .faceOn }

        let avgRatio = totalRatio / CGFloat(validSamples)

        // Thresholds based on TypeScript implementation
        if avgRatio > 2.0 {
            return .faceOn
        } else if avgRatio < 0.5 {
            return .dtl
        } else {
            return .oblique
        }
    }

    // MARK: - Club Type Detection

    private func detectClubType(from frames: [PoseFrame], cameraAngle: CameraAngle) -> ClubType {
        let sampleCount = min(10, frames.count)
        var totalStanceRatio: Double = 0
        var totalArmExtension: Double = 0
        var validSamples = 0

        for i in 0..<sampleCount {
            let frame = frames[i]
            let stanceRatio = calculateStanceRatio(frame: frame)

            // Calculate arm extension ratio
            guard let leftShoulder = frame.landmark(for: .leftShoulder),
                  let rightShoulder = frame.landmark(for: .rightShoulder),
                  let leftWrist = frame.landmark(for: .leftWrist),
                  let rightWrist = frame.landmark(for: .rightWrist),
                  let leftAnkle = frame.landmark(for: .leftAnkle),
                  let rightAnkle = frame.landmark(for: .rightAnkle) else {
                continue
            }

            let shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
            let handCenterY = (leftWrist.y + rightWrist.y) / 2
            let ankleCenterY = (leftAnkle.y + rightAnkle.y) / 2

            let bodyHeight = abs(ankleCenterY - shoulderCenterY)
            guard bodyHeight > 0 else { continue }

            let armDrop = handCenterY - shoulderCenterY
            let armExtension = Double(armDrop / bodyHeight)

            totalStanceRatio += stanceRatio
            totalArmExtension += armExtension
            validSamples += 1
        }

        guard validSamples > 0 else { return .unknown }

        let avgStanceRatio = totalStanceRatio / Double(validSamples)
        let avgArmExtension = totalArmExtension / Double(validSamples)

        // Use stance ratio and arm extension to determine club type
        // Driver: wider stance (>2.35), less arm extension (<0.35)
        // Iron: narrower stance, more arm extension (>0.40)
        var driverScore: Double = 0

        if cameraAngle != .dtl {
            // Stance ratio signal
            if avgStanceRatio >= 2.35 {
                driverScore += 1
            } else if avgStanceRatio < 2.0 {
                driverScore -= 1
            }

            // Arm extension signal
            if avgArmExtension <= 0.35 {
                driverScore += 1
            } else if avgArmExtension >= 0.42 {
                driverScore -= 1
            }
        }

        if driverScore > 0 {
            return .driver
        } else if driverScore < 0 {
            return .iron
        } else {
            return .unknown
        }
    }

    // MARK: - Metrics Calculation

    private func calculateMetrics(
        frames: [PoseFrame],
        phases: [PhaseSegment],
        cameraAngle: CameraAngle,
        isRightHanded: Bool
    ) -> SwingMetrics? {

        guard !frames.isEmpty else { return nil }

        // Get key frames
        let addressSegment = phases.first { $0.phase == .address }
        let topSegment = phases.first { $0.phase == .top }
        let impactSegment = phases.first { $0.phase == .impact }

        let addressFrame = addressSegment.flatMap { frames.indices.contains($0.endFrame) ? frames[$0.endFrame] : nil }
        let topFrame = topSegment.flatMap { frames.indices.contains($0.startFrame) ? frames[$0.startFrame] : nil }
        let impactFrame = impactSegment.flatMap { frames.indices.contains($0.startFrame) ? frames[$0.startFrame] : nil }

        // Calculate rotation metrics
        var maxShoulderRotation: Double = 0
        var maxHipRotation: Double = 0
        var maxXFactor: Double = 0

        if let addressFrame = addressFrame {
            for frame in frames {
                let shoulderRotation: Double
                let hipRotation: Double

                if cameraAngle == .faceOn {
                    shoulderRotation = calculateRotationFromWidth(currentFrame: frame, addressFrame: addressFrame, bodyPart: .shoulders)
                    hipRotation = calculateRotationFromWidth(currentFrame: frame, addressFrame: addressFrame, bodyPart: .hips)
                } else {
                    shoulderRotation = abs(calculateShoulderRotation(frame: frame))
                    hipRotation = abs(calculateHipRotation(frame: frame))
                }

                maxShoulderRotation = max(maxShoulderRotation, shoulderRotation)
                maxHipRotation = max(maxHipRotation, hipRotation)
                maxXFactor = max(maxXFactor, abs(shoulderRotation - hipRotation))
            }
        }

        // Calculate spine metrics
        let addressSpineAngle = addressFrame.map { abs(calculateSpineAngle(frame: $0)) } ?? 0
        let impactSpineAngle = impactFrame.map { abs(calculateSpineAngle(frame: $0)) } ?? 0

        // Calculate arm metrics
        let leadSide: Side = isRightHanded ? .left : .right
        let topLeadArmExtension = topFrame.map { calculateArmExtension(frame: $0, side: leadSide) } ?? 180
        let impactLeadArmExtension = impactFrame.map { calculateArmExtension(frame: $0, side: leadSide) } ?? 180

        // Face-on specific metrics
        var hipSway: Double? = nil
        var headStability: Double? = nil

        if cameraAngle == .faceOn, let addressFrame = addressFrame {
            let addressFrames = addressSegment.map { segment in
                Array(frames[segment.startFrame...min(segment.endFrame, frames.count - 1)])
            } ?? []

            let swingFrames = phases.filter { $0.phase != .address && $0.phase != .finish }
                .flatMap { segment in
                    Array(frames[segment.startFrame...min(segment.endFrame, frames.count - 1)])
                }

            hipSway = calculateHipSway(frames: swingFrames, addressFrame: addressFrame)
            headStability = calculateHeadStability(swingFrames: swingFrames, addressFrames: addressFrames, addressFrame: addressFrame)
        }

        return SwingMetrics(
            maxShoulderRotation: maxShoulderRotation,
            maxHipRotation: maxHipRotation,
            maxXFactor: maxXFactor,
            addressSpineAngle: addressSpineAngle,
            impactSpineAngle: impactSpineAngle,
            topLeadArmExtension: topLeadArmExtension,
            impactLeadArmExtension: impactLeadArmExtension,
            hipSway: hipSway,
            headStability: headStability,
            impactExtension: nil  // TODO: Implement if needed
        )
    }

    // MARK: - Tempo Calculation

    private func calculateTempo(phases: [PhaseSegment]) -> TempoMetrics {
        let backswing = phases.first { $0.phase == .backswing }
        let downswing = phases.first { $0.phase == .downswing }

        let backswingDuration = backswing?.duration ?? 0.8
        let downswingDuration = downswing?.duration ?? 0.25

        let tempoRatio = downswingDuration > 0 ? backswingDuration / downswingDuration : 3.0

        return TempoMetrics(
            backswingDuration: backswingDuration,
            downswingDuration: downswingDuration,
            tempoRatio: tempoRatio,
            totalSwingDuration: backswingDuration + downswingDuration
        )
    }

    // MARK: - Scoring

    private func calculateOverallScore(
        mistakes: [DetectorResult],
        metrics: SwingMetrics?,
        tempo: TempoMetrics
    ) -> Double {

        var score = 100.0

        // Deduct for detected mistakes based on severity
        for mistake in mistakes where mistake.detected {
            // Scale penalty based on severity (0-100)
            // Max penalty per mistake: 15 points for severity 100
            let penalty = mistake.severity * 0.15
            score -= penalty
        }

        // Bonus/penalty for key metrics
        if let metrics = metrics {
            // Good shoulder rotation bonus
            if metrics.maxShoulderRotation >= 85 && metrics.maxShoulderRotation <= 100 {
                score += 2
            }

            // Good X-factor bonus
            if metrics.maxXFactor >= 35 && metrics.maxXFactor <= 50 {
                score += 2
            }
        }

        // Good tempo bonus
        if tempo.tempoRatio >= 2.5 && tempo.tempoRatio <= 3.5 {
            score += 2
        }

        // Ensure score is in valid range
        return max(0, min(100, score))
    }
}

enum SwingAnalysisError: Error, LocalizedError {
    case noFrames
    case analysisFailed
    case invalidPhases

    var errorDescription: String? {
        switch self {
        case .noFrames:
            return "No pose frames to analyze"
        case .analysisFailed:
            return "Swing analysis failed"
        case .invalidPhases:
            return "Could not detect swing phases"
        }
    }
}
