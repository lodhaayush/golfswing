import SwiftUI

struct ContentView: View {
    @State private var selectedTab: Tab = .upload
    @StateObject private var appState = AppState()

    enum Tab {
        case upload
        case compare
        case results
        case learn
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            VideoUploadView()
                .environmentObject(appState)
                .tabItem {
                    Label("Analyze", systemImage: "video.badge.waveform")
                }
                .tag(Tab.upload)

            ComparisonView(
                userVideoURL: appState.lastAnalyzedVideoURL,
                userFrames: appState.lastAnalysisResult?.frames ?? [],
                userPhases: appState.lastAnalysisResult?.phases ?? []
            )
            .tabItem {
                Label("Compare", systemImage: "rectangle.split.2x1")
            }
            .tag(Tab.compare)

            ResultsView()
                .environmentObject(appState)
                .tabItem {
                    Label("Results", systemImage: "chart.bar.fill")
                }
                .tag(Tab.results)

            LearningView()
                .tabItem {
                    Label("Learn", systemImage: "book.fill")
                }
                .tag(Tab.learn)
        }
    }
}

/// Shared app state for passing data between views
class AppState: ObservableObject {
    @Published var lastAnalyzedVideoURL: URL?
    @Published var lastAnalysisResult: AnalysisResult?
    @Published var isUsingMockData: Bool = false
}

