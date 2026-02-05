import SwiftUI
import PhotosUI
import AVFoundation

@MainActor
class VideoAnalysisViewModel: ObservableObject {
    @Published var selectedVideoURL: URL?
    @Published var isAnalyzing = false
    @Published var analysisProgress: Double = 0
    @Published var analysisResult: AnalysisResult?
    @Published var error: String?

    private let poseDetectionService = PoseDetectionService()
    private let swingAnalyzer = SwingAnalyzer()

    /// Cached pose frames from the last video analysis (for re-analysis with different settings)
    private var cachedFrames: [PoseFrame]?

    /// Whether pose detection is using mock data (e.g., on iOS Simulator)
    var isUsingMockData: Bool {
        poseDetectionService.isUsingMockData
    }

    func loadVideo(from item: PhotosPickerItem?) async {
        guard let item = item else { return }

        do {
            // Load video data from PhotosPicker
            guard let movie = try await item.loadTransferable(type: VideoTransferable.self) else {
                error = "Could not load video"
                return
            }

            selectedVideoURL = movie.url
            analysisResult = nil
            error = nil
        } catch {
            self.error = "Error loading video: \(error.localizedDescription)"
        }
    }

    func analyzeVideo() async {
        guard let videoURL = selectedVideoURL else { return }

        isAnalyzing = true
        analysisProgress = 0
        error = nil

        do {
            // Step 1: Extract poses from video (0-70% progress)
            let frames = try await poseDetectionService.detectPoses(
                in: videoURL,
                progress: { [weak self] progress in
                    Task { @MainActor in
                        self?.analysisProgress = progress * 0.7
                    }
                }
            )

            // Cache frames for potential re-analysis
            cachedFrames = frames
            analysisProgress = 0.7

            // Step 2: Analyze swing (70-100% progress)
            let result = try await swingAnalyzer.analyze(
                frames: frames,
                progress: { [weak self] progress in
                    Task { @MainActor in
                        self?.analysisProgress = 0.7 + (progress * 0.3)
                    }
                }
            )

            analysisProgress = 1.0
            analysisResult = result

        } catch {
            self.error = "Analysis failed: \(error.localizedDescription)"
        }

        isAnalyzing = false
    }

    /// Re-analyze the video with a club type override (uses cached pose frames)
    func reanalyzeWithClubType(_ clubType: ClubType) async {
        guard let frames = cachedFrames else {
            error = "No cached frames available. Please re-upload the video."
            return
        }

        isAnalyzing = true
        analysisProgress = 0
        error = nil

        do {
            // Skip pose extraction, go straight to analysis with override
            let result = try await swingAnalyzer.analyze(
                frames: frames,
                clubTypeOverride: clubType,
                progress: { [weak self] progress in
                    Task { @MainActor in
                        self?.analysisProgress = progress
                    }
                }
            )

            analysisProgress = 1.0
            analysisResult = result

        } catch {
            self.error = "Re-analysis failed: \(error.localizedDescription)"
        }

        isAnalyzing = false
    }

    func reset() {
        selectedVideoURL = nil
        analysisResult = nil
        analysisProgress = 0
        error = nil
        cachedFrames = nil
    }
}

/// Transferable for loading videos from PhotosPicker
struct VideoTransferable: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(contentType: .movie) { video in
            SentTransferredFile(video.url)
        } importing: { received in
            // Copy to a temporary location
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension("mov")

            try FileManager.default.copyItem(at: received.file, to: tempURL)
            return VideoTransferable(url: tempURL)
        }
    }
}
