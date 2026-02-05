import Foundation

// MARK: - Scoring Weights by Camera Angle

/// Weights for calculating overall score based on camera angle
enum ScoringWeights {
    struct Weights {
        let xFactor: Double
        let shoulder: Double
        let hip: Double
        let spine: Double
        let leadArm: Double
        let tempo: Double
        let hipSway: Double
        let headStability: Double
        let impactExtension: Double
    }

    static let DTL = Weights(
        xFactor: 0,           // Unreliable for DTL
        shoulder: 0,          // Unreliable for DTL
        hip: 0,               // Unreliable for DTL
        spine: 0.30,          // Very reliable for DTL
        leadArm: 0.35,        // Very reliable for DTL
        tempo: 0.35,          // Reliable for all angles
        hipSway: 0,           // Not available for DTL
        headStability: 0,     // Not available for DTL
        impactExtension: 0    // Not available for DTL
    )

    static let faceOn = Weights(
        xFactor: 0.12,        // Reliable with width-based calculation
        shoulder: 0.10,       // Reliable with width-based calculation
        hip: 0.08,            // Reliable with width-based calculation
        spine: 0.08,          // Less reliable (shows lateral tilt)
        leadArm: 0.12,        // Visible but partially occluded
        tempo: 0.20,          // Reliable for all angles
        hipSway: 0.10,        // Face-on specific (lower is better)
        headStability: 0.10,  // Face-on specific (lower is better)
        impactExtension: 0.10 // Face-on specific (higher is better)
    )

    static let oblique = Weights(
        xFactor: 0.20,
        shoulder: 0.15,
        hip: 0.10,
        spine: 0.15,
        leadArm: 0.15,
        tempo: 0.25,
        hipSway: 0,
        headStability: 0,
        impactExtension: 0
    )

    static func weights(for cameraAngle: CameraAngle) -> Weights {
        switch cameraAngle {
        case .dtl:
            return DTL
        case .faceOn:
            return faceOn
        case .oblique:
            return oblique
        }
    }
}

// MARK: - Scoring Ranges

struct ScoringRange {
    let idealMin: Double
    let idealMax: Double
    let absMin: Double
    let absMax: Double
}

/// Ideal ranges for scoring metrics
enum ScoringRanges {
    // X-Factor ranges (same for all camera angles)
    static let xFactor = ScoringRange(idealMin: 35, idealMax: 65, absMin: 20, absMax: 80)

    // Shoulder rotation ranges
    enum Shoulder {
        static let faceOn = ScoringRange(idealMin: 55, idealMax: 95, absMin: 35, absMax: 130)
        static let `default` = ScoringRange(idealMin: 80, idealMax: 110, absMin: 60, absMax: 130)
    }

    // Hip rotation ranges
    enum Hip {
        static let faceOn = ScoringRange(idealMin: 25, idealMax: 55, absMin: 15, absMax: 75)
        static let `default` = ScoringRange(idealMin: 40, idealMax: 60, absMin: 25, absMax: 75)
    }

    // Spine angle tolerance (multiplier for difference from address to impact)
    enum SpineTolerance {
        static let faceOn: Double = 1
        static let `default`: Double = 3
    }

    // Lead arm extension ranges
    enum LeadArm {
        static let faceOn = ScoringRange(idealMin: 140, idealMax: 180, absMin: 100, absMax: 180)
        static let `default` = ScoringRange(idealMin: 160, idealMax: 180, absMin: 120, absMax: 180)
    }

    // Hip sway ranges (inverted: 1 - value, so higher = less sway = better)
    static let hipSway = ScoringRange(idealMin: 0.60, idealMax: 1.0, absMin: 0.3, absMax: 1.0)

    // Head stability ranges (inverted: 1 - value, so higher = less movement = better)
    static let headStability = ScoringRange(idealMin: 0.65, idealMax: 1.0, absMin: 0.3, absMax: 1.0)

    // Impact extension ranges
    static let impactExtension = ScoringRange(idealMin: 0.7, idealMax: 1.0, absMin: 0.3, absMax: 1.0)
}

// MARK: - Club-Specific Scoring Adjustments

/// Club-specific ideal ranges
enum ClubScoring {
    struct ClubRanges {
        let xFactor: ScoringRange
        let shoulderFaceOn: ScoringRange
        let shoulderDefault: ScoringRange
        let hipFaceOn: ScoringRange
        let hipDefault: ScoringRange
        let leadArmFaceOn: ScoringRange
        let leadArmDefault: ScoringRange
        let tempoIdealRatio: Double
        let tempoTolerance: Double
    }

