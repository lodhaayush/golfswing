import SwiftUI

struct ResultsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            if let result = appState.lastAnalysisResult {
                ResultsDetailView(result: result)
            } else {
                VStack {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)
                        .padding()

                    Text("No Results Yet")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("Analyze a swing video to see your results here")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .navigationTitle("Results")
            }
        }
    }
}

struct ResultsDetailView: View {
    let result: AnalysisResult

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Score card
                VStack {
                    Text("Overall Score")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    Text("\(Int(result.overallScore))")
                        .font(.system(size: 72, weight: .bold))
                        .foregroundColor(scoreColor(result.overallScore))
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(16)
                .padding(.horizontal)

                // Metrics section
                if let metrics = result.metrics {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Metrics")
                            .font(.headline)
                            .padding(.horizontal)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            MetricsCard(title: "Shoulder Turn", value: "\(Int(metrics.maxShoulderRotation))°")
                            MetricsCard(title: "Hip Turn", value: "\(Int(metrics.maxHipRotation))°")
                            MetricsCard(title: "X-Factor", value: "\(Int(metrics.maxXFactor))°")
                            MetricsCard(title: "Tempo", value: String(format: "%.1f:1", result.tempo.tempoRatio))
                        }
                        .padding(.horizontal)
                    }
                }

                // Detected mistakes
                if !result.detectedMistakes.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Areas to Improve")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(result.detectedMistakes, id: \.mistakeId) { mistake in
                            MistakeCard(mistake: mistake)
                                .padding(.horizontal)
                        }
                    }
                }

                Spacer()
            }
            .padding(.vertical)
        }
        .navigationTitle("Analysis Results")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func scoreColor(_ score: Double) -> Color {
        switch score {
        case 80...:
            return .green
        case 60..<80:
            return .yellow
        default:
            return .red
        }
    }
}

