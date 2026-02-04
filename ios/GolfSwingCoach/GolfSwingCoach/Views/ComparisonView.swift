import SwiftUI
import AVKit

/// Side-by-side comparison view for user swing vs pro swing
struct ComparisonView: View {
    let userVideoURL: URL?
    let userFrames: [PoseFrame]
    let userPhases: [PhaseSegment]
    var isUsingMockData: Bool = false

    @State private var selectedProSwing: ProSwing?
    @State private var currentPhase: SwingPhase = .address
    @State private var isPlaying = false
    @State private var userFrameIndex: Int = 0
    @State private var proFrameIndex: Int = 0
    @State private var showOverlay = true
    @State private var playTimer: Timer?

    // Available pro swings (would be bundled with app)
    private let proSwings: [ProSwing] = ProSwing.bundledSwings
    private let fps: Double = 15.0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let userVideoURL = userVideoURL {
                    // Comparison videos
                    HStack(spacing: 8) {
                        // User video
                        VStack {
                            Text("Your Swing")
                                .font(.caption)
                                .fontWeight(.semibold)

                            ZStack {
                                VideoThumbnailView(url: userVideoURL, frameIndex: userFrameIndex)

                                if showOverlay && userFrameIndex < userFrames.count {
                                    PoseOverlayView(
                                        frame: userFrames[userFrameIndex],
                                        videoSize: CGSize(width: 1080, height: 1920)
                                    )
                                }
                            }
                            .aspectRatio(9/16, contentMode: .fit)
                            .cornerRadius(8)
                            .overlay(alignment: .topTrailing) {
                                if isUsingMockData {
                                    MockDataBadge()
                                        .padding(4)
                                }
                            }
                        }

                        // Pro video
                        VStack {
                            Text(selectedProSwing?.name ?? "Select Pro")
                                .font(.caption)
                                .fontWeight(.semibold)

                            if let proSwing = selectedProSwing {
                                ZStack {
                                    // Pro video would show here
                                    Rectangle()
                                        .fill(Color(.systemGray5))

                                    if showOverlay && proFrameIndex < proSwing.frames.count {
                                        PoseOverlayView(
                                            frame: proSwing.frames[proFrameIndex],
                                            videoSize: CGSize(width: 1080, height: 1920)
                                        )
                                    }

                                    Image(systemName: "figure.golf")
                                        .font(.system(size: 40))
                                        .foregroundColor(.secondary)
                                }
                                .aspectRatio(9/16, contentMode: .fit)
                                .cornerRadius(8)
                            } else {
                                // Placeholder for pro selection
                                Rectangle()
                                    .fill(Color(.systemGray5))
                                    .aspectRatio(9/16, contentMode: .fit)
                                    .cornerRadius(8)
                                    .overlay {
                                        VStack {
                                            Image(systemName: "plus.circle")
                                                .font(.system(size: 40))
                                            Text("Select Pro")
                                                .font(.caption)
                                        }
                                        .foregroundColor(.secondary)
                                    }
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Phase selector
                    PhaseSelectorView(
                        phases: userPhases,
                        selectedPhase: .init(get: { currentPhase }, set: { if let p = $0 { currentPhase = p } }),
                        onPhaseSelected: { segment in
                            jumpToPhase(segment)
                        }
                    )
                    .padding(.vertical, 8)

                    // Controls
                    HStack(spacing: 24) {
                        // Step backward
                        Button {
                            stepFrame(forward: false)
                        } label: {
                            Image(systemName: "backward.frame.fill")
                                .font(.title2)
                        }

                        // Play/Pause synchronized
                        Button {
                            togglePlayback()
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

                    Spacer()
                } else {
                    // No video selected
                    VStack(spacing: 16) {
                        Image(systemName: "rectangle.split.2x1")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)

                        Text("Analyze a Swing First")
                            .font(.title2)
                            .fontWeight(.semibold)

                        Text("Upload and analyze a video to compare it with pro swings")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Compare")
            .toolbar {
                if userVideoURL != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            ForEach(proSwings) { pro in
                                Button {
                                    selectedProSwing = pro
                                } label: {
                                    Label(pro.name, systemImage: "figure.golf")
                                }
                            }
                        } label: {
                            Image(systemName: "person.2.fill")
                        }
                    }
                }
            }
        }
    }

    private func jumpToPhase(_ segment: PhaseSegment) {
        userFrameIndex = segment.startFrame

        // Sync pro to matching phase
        if let proSwing = selectedProSwing,
           let proSegment = proSwing.phases.first(where: { $0.phase == segment.phase }) {
            proFrameIndex = proSegment.startFrame
        }
    }

    private func stepFrame(forward: Bool) {
        if forward {
            if userFrameIndex < userFrames.count - 1 {
                userFrameIndex += 1
            }
            if let proSwing = selectedProSwing, proFrameIndex < proSwing.frames.count - 1 {
                proFrameIndex += 1
            }
        } else {
            if userFrameIndex > 0 {
                userFrameIndex -= 1
            }
            if proFrameIndex > 0 {
                proFrameIndex -= 1
            }
        }
    }

    private func togglePlayback() {
        if isPlaying {
            stopPlayback()
        } else {
            startPlayback()
        }
    }

    private func startPlayback() {
        // If at end, restart from beginning
        if userFrameIndex >= userFrames.count - 1 {
            userFrameIndex = 0
            proFrameIndex = 0
        }

        isPlaying = true
        playTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / fps, repeats: true) { _ in
            Task { @MainActor in
                if userFrameIndex < userFrames.count - 1 {
                    userFrameIndex += 1
                    if let proSwing = selectedProSwing, proFrameIndex < proSwing.frames.count - 1 {
                        proFrameIndex += 1
                    }
                } else {
                    // Reached end, stop playback
                    stopPlayback()
                }
            }
        }
    }