    // Driver-specific ideal ranges - bigger swings, more rotation
    static let driver = ClubRanges(
        xFactor: ScoringRange(idealMin: 40, idealMax: 65, absMin: 25, absMax: 80),
        shoulderFaceOn: ScoringRange(idealMin: 60, idealMax: 100, absMin: 40, absMax: 130),
        shoulderDefault: ScoringRange(idealMin: 85, idealMax: 115, absMin: 65, absMax: 135),
        hipFaceOn: ScoringRange(idealMin: 30, idealMax: 60, absMin: 20, absMax: 80),
        hipDefault: ScoringRange(idealMin: 45, idealMax: 65, absMin: 30, absMax: 80),
        leadArmFaceOn: ScoringRange(idealMin: 140, idealMax: 180, absMin: 100, absMax: 180),
        leadArmDefault: ScoringRange(idealMin: 160, idealMax: 180, absMin: 120, absMax: 180),
        tempoIdealRatio: 3.0,
        tempoTolerance: 0.4
    )

    // Iron-specific ideal ranges - more controlled, less rotation
    static let iron = ClubRanges(
        xFactor: ScoringRange(idealMin: 30, idealMax: 55, absMin: 15, absMax: 70),
        shoulderFaceOn: ScoringRange(idealMin: 50, idealMax: 90, absMin: 30, absMax: 120),
        shoulderDefault: ScoringRange(idealMin: 75, idealMax: 105, absMin: 55, absMax: 125),
        hipFaceOn: ScoringRange(idealMin: 20, idealMax: 50, absMin: 10, absMax: 70),
        hipDefault: ScoringRange(idealMin: 35, idealMax: 55, absMin: 20, absMax: 70),
        leadArmFaceOn: ScoringRange(idealMin: 145, idealMax: 180, absMin: 110, absMax: 180),
        leadArmDefault: ScoringRange(idealMin: 165, idealMax: 180, absMin: 130, absMax: 180),
        tempoIdealRatio: 3.0,
        tempoTolerance: 0.3
    )

    static func ranges(for clubType: ClubType) -> ClubRanges? {
        switch clubType {
        case .driver:
            return driver
        case .iron:
            return iron
        case .unknown:
            return nil
        }
    }
}

// MARK: - Scoring Calculator

enum ScoringCalculator {

