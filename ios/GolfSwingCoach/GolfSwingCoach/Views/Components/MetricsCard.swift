import SwiftUI

struct MetricsCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct MistakeCard: View {
    let mistake: DetectorResult
    @State private var isExpanded = false

    private var resource: LearningResource? {
        LearningResources.getResource(for: mistake.mistakeId)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(severityColor)
                    .frame(width: 12, height: 12)

                Text(mistake.mistakeId.displayName)
                    .font(.headline)

                Spacer()

                Text(severityText)
                    .font(.caption)
                    .foregroundColor(severityColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(severityColor.opacity(0.1))
                    .cornerRadius(8)
            }

            Text(mistake.message)
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Learn More section
            if let resource = resource {
                Divider()
                    .padding(.vertical, 4)

                // Drill tip if available
                if let tip = resource.drillTip {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "lightbulb.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        Text(tip)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.bottom, 4)
                }

                // Resource buttons
                HStack(spacing: 8) {
                    ForEach(resource.youtubeLinks.indices, id: \.self) { index in
                        let link = resource.youtubeLinks[index]
                        Button(action: { URLOpener.openYouTube(url: link.url) }) {
                            Label(
                                resource.youtubeLinks.count > 1 ? "Video \(index + 1)" : "Watch Video",
                                systemImage: "play.rectangle.fill"
                            )
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.red.opacity(0.1))
                            .foregroundColor(.red)
                            .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }

                    ForEach(resource.articleLinks.indices, id: \.self) { index in
                        let link = resource.articleLinks[index]
                        Button(action: { URLOpener.openArticle(url: link.url) }) {
                            Label(
                                resource.articleLinks.count > 1 ? "Article \(index + 1)" : "Read Article",
                                systemImage: "doc.text.fill"
                            )
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var severityColor: Color {
        switch mistake.severity {
        case 70...:
            return .red
        case 40..<70:
            return .orange
        default:
            return .yellow
        }
    }

    private var severityText: String {
        switch mistake.severity {
        case 70...:
            return "High"
        case 40..<70:
            return "Medium"
        default:
            return "Low"
        }
    }
}

