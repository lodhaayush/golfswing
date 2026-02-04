import Foundation
import CoreGraphics

// MARK: - Basic Angle Calculations

/// Calculate the angle between three points in 2D (ignoring z-coordinate)
/// Returns angle at point B in degrees
func calculateAngle2D(
    pointA: Landmark,
    pointB: Landmark,
    pointC: Landmark
) -> Double {
    let vectorBA = CGPoint(x: pointA.x - pointB.x, y: pointA.y - pointB.y)
    let vectorBC = CGPoint(x: pointC.x - pointB.x, y: pointC.y - pointB.y)

    let dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y
    let magnitudeBA = sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y)
    let magnitudeBC = sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y)

    if magnitudeBA == 0 || magnitudeBC == 0 { return 0 }

    let cosAngle = max(-1, min(1, dotProduct / (magnitudeBA * magnitudeBC)))
    return acos(cosAngle) * (180 / .pi)
}

/// Calculate rotation angle in the horizontal plane (XZ plane)
/// Returns angle in degrees, where 0 is facing camera, positive is rotated left
func calculateHorizontalRotation(
    leftPoint: Landmark,
    rightPoint: Landmark
) -> Double {
    let dx = rightPoint.x - leftPoint.x
    let dz = rightPoint.z - leftPoint.z
    return atan2(dz, dx) * (180 / .pi)
}

// MARK: - Body Rotation Calculations

/// Calculate hip rotation from landmarks
/// Returns angle in degrees relative to facing the camera
func calculateHipRotation(frame: PoseFrame) -> Double {
    guard let leftHip = frame.landmark(for: .leftHip),
          let rightHip = frame.landmark(for: .rightHip) else {
        return 0
    }
    return calculateHorizontalRotation(leftPoint: leftHip, rightPoint: rightHip)
}

/// Calculate shoulder rotation from landmarks
/// Returns angle in degrees relative to facing the camera
func calculateShoulderRotation(frame: PoseFrame) -> Double {
    guard let leftShoulder = frame.landmark(for: .leftShoulder),
          let rightShoulder = frame.landmark(for: .rightShoulder) else {
        return 0
    }
    return calculateHorizontalRotation(leftPoint: leftShoulder, rightPoint: rightShoulder)
}

/// Calculate X-factor (difference between shoulder and hip rotation)
/// This is a key metric for power generation in the golf swing
func calculateXFactor(frame: PoseFrame) -> Double {
    let shoulderRotation = calculateShoulderRotation(frame: frame)
    let hipRotation = calculateHipRotation(frame: frame)
    return shoulderRotation - hipRotation
}

// MARK: - Body Width and Face-On Rotation

/// Calculate the horizontal width (X-distance) between two body parts
/// Used for face-on rotation detection via width narrowing
func calculateBodyWidth(frame: PoseFrame, bodyPart: BodyPart) -> CGFloat {
    let (leftJoint, rightJoint): (VisionJoint, VisionJoint) = bodyPart == .shoulders
        ? (.leftShoulder, .rightShoulder)
        : (.leftHip, .rightHip)

    guard let left = frame.landmark(for: leftJoint),
          let right = frame.landmark(for: rightJoint) else {
        return 0
    }

    return abs(right.x - left.x)
}

enum BodyPart {
    case shoulders
    case hips
}

/// Calculate rotation angle for face-on video using width narrowing
///
/// When a golfer rotates away from the camera:
/// - Shoulder/hip width appears to narrow
/// - At 90° rotation, width approaches zero (seen edge-on)
/// - Formula: rotation = acos(currentWidth / addressWidth) × (180/π)
///
/// Returns rotation in degrees (0 at address, increases as body turns)
func calculateRotationFromWidth(
    currentFrame: PoseFrame,
    addressFrame: PoseFrame,
    bodyPart: BodyPart
) -> Double {
    let addressWidth = calculateBodyWidth(frame: addressFrame, bodyPart: bodyPart)
    let currentWidth = calculateBodyWidth(frame: currentFrame, bodyPart: bodyPart)

    if addressWidth == 0 { return 0 }

    // Ratio of current to address width (1.0 = no rotation, 0.0 = 90° rotation)
    let widthRatio = max(0, min(1, currentWidth / addressWidth))

    // Convert ratio to angle
    let rotationRadians = acos(widthRatio)
    return rotationRadians * (180 / .pi)
}

// MARK: - Spine Angle Calculation

