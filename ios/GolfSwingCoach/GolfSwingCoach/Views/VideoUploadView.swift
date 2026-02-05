import SwiftUI
import PhotosUI
import AVKit

struct VideoUploadView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = VideoAnalysisViewModel()
    @State private var selectedItem: PhotosPickerItem?

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
                        } else if viewModel.analysisResult == nil {
                            Button("Analyze Swing") {
                                Task {
                                    await viewModel.analyzeVideo()
                                    // Store result in app state for other tabs
                                    if let result = viewModel.analysisResult {
                                        appState.lastAnalysisResult = result
                                        appState.lastAnalyzedVideoURL = viewModel.selectedVideoURL
                                        appState.selectedTab = .results
                                    }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                        }

                        Button("Select Different Video") {
                            viewModel.reset()
                            selectedItem = nil
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
}

struct VideoPreviewView: View {
    let url: URL
    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var showControls = true
    @State private var hideTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            // Video player without system controls
            VideoPlayerLayer(player: player)
                .onAppear {
                    player = AVPlayer(url: url)
                    scheduleHideControls()
                }
                .onDisappear {
                    player?.pause()
                }

            // Custom controls overlay
            Color.black.opacity(0.001) // Nearly invisible but captures taps
                .contentShape(Rectangle())
                .onTapGesture {
                    if showControls {
                        // Toggle play/pause when controls visible
                        togglePlayPause()
                    }
                    showControlsTemporarily()
                }

            // Play/pause button
            if showControls {
                Circle()
                    .fill(Color.black.opacity(0.5))
                    .frame(width: 48, height: 48)
                    .overlay(
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(.white)
                            .offset(x: isPlaying ? 0 : 1) // Optical centering for play icon
                    )
                    .allowsHitTesting(false)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showControls)
        .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)) { notification in
            // Check if this notification is for our player's item
            guard let playerItem = notification.object as? AVPlayerItem,
                  playerItem == player?.currentItem else { return }

            // Just update state, don't seek
            isPlaying = false
            showControlsTemporarily()
        }
    }

    private func togglePlayPause() {
        guard let player = player else { return }
        if isPlaying {
            player.pause()
        } else {
            // If at end of video, seek to start before playing
            if let duration = player.currentItem?.duration,
               let currentTime = player.currentItem?.currentTime(),
               CMTimeCompare(currentTime, duration) >= 0 {
                player.seek(to: .zero)
            }
            player.play()
        }
        isPlaying.toggle()
    }

    private func showControlsTemporarily() {
        showControls = true
        scheduleHideControls()
    }

    private func scheduleHideControls() {
        hideTask?.cancel()
        hideTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            if !Task.isCancelled {
                showControls = false
            }
        }
    }
}

struct VideoPlayerLayer: UIViewRepresentable {
    let player: AVPlayer?

    func makeUIView(context: Context) -> PlayerUIView {
        PlayerUIView()
    }

    func updateUIView(_ uiView: PlayerUIView, context: Context) {
        uiView.player = player
    }
}

class PlayerUIView: UIView {
    var player: AVPlayer? {
        didSet {
            playerLayer.player = player
        }
    }

    private var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    override class var layerClass: AnyClass {
        AVPlayerLayer.self
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        playerLayer.videoGravity = .resizeAspect
        backgroundColor = .black
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
