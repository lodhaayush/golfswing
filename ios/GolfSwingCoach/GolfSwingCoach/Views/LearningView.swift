import SwiftUI

struct LearningView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Common Swing Faults") {
                    LearningRow(
                        title: "Early Extension",
                        description: "Hips moving toward the ball during downswing",
                        systemImage: "arrow.up.right"
                    )

                    LearningRow(
                        title: "Chicken Wing",
                        description: "Lead elbow bending through impact",
                        systemImage: "figure.arms.open"
                    )

                    LearningRow(
                        title: "Reverse Pivot",
                        description: "Weight moving toward target in backswing",
                        systemImage: "arrow.left.arrow.right"
                    )

                    LearningRow(
                        title: "Over the Top",
                        description: "Club coming down outside-in",
                        systemImage: "arrow.turn.down.right"
                    )
                }

                Section("Fundamentals") {
                    LearningRow(
                        title: "Grip",
                        description: "How to hold the club properly",
                        systemImage: "hand.raised.fill"
                    )

                    LearningRow(
                        title: "Stance & Posture",
                        description: "Setting up for success",
                        systemImage: "figure.stand"
                    )

                    LearningRow(
                        title: "Tempo",
                        description: "The rhythm of a good swing",
                        systemImage: "metronome.fill"
                    )
                }
            }
            .navigationTitle("Learn")
        }
    }
}

struct LearningRow: View {
    let title: String
    let description: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundColor(.accentColor)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