/// Calculate spine angle (forward tilt)
/// Returns angle in degrees from vertical
func calculateSpineAngle(frame: PoseFrame) -> Double {
    guard let leftShoulder = frame.landmark(for: .leftShoulder),
          let rightShoulder = frame.landmark(for: .rightShoulder),
          let leftHip = frame.landmark(for: .leftHip),
          let rightHip = frame.landmark(for: .rightHip) else {
        return 0
    }

    // Calculate midpoints
    let midShoulderX = (leftShoulder.x + rightShoulder.x) / 2
    let midShoulderY = (leftShoulder.y + rightShoulder.y) / 2
    let midHipX = (leftHip.x + rightHip.x) / 2
    let midHipY = (leftHip.y + rightHip.y) / 2

    // Calculate angle from vertical (Y-axis)
    let dx = midShoulderX - midHipX
    let dy = midShoulderY - midHipY

    // In Vision/MediaPipe, Y increases downward, so we adjust
    let angle = atan2(dx, -dy) * (180 / .pi)
    return angle
}

// MARK: - Arm Extension

/// Calculate arm extension (elbow angle)
/// Returns angle in degrees (180 = fully extended)
func calculateArmExtension(frame: PoseFrame, side: Side) -> Double {
    let (shoulderJoint, elbowJoint, wristJoint): (VisionJoint, VisionJoint, VisionJoint) = side == .left
        ? (.leftShoulder, .leftElbow, .leftWrist)
        : (.rightShoulder, .rightElbow, .rightWrist)

    guard let shoulder = frame.landmark(for: shoulderJoint),
          let elbow = frame.landmark(for: elbowJoint),
          let wrist = frame.landmark(for: wristJoint) else {
        return 180
    }

    return calculateAngle2D(pointA: shoulder, pointB: elbow, pointC: wrist)
}

enum Side {
    case left
    case right
}

// MARK: - Knee Flex

/// Calculate knee flex angle
/// Returns angle in degrees (180 = fully extended)
func calculateKneeFlex(frame: PoseFrame, side: Side) -> Double {
    let (hipJoint, kneeJoint, ankleJoint): (VisionJoint, VisionJoint, VisionJoint) = side == .left
        ? (.leftHip, .leftKnee, .leftAnkle)
        : (.rightHip, .rightKnee, .rightAnkle)

    guard let hip = frame.landmark(for: hipJoint),
          let knee = frame.landmark(for: kneeJoint),
          let ankle = frame.landmark(for: ankleJoint) else {
        return 180
    }

    return calculateAngle2D(pointA: hip, pointB: knee, pointC: ankle)
}

// MARK: - Hand Position

/// Estimate hand position relative to body (for club position inference)
/// Returns normalized coordinates relative to hip center
func getHandPosition(frame: PoseFrame, side: Side) -> (x: CGFloat, y: CGFloat, z: CGFloat) {
    let wristJoint: VisionJoint = side == .left ? .leftWrist : .rightWrist

    guard let leftHip = frame.landmark(for: .leftHip),
          let rightHip = frame.landmark(for: .rightHip),
          let wrist = frame.landmark(for: wristJoint) else {
        return (0, 0, 0)
    }

    let hipCenterX = (leftHip.x + rightHip.x) / 2
    let hipCenterY = (leftHip.y + rightHip.y) / 2
    let hipCenterZ = (leftHip.z + rightHip.z) / 2

    return (
        x: wrist.x - hipCenterX,
        y: wrist.y - hipCenterY,
        z: wrist.z - hipCenterZ
    )
}

// MARK: - Hip Sway (Face-On)

/// Calculate hip sway for face-on view
/// Measures how much the hip center moves horizontally during the swing
/// Returns normalized sway as a fraction of stance width (0-1 scale)
/// Lower values indicate less sway (better)
func calculateHipSway(frames: [PoseFrame], addressFrame: PoseFrame) -> Double {
    guard !frames.isEmpty else { return 0 }

    guard let leftHipAddr = addressFrame.landmark(for: .leftHip),
          let rightHipAddr = addressFrame.landmark(for: .rightHip),
          let leftAnkleAddr = addressFrame.landmark(for: .leftAnkle),
          let rightAnkleAddr = addressFrame.landmark(for: .rightAnkle) else {
        return 0
    }

    // Calculate address hip center X position
    let addressHipCenterX = (leftHipAddr.x + rightHipAddr.x) / 2

    // Calculate stance width for normalization
    let stanceWidth = abs(rightAnkleAddr.x - leftAnkleAddr.x)
    if stanceWidth == 0 { return 0 }

    // Track min and max hip center X positions throughout swing
    var minHipX = addressHipCenterX
    var maxHipX = addressHipCenterX

    for frame in frames {
        guard let leftHip = frame.landmark(for: .leftHip),
              let rightHip = frame.landmark(for: .rightHip) else {
            continue
        }

        let hipCenterX = (leftHip.x + rightHip.x) / 2
        minHipX = min(minHipX, hipCenterX)
        maxHipX = max(maxHipX, hipCenterX)
    }

    // Total sway distance normalized to stance width
    let swayDistance = maxHipX - minHipX
    return Double(swayDistance / stanceWidth)
}

