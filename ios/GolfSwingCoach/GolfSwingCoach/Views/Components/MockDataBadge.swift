import SwiftUI

/// Badge indicator shown when using mock pose data (e.g., on iOS Simulator)
struct MockDataBadge: View {
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "exclamationmark.triangle.fill")
            Text("Mock Data")
        }
        .font(.caption2.bold())
        .foregroundColor(.orange)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.orange.opacity(0.2))
        .cornerRadius(4)
    }
}
