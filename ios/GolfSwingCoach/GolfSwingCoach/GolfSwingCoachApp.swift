import SwiftUI

@main
struct GolfSwingCoachApp: App {
    init() {
        LoggerSetup.configure()
        log.info("App Started")
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