// MARK: - Head Stability (Face-On)

/// Calculate head stability for face-on view
/// Measures how much the head moves from its address position
/// Returns normalized movement (0-1 scale, lower is better)
func calculateHeadStability(
    swingFrames: [PoseFrame],
    addressFrames: [PoseFrame],
    addressFrame: PoseFrame
) -> Double {
    guard !swingFrames.isEmpty else { return 0 }

    // Use nose as head reference point
    guard let noseAddr = addressFrame.landmark(for: .nose) else {
        return 0
    }

    // Calculate median body height across address phase frames
    var bodyHeights: [CGFloat] = []

    for frame in addressFrames {
        if let leftShoulder = frame.landmark(for: .leftShoulder),
           let leftAnkle = frame.landmark(for: .leftAnkle) {
            let height = abs(leftShoulder.y - leftAnkle.y)
            if height > 0 {
                bodyHeights.append(height)
            }
        }
    }

    guard !bodyHeights.isEmpty else { return 0 }

    // Use median for robustness
    bodyHeights.sort()
    let medianIndex = bodyHeights.count / 2
    let medianBodyHeight = bodyHeights.count % 2 == 0
        ? (bodyHeights[medianIndex - 1] + bodyHeights[medianIndex]) / 2
        : bodyHeights[medianIndex]

    if medianBodyHeight == 0 { return 0 }

    // Collect all deviations from address head position
    var deviations: [CGFloat] = []

    for frame in swingFrames {
        guard let nose = frame.landmark(for: .nose) else { continue }

        let dx = nose.x - noseAddr.x
        let dy = nose.y - noseAddr.y
        let deviation = sqrt(dx * dx + dy * dy)
        deviations.append(deviation)
    }

    guard !deviations.isEmpty else { return 0 }

    // Use 95th percentile to filter outliers
    deviations.sort()
    let percentile95Index = Int(Double(deviations.count) * 0.95)
    let percentile95Deviation = deviations[min(percentile95Index, deviations.count - 1)]

    return Double(percentile95Deviation / medianBodyHeight)
}

// MARK: - Frame Metrics

/// All swing metrics calculated from a single frame
struct FrameMetrics {
    let hipRotation: Double
    let shoulderRotation: Double
    let xFactor: Double
    let spineAngle: Double
    let leftArmExtension: Double
    let rightArmExtension: Double
    let leftKneeFlex: Double
    let rightKneeFlex: Double
    let leftHandPosition: (x: CGFloat, y: CGFloat, z: CGFloat)
    let rightHandPosition: (x: CGFloat, y: CGFloat, z: CGFloat)
}

func calculateFrameMetrics(frame: PoseFrame) -> FrameMetrics {
    return FrameMetrics(
        hipRotation: calculateHipRotation(frame: frame),
        shoulderRotation: calculateShoulderRotation(frame: frame),
        xFactor: calculateXFactor(frame: frame),
        spineAngle: calculateSpineAngle(frame: frame),
        leftArmExtension: calculateArmExtension(frame: frame, side: .left),
        rightArmExtension: calculateArmExtension(frame: frame, side: .right),
        leftKneeFlex: calculateKneeFlex(frame: frame, side: .left),
        rightKneeFlex: calculateKneeFlex(frame: frame, side: .right),
        leftHandPosition: getHandPosition(frame: frame, side: .left),
        rightHandPosition: getHandPosition(frame: frame, side: .right)
    )
}

// MARK: - Stance Ratio (Club Detection)

/// Calculate stance width ratio (stance width / hip width)
/// Driver stance is typically wider relative to hip width
func calculateStanceRatio(frame: PoseFrame) -> Double {
    guard let leftAnkle = frame.landmark(for: .leftAnkle),
          let rightAnkle = frame.landmark(for: .rightAnkle),
          let leftHip = frame.landmark(for: .leftHip),
          let rightHip = frame.landmark(for: .rightHip) else {
        return 1.0
    }

    let stanceWidth = abs(rightAnkle.x - leftAnkle.x)
    let hipWidth = abs(rightHip.x - leftHip.x)

    if hipWidth == 0 { return 1.0 }
    return Double(stanceWidth / hipWidth)
}