    /// Calculate overall score using camera-angle and club-specific weights
    static func calculateOverallScore(
        metrics: SwingMetrics?,
        tempo: TempoMetrics,
        cameraAngle: CameraAngle,
        clubType: ClubType,
        detectedMistakes: [DetectorResult]
    ) -> Double {
        var scores: [Double] = []

        let isFaceOn = cameraAngle == .faceOn
        let weights = ScoringWeights.weights(for: cameraAngle)

        // Get club-specific ranges, fall back to defaults for unknown
        let clubRanges = ClubScoring.ranges(for: clubType)

        guard let metrics = metrics else {
            // No metrics available, calculate based on tempo and mistakes only
            let tempoScore = calculateTempoScore(tempo: tempo, clubRanges: clubRanges)
            let baseScore = tempoScore * weights.tempo * 100
            let mistakePenalty = calculateMistakePenalty(mistakes: detectedMistakes)
            return max(0, min(100, baseScore - mistakePenalty))
        }

        // X-Factor score
        let xFactorRanges = clubRanges?.xFactor ?? ScoringRanges.xFactor
        let xFactorScore = scoreInRange(
            value: metrics.maxXFactor,
            range: xFactorRanges
        )
        scores.append(xFactorScore * weights.xFactor)

        // Shoulder rotation score
        let defaultShoulderRanges = isFaceOn ? ScoringRanges.Shoulder.faceOn : ScoringRanges.Shoulder.default
        let clubShoulderRanges = clubRanges.map { isFaceOn ? $0.shoulderFaceOn : $0.shoulderDefault }
        let shoulderRanges = clubShoulderRanges ?? defaultShoulderRanges
        let shoulderScore = scoreInRange(
            value: metrics.maxShoulderRotation,
            range: shoulderRanges
        )
        scores.append(shoulderScore * weights.shoulder)

        // Hip rotation score
        let defaultHipRanges = isFaceOn ? ScoringRanges.Hip.faceOn : ScoringRanges.Hip.default
        let clubHipRanges = clubRanges.map { isFaceOn ? $0.hipFaceOn : $0.hipDefault }
        let hipRanges = clubHipRanges ?? defaultHipRanges
        let hipScore = scoreInRange(
            value: metrics.maxHipRotation,
            range: hipRanges
        )
        scores.append(hipScore * weights.hip)

        // Spine angle consistency
        let spineTolerance = isFaceOn ? ScoringRanges.SpineTolerance.faceOn : ScoringRanges.SpineTolerance.default
        let spineConsistency = 100 - min(100, abs(metrics.addressSpineAngle - metrics.impactSpineAngle) * spineTolerance)
        scores.append(spineConsistency * weights.spine)

        // Lead arm extension at top
        let defaultLeadArmRanges = isFaceOn ? ScoringRanges.LeadArm.faceOn : ScoringRanges.LeadArm.default
        let clubLeadArmRanges = clubRanges.map { isFaceOn ? $0.leadArmFaceOn : $0.leadArmDefault }
        let leadArmRanges = clubLeadArmRanges ?? defaultLeadArmRanges
        let leadArmScore = scoreInRange(
            value: metrics.topLeadArmExtension,
            range: leadArmRanges
        )
        scores.append(leadArmScore * weights.leadArm)

        // Tempo score
        let tempoScore = calculateTempoScore(tempo: tempo, clubRanges: clubRanges)
        scores.append(tempoScore * weights.tempo)

        // Face-on specific metrics
        if isFaceOn {
            // Hip sway score (lower is better, so invert)
            let hipSwayValue = metrics.hipSway ?? 0.5
            let hipSwayScore = scoreInRange(
                value: 1 - hipSwayValue,
                range: ScoringRanges.hipSway
            )
            scores.append(hipSwayScore * weights.hipSway)

            // Head stability score (lower is better, so invert)
            let headStabilityValue = metrics.headStability ?? 0.5
            let headStabilityScore = scoreInRange(
                value: 1 - headStabilityValue,
                range: ScoringRanges.headStability
            )
            scores.append(headStabilityScore * weights.headStability)

            // Impact extension score (higher is better)
            let impactExtensionValue = metrics.impactExtension ?? 0.5
            let impactExtensionScore = scoreInRange(
                value: impactExtensionValue,
                range: ScoringRanges.impactExtension
            )
            scores.append(impactExtensionScore * weights.impactExtension)
        }

        // Calculate base score from weighted metrics
        let baseScore = scores.reduce(0, +)

        // Apply mistake penalty
        let mistakePenalty = calculateMistakePenalty(mistakes: detectedMistakes)

        log.info("Score Calculation | {\"baseScore\": \(String(format: "%.1f", baseScore)), \"mistakePenalty\": \(String(format: "%.1f", mistakePenalty)), \"detectedMistakes\": \(detectedMistakes.count), \"cameraAngle\": \"\(cameraAngle.rawValue)\", \"clubType\": \"\(clubType.rawValue)\"}")

        return max(0, min(100, round(baseScore - mistakePenalty)))
    }

    /// Score a value based on ideal range
    private static func scoreInRange(value: Double, range: ScoringRange) -> Double {
        if value >= range.idealMin && value <= range.idealMax {
            return 100
        }

        if value < range.idealMin {
            let rangeSize = range.idealMin - range.absMin
            guard rangeSize > 0 else { return 0 }
            let distance = range.idealMin - value
            return max(0, 100 - (distance / rangeSize) * 100)
        }

        let rangeSize = range.absMax - range.idealMax
        guard rangeSize > 0 else { return 0 }
        let distance = value - range.idealMax
        return max(0, 100 - (distance / rangeSize) * 100)
    }

    /// Calculate tempo score (0-100)
    private static func calculateTempoScore(tempo: TempoMetrics, clubRanges: ClubScoring.ClubRanges?) -> Double {
        let idealRatio = clubRanges?.tempoIdealRatio ?? 3.0
        let tolerance = clubRanges?.tempoTolerance ?? 0.3

        let deviation = abs(tempo.tempoRatio - idealRatio)
        if deviation <= tolerance {
            return 100
        }

        // Score decreases linearly outside tolerance
        let maxDeviation = 2.0
        let score = 100 * (1 - (deviation - tolerance) / maxDeviation)
        return max(0, min(100, score))
    }

    /// Calculate score penalty based on detected swing mistakes
    private static func calculateMistakePenalty(mistakes: [DetectorResult]) -> Double {
        guard !mistakes.isEmpty else { return 0 }

        var totalPenalty: Double = 0
        for mistake in mistakes where mistake.detected {
            // Severity tiers: High (70+) = 5pts, Medium (40-69) = 3pts, Low (<40) = 1pt
            let basePenalty: Double = mistake.severity >= 70 ? 5 : mistake.severity >= 40 ? 3 : 1
            // Weight by detection confidence
            totalPenalty += basePenalty * mistake.confidence
        }

        // Cap at 25 points to prevent crushing scores
        return min(25, round(totalPenalty))
    }
}
