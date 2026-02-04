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

