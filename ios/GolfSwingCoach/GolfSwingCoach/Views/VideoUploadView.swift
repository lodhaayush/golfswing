import SwiftUI
import PhotosUI
import AVKit

struct VideoUploadView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = VideoAnalysisViewModel()
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedClubType: ClubType?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let videoURL = viewModel.selectedVideoURL {
                    // Video preview
                    VideoPreviewView(url: videoURL)
                        .frame(height: 300)
                        .cornerRadius(12)
                        .padding(.horizontal)

                    // Analysis controls
                    VStack(spacing: 16) {
                        if viewModel.isAnalyzing {
                            ProgressView(value: viewModel.analysisProgress) {
                                Text("Analyzing swing...")
                            }
                            .padding(.horizontal)
                        } else if let result = viewModel.analysisResult {
                            // Show score
                            VStack {
                                Text("Score")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                Text("\(Int(result.overallScore))")
                                    .font(.system(size: 72, weight: .bold))
                                    .foregroundColor(scoreColor(result.overallScore))
                            }

                            // Club type picker for override
                            ClubTypePickerView(
                                detectedClubType: result.clubType,
                                selectedClubType: $selectedClubType,
                                onReanalyze: { clubType in
                                    Task {
                                        await viewModel.reanalyzeWithClubType(clubType)
                                        if let newResult = viewModel.analysisResult {
                                            appState.lastAnalysisResult = newResult
                                        }
                                    }
                                }
                            )

                            Button("View Details") {
                                appState.selectedTab = .results
                            }
                            .buttonStyle(.borderedProminent)
                        } else {
                            Button("Analyze Swing") {
                                Task {
                                    await viewModel.analyzeVideo()
                                    // Store result in app state for other tabs
                                    if let result = viewModel.analysisResult {
                                        appState.lastAnalysisResult = result
                                        appState.lastAnalyzedVideoURL = viewModel.selectedVideoURL
                                        selectedClubType = result.clubType
                                    }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                        }

                        Button("Select Different Video") {
                            viewModel.reset()
                            selectedItem = nil
                            selectedClubType = nil
                            appState.lastAnalysisResult = nil
                            appState.lastAnalyzedVideoURL = nil
                            appState.isUsingMockData = false
                        }
                        .foregroundColor(.secondary)
                    }
                } else {
                    // Upload prompt
                    VStack(spacing: 24) {
                        Image(systemName: "figure.golf")
                            .font(.system(size: 80))
                            .foregroundColor(.accentColor)

                        Text("Golf Swing Coach")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Upload a video of your golf swing to get instant AI-powered feedback")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        PhotosPicker(
                            selection: $selectedItem,
                            matching: .videos,
                            photoLibrary: .shared()
                        ) {
                            Label("Select Video", systemImage: "video.badge.plus")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.accentColor)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                        .padding(.horizontal, 40)
                    }
                    .padding()
                }
            }
            .navigationTitle("Analyze")
            .onChange(of: selectedItem) { _, newItem in
                Task {
                    await viewModel.loadVideo(from: newItem)
                }
            }
            .onChange(of: viewModel.analysisResult) { _, newResult in
                // Update app state when analysis completes
                if let result = newResult {
                    appState.lastAnalysisResult = result
                    appState.lastAnalyzedVideoURL = viewModel.selectedVideoURL
                    appState.isUsingMockData = viewModel.isUsingMockData
                }
            }
        }
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

struct VideoPreviewView: View {
    let url: URL
    @State private var player: AVPlayer?

    var body: some View {
        VideoPlayer(player: player)
            .onAppear {
                player = AVPlayer(url: url)
            }
            .onDisappear {
                player?.pause()
            }
    }
}

/// Club type picker for overriding auto-detected club type
struct ClubTypePickerView: View {
    let detectedClubType: ClubType
    @Binding var selectedClubType: ClubType?
    let onReanalyze: (ClubType) -> Void

    private var displayClubType: ClubType {
        selectedClubType ?? detectedClubType
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Club Type:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Picker("Club Type", selection: Binding(
                    get: { displayClubType },
                    set: { newValue in
                        if newValue != displayClubType {
                            selectedClubType = newValue
                            onReanalyze(newValue)
                        }
                    }
                )) {
                    Text("Driver").tag(ClubType.driver)
                    Text("Iron").tag(ClubType.iron)
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
            }

            if selectedClubType != nil && selectedClubType != detectedClubType {
                Text("Auto-detected: \(detectedClubType.displayName)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}

