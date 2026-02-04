import SwiftUI
import AVKit

/// Full-featured video player with pose overlay and controls
struct VideoPlayerView: View {
    let videoURL: URL
    let frames: [PoseFrame]
    @Binding var currentFrameIndex: Int

    @State private var player: AVPlayer?
    @State private var isPlaying = false
    @State private var duration: Double = 0
    @State private var currentTime: Double = 0
    @State private var showOverlay = true

    private let fps: Double = 15.0

    var body: some View {
        VStack(spacing: 0) {
            // Video with overlay
            ZStack {
                if let player = player {
                    VideoPlayer(player: player)
                        .disabled(true)  // Disable built-in controls
                }

                if showOverlay, currentFrameIndex < frames.count {
                    PoseOverlayView(
                        frame: frames[currentFrameIndex],
                        videoSize: CGSize(width: 1080, height: 1920)
                    )
                }
            }
            .aspectRatio(9/16, contentMode: .fit)
            .cornerRadius(12)
            .clipped()

            // Scrubber
            VStack(spacing: 8) {
                Slider(value: $currentTime, in: 0...max(duration, 0.1)) { editing in
                    if !editing {
                        seekToTime(currentTime)
                    }
                }
                .tint(.accentColor)

                HStack {
                    Text(formatTime(currentTime))
                        .font(.caption)
                        .monospacedDigit()

                    Spacer()

                    Text(formatTime(duration))
                        .font(.caption)
                        .monospacedDigit()
                }
                .foregroundColor(.secondary)
            }
            .padding(.horizontal)
            .padding(.top, 8)

            // Controls
            HStack(spacing: 24) {
                // Step backward
                Button {
                    stepFrame(forward: false)
                } label: {
                    Image(systemName: "backward.frame.fill")
                        .font(.title2)
                }

                // Play/Pause
                Button {
                    togglePlayPause()
                } label: {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.title)
                }
                .frame(width: 60)

                // Step forward
                Button {
                    stepFrame(forward: true)
                } label: {
                    Image(systemName: "forward.frame.fill")
                        .font(.title2)
                }

                Spacer()

                // Toggle overlay
                Button {
                    showOverlay.toggle()
                } label: {
                    Image(systemName: showOverlay ? "figure.stand" : "figure.stand.line.dotted.figure.stand")
                        .font(.title3)
                }
                .foregroundColor(showOverlay ? .accentColor : .secondary)
            }
            .padding()
        }
        .onAppear {
            setupPlayer()
        }
        .onDisappear {
            player?.pause()
        }
        .onChange(of: currentTime) { _, newTime in
            updateCurrentFrame(for: newTime)
        }
    }

    // MARK: - Setup

    private func setupPlayer() {
        let playerItem = AVPlayerItem(url: videoURL)
        player = AVPlayer(playerItem: playerItem)

        // Get duration
        Task {
            if let duration = try? await playerItem.asset.load(.duration) {
                await MainActor.run {
                    self.duration = CMTimeGetSeconds(duration)
                }
            }
        }

        // Add time observer
        player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 1/30, preferredTimescale: 600), queue: .main) { time in
            guard !isPlaying else { return }  // Only update when playing
            self.currentTime = CMTimeGetSeconds(time)
        }
    }

    // MARK: - Playback Controls

    private func togglePlayPause() {
        if isPlaying {
            player?.pause()
        } else {
            player?.play()
        }
        isPlaying.toggle()
    }

    private func stepFrame(forward: Bool) {
        player?.pause()
        isPlaying = false

        let frameDuration = 1.0 / fps
        let newTime = forward
            ? min(currentTime + frameDuration, duration)
            : max(currentTime - frameDuration, 0)

        seekToTime(newTime)
    }

    private func seekToTime(_ time: Double) {
        let cmTime = CMTime(seconds: time, preferredTimescale: 600)
        player?.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero)
        currentTime = time
    }

    private func updateCurrentFrame(for time: Double) {
        let frameIndex = Int(time * fps)
        if frameIndex >= 0 && frameIndex < frames.count && frameIndex != currentFrameIndex {
            currentFrameIndex = frameIndex
        }
    }

    // MARK: - Formatting

    private func formatTime(_ seconds: Double) -> String {
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        let fraction = Int((seconds.truncatingRemainder(dividingBy: 1)) * 10)
        return String(format: "%d:%02d.%d", mins, secs, fraction)
    }
}

/// Phase selector bar for jumping between swing phases
struct PhaseSelectorView: View {
    let phases: [PhaseSegment]
    @Binding var selectedPhase: SwingPhase?
    let onPhaseSelected: (PhaseSegment) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(phases, id: \.phase) { segment in
                    PhaseButton(
                        phase: segment.phase,
                        isSelected: selectedPhase == segment.phase
                    ) {
                        selectedPhase = segment.phase
                        onPhaseSelected(segment)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
}

struct PhaseButton: View {
    let phase: SwingPhase
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(phase.displayName)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