    private func stopPlayback() {
        isPlaying = false
        playTimer?.invalidate()
        playTimer = nil
    }
}

/// Simple video thumbnail view for comparison
struct VideoThumbnailView: View {
    let url: URL
    let frameIndex: Int

    @State private var image: Image?
    @State private var loadedFrameIndex: Int = -1

    var body: some View {
        ZStack {
            if let image = image {
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                Rectangle()
                    .fill(Color(.systemGray5))
            }
        }
        .task(id: frameIndex) {
            await loadThumbnail()
        }
    }

    private func loadThumbnail() async {
        // Skip if already loaded this frame
        guard frameIndex != loadedFrameIndex else { return }

        let asset = AVAsset(url: url)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero

        let time = CMTime(seconds: Double(frameIndex) / 15.0, preferredTimescale: 600)

        do {
            let (cgImage, _) = try await generator.image(at: time)
            await MainActor.run {
                self.image = Image(decorative: cgImage, scale: 1.0)
                self.loadedFrameIndex = frameIndex
            }
        } catch {
            // Failed to load thumbnail
        }
    }
}

// MARK: - Pro Swing Model

/// Represents a pro golfer's swing data bundled with the app
struct ProSwing: Identifiable {
    let id: String
    let name: String
    let clubType: ClubType
    let cameraAngle: CameraAngle
    let frames: [PoseFrame]
    let phases: [PhaseSegment]

    /// Bundled pro swings (placeholder - would be loaded from app bundle)
    static let bundledSwings: [ProSwing] = [
        // These would be loaded from JSON files in the app bundle
        ProSwing(
            id: "tiger_driver",
            name: "Tiger Woods - Driver",
            clubType: .driver,
            cameraAngle: .faceOn,
            frames: [],  // Would be loaded from bundle
            phases: []
        ),
        ProSwing(
            id: "rory_iron",
            name: "Rory McIlroy - Iron",
            clubType: .iron,
            cameraAngle: .faceOn,
            frames: [],
            phases: []
        ),
    ]
}

