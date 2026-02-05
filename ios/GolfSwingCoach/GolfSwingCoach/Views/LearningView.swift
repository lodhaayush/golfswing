import SwiftUI

struct LearningView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Setup") {
                    LearningRow(mistakeId: .poorPosture)
                    LearningRow(mistakeId: .stanceWidthIssue)
                }

                Section("Backswing") {
                    LearningRow(mistakeId: .reversePivot)
                    LearningRow(mistakeId: .insufficientShoulderTurn)
                    LearningRow(mistakeId: .overRotation)
                    LearningRow(mistakeId: .bentLeadArm)
                    LearningRow(mistakeId: .liftingHead)
                }

                Section("Downswing") {
                    LearningRow(mistakeId: .earlyExtension)
                    LearningRow(mistakeId: .hangingBack)
                    LearningRow(mistakeId: .lossOfSpineAngle)
                    LearningRow(mistakeId: .slidingHips)
                }

                Section("Impact") {
                    LearningRow(mistakeId: .chickenWing)
                    LearningRow(mistakeId: .poorArmExtension)
                    LearningRow(mistakeId: .headMovement)
                }

                Section("Follow-Through") {
                    LearningRow(mistakeId: .incompleteFollowThrough)
                    LearningRow(mistakeId: .unbalancedFinish)
                    LearningRow(mistakeId: .reverseCFinish)
                }

                Section("Tempo") {
                    LearningRow(mistakeId: .poorTempoRatio)
                }
            }
            .navigationTitle("Learn")
        }
    }
}

struct LearningRow: View {
    let mistakeId: SwingMistakeId
    @State private var isExpanded = false

    private var resource: LearningResource? {
        LearningResources.getResource(for: mistakeId)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row - tappable to expand
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack(spacing: 12) {
                    Image(systemName: iconForMistake)
                        .font(.title2)
                        .foregroundColor(.accentColor)
                        .frame(width: 40)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(mistakeId.displayName)
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text(descriptionForMistake)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    if resource != nil {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded, let resource = resource {
                VStack(alignment: .leading, spacing: 12) {
                    // Drill tip
                    if let tip = resource.drillTip {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "lightbulb.fill")
                                .foregroundColor(.yellow)
                                .font(.subheadline)
                            Text(tip)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 8)
                    }

                    // Resource buttons
                    HStack(spacing: 12) {
                        // YouTube buttons
                        ForEach(resource.youtubeLinks.indices, id: \.self) { index in
                            let link = resource.youtubeLinks[index]
                            Button(action: { URLOpener.openYouTube(url: link.url) }) {
                                Label(
                                    resource.youtubeLinks.count > 1 ? "Video \(index + 1)" : "Watch Video",
                                    systemImage: "play.rectangle.fill"
                                )
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.red.opacity(0.1))
                                .foregroundColor(.red)
                                .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                        }

                        // Article buttons
                        ForEach(resource.articleLinks.indices, id: \.self) { index in
                            let link = resource.articleLinks[index]
                            Button(action: { URLOpener.openArticle(url: link.url) }) {
                                Label(
                                    resource.articleLinks.count > 1 ? "Article \(index + 1)" : "Read Article",
                                    systemImage: "doc.text.fill"
                                )
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(.leading, 52) // Align with text above
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var iconForMistake: String {
        switch mistakeId {
        case .poorPosture:
            return "figure.stand"
        case .stanceWidthIssue:
            return "arrow.left.and.right"
        case .reversePivot:
            return "arrow.left.arrow.right"
        case .insufficientShoulderTurn:
            return "arrow.triangle.2.circlepath"
        case .overRotation:
            return "arrow.circlepath"
        case .bentLeadArm:
            return "figure.arms.open"
        case .liftingHead:
            return "arrow.up"
        case .earlyExtension:
            return "arrow.up.right"
        case .hangingBack:
            return "arrow.backward"
        case .lossOfSpineAngle:
            return "angle"
        case .slidingHips:
            return "arrow.left.and.right.circle"
        case .chickenWing:
            return "figure.arms.open"
        case .poorArmExtension:
            return "hand.raised"
        case .headMovement:
            return "eye"
        case .incompleteFollowThrough:
            return "arrow.turn.up.right"
        case .unbalancedFinish:
            return "figure.fall"
        case .reverseCFinish:
            return "arrow.uturn.backward"
        case .poorTempoRatio:
            return "metronome.fill"
        }
    }

    private var descriptionForMistake: String {
        switch mistakeId {
        case .poorPosture:
            return "Incorrect spine angle or posture at address"
        case .stanceWidthIssue:
            return "Stance too wide or too narrow for the club"
        case .reversePivot:
            return "Weight moving toward target in backswing"
        case .insufficientShoulderTurn:
            return "Not enough rotation in the backswing"
        case .overRotation:
            return "Rotating too far past parallel"
        case .bentLeadArm:
            return "Lead arm bending during backswing"
        case .liftingHead:
            return "Head rising during the swing"
        case .earlyExtension:
            return "Hips moving toward the ball during downswing"
        case .hangingBack:
            return "Weight staying on trail foot through impact"
        case .lossOfSpineAngle:
            return "Standing up or changing spine angle during swing"
        case .slidingHips:
            return "Hips sliding instead of rotating"
        case .chickenWing:
            return "Lead elbow bending through impact"
        case .poorArmExtension:
            return "Arms not extending fully at impact"
        case .headMovement:
            return "Excessive head movement during swing"
        case .incompleteFollowThrough:
            return "Not completing the swing to a full finish"
        case .unbalancedFinish:
            return "Unable to hold finish position"
        case .reverseCFinish:
            return "Leaning back with spine in reverse C shape"
        case .poorTempoRatio:
            return "Rushing the downswing or poor timing"
        }
    }
}
