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

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                VStack(spacing: 0) {
                    if let userVideoURL = userVideoURL {
                        // Calculate video dimensions to fit side by side
                        let horizontalPadding: CGFloat = 16 * 2
                        let spacing: CGFloat = 8
                        let availableWidth = geometry.size.width - horizontalPadding - spacing
                        let videoWidth = availableWidth / 2
                        let videoHeight = min(geometry.size.height * 0.6, videoWidth * (16/9))

                        HStack(spacing: 8) {
                            // User video
                            VStack {
                                Text("Your Swing")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)

                                ZStack {
                                    VideoThumbnailView(url: userVideoURL, frameIndex: userFrameIndex)

                                    if showOverlay && userFrameIndex < userFrames.count {
                                        PoseOverlayView(
                                            frame: userFrames[userFrameIndex],
                                            videoSize: CGSize(width: 1080, height: 1920)
                                        )
                                    }
                                }
                                .frame(width: videoWidth, height: videoHeight)
                                .clipped()
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
                                    .lineLimit(2)
                                    .multilineTextAlignment(.center)

                                if let proSwing = selectedProSwing {
                                    ZStack {
                                        if let proVideoURL = proSwing.videoURL {
                                            VideoThumbnailView(url: proVideoURL, frameIndex: proFrameIndex)
                                        } else {
                                            Rectangle()
                                                .fill(Color(.systemGray5))
                                            Image(systemName: "figure.golf")
                                                .font(.system(size: 40))
                                                .foregroundColor(.secondary)
                                        }

                                        if showOverlay && proFrameIndex < proSwing.frames.count {
                                            PoseOverlayView(
                                                frame: proSwing.frames[proFrameIndex],
                                                videoSize: CGSize(width: 1080, height: 1920)
                                            )
                                        }
                                    }
                                    .frame(width: videoWidth, height: videoHeight)
                                    .clipped()
                                    .cornerRadius(8)
                                } else {
                                    // Placeholder for pro selection
                                    Menu {
                                        ForEach(proSwings) { pro in
                                            Button {
                                                selectedProSwing = pro
                                            } label: {
                                                Label(pro.name, systemImage: "figure.golf")
                                            }
                                        }
                                    } label: {
                                        Rectangle()
                                            .fill(Color(.systemGray5))
                                            .frame(width: videoWidth, height: videoHeight)
                                            .clipped()
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
            .onChange(of: selectedProSwing?.id) { _, _ in
                // Reset pro frame index when switching pro videos
                proFrameIndex = 0
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
            if let proSwing = selectedProSwing, proFrameIndex < proSwing.frameCount - 1 {
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
        playTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 15.0, repeats: true) { _ in
            Task { @MainActor in
                if userFrameIndex < userFrames.count - 1 {
                    userFrameIndex += 1
                    if let proSwing = selectedProSwing, proFrameIndex < proSwing.frameCount - 1 {
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
    let videoFileName: String
    let frames: [PoseFrame]
    let phases: [PhaseSegment]

    /// URL to the bundled video file
    var videoURL: URL? {
        Bundle.main.url(forResource: videoFileName, withExtension: "mov", subdirectory: "ProVideos")
    }

    /// Total frame count derived from phase segments
    var frameCount: Int {
        phases.map { $0.endFrame }.max() ?? 0
    }

    /// Bundled pro swings with pre-analyzed phase data
    static let bundledSwings: [ProSwing] = [
        ProSwing(
            id: "pro-faceon-driver",
            name: "Tiger Woods - Driver",
            clubType: .driver,
            cameraAngle: .faceOn,
            videoFileName: "pro-faceon-driver",
            frames: [],
            phases: [
                PhaseSegment(phase: .address, startFrame: 0, endFrame: 10, startTime: 0, endTime: 0.667),
                PhaseSegment(phase: .backswing, startFrame: 11, endFrame: 32, startTime: 0.733, endTime: 2.133),
                PhaseSegment(phase: .top, startFrame: 33, endFrame: 34, startTime: 2.2, endTime: 2.267),
                PhaseSegment(phase: .downswing, startFrame: 35, endFrame: 41, startTime: 2.333, endTime: 2.733),
                PhaseSegment(phase: .impact, startFrame: 42, endFrame: 43, startTime: 2.8, endTime: 2.867),
                PhaseSegment(phase: .followThrough, startFrame: 44, endFrame: 48, startTime: 2.933, endTime: 3.2),
                PhaseSegment(phase: .finish, startFrame: 49, endFrame: 57, startTime: 3.267, endTime: 3.8),
            ]
        ),
        ProSwing(
            id: "pro-faceon-iron",
            name: "Rory McIlroy - Iron",
            clubType: .iron,
            cameraAngle: .faceOn,
            videoFileName: "pro-faceon-iron",
            frames: [],
            phases: [
                PhaseSegment(phase: .address, startFrame: 0, endFrame: 8, startTime: 0, endTime: 0.6),
                PhaseSegment(phase: .backswing, startFrame: 9, endFrame: 15, startTime: 0.6, endTime: 1.067),
                PhaseSegment(phase: .top, startFrame: 16, endFrame: 17, startTime: 1.067, endTime: 1.2),
                PhaseSegment(phase: .downswing, startFrame: 18, endFrame: 19, startTime: 1.2, endTime: 1.333),
                PhaseSegment(phase: .impact, startFrame: 20, endFrame: 21, startTime: 1.333, endTime: 1.467),
                PhaseSegment(phase: .followThrough, startFrame: 22, endFrame: 32, startTime: 1.467, endTime: 2.2),
                PhaseSegment(phase: .finish, startFrame: 33, endFrame: 38, startTime: 2.2, endTime: 2.533),
            ]
        ),
        ProSwing(
            id: "pro-dtl-driver",
            name: "Tiger Woods - Driver (DTL)",
            clubType: .driver,
            cameraAngle: .dtl,
            videoFileName: "pro-dtl-driver",
            frames: [],
            phases: [
                PhaseSegment(phase: .address, startFrame: 0, endFrame: 25, startTime: 0, endTime: 1.667),
                PhaseSegment(phase: .backswing, startFrame: 26, endFrame: 45, startTime: 1.733, endTime: 3.0),
                PhaseSegment(phase: .top, startFrame: 46, endFrame: 47, startTime: 3.067, endTime: 3.133),
                PhaseSegment(phase: .downswing, startFrame: 48, endFrame: 54, startTime: 3.2, endTime: 3.6),
                PhaseSegment(phase: .impact, startFrame: 55, endFrame: 56, startTime: 3.667, endTime: 3.733),
                PhaseSegment(phase: .followThrough, startFrame: 57, endFrame: 65, startTime: 3.8, endTime: 4.333),
                PhaseSegment(phase: .finish, startFrame: 66, endFrame: 77, startTime: 4.4, endTime: 5.133),
            ]
        ),
        ProSwing(
            id: "pro-dtl-iron",
            name: "Justin Rose - Iron (DTL)",
            clubType: .iron,
            cameraAngle: .dtl,
            videoFileName: "pro-dtl-iron",
            frames: [],
            phases: [
                PhaseSegment(phase: .address, startFrame: 0, endFrame: 6, startTime: 0, endTime: 0.467),
                PhaseSegment(phase: .backswing, startFrame: 7, endFrame: 16, startTime: 0.467, endTime: 1.133),
                PhaseSegment(phase: .top, startFrame: 17, endFrame: 18, startTime: 1.133, endTime: 1.267),
                PhaseSegment(phase: .downswing, startFrame: 19, endFrame: 21, startTime: 1.267, endTime: 1.467),
                PhaseSegment(phase: .impact, startFrame: 22, endFrame: 23, startTime: 1.467, endTime: 1.6),
                PhaseSegment(phase: .followThrough, startFrame: 24, endFrame: 37, startTime: 1.6, endTime: 2.533),
                PhaseSegment(phase: .finish, startFrame: 38, endFrame: 44, startTime: 2.533, endTime: 2.933),
            ]
        ),
    ]
}

