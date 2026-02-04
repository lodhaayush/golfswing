import Foundation

// MARK: - Custom Debug Logger

/// A simple file-based logger similar to the web implementation
final class DebugLogger: @unchecked Sendable {
    static let shared = DebugLogger()

    private let fileQueue = DispatchQueue(label: "com.golfswing.debuglogger", qos: .utility)
    private let dateFormatter: ISO8601DateFormatter

    var logFileURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("debug.log")
    }

    private init() {
        dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

    func clearLog() {
        let header = """
        ================================================================================
        Golf Swing Coach iOS Debug Log
        Started: \(dateFormatter.string(from: Date()))
        ================================================================================

        """
        try? header.write(to: logFileURL, atomically: true, encoding: .utf8)

        #if DEBUG
        print("Debug log: \(logFileURL.path)")
        #endif
    }

    func info(_ message: String) {
        log(level: "INFO", message: message)
    }

    func debug(_ message: String) {
        log(level: "DEBUG", message: message)
    }

    func warning(_ message: String) {
        log(level: "WARN", message: message)
    }

    func error(_ message: String) {
        log(level: "ERROR", message: message)
    }

    private func log(level: String, message: String) {
        let timestamp = dateFormatter.string(from: Date())
        let entry = "[\(timestamp)] [\(level)] \(message)"

        // Console output
        print(entry)

        // File output
        writeToFile(entry + "\n")
    }

    private func writeToFile(_ text: String) {
        fileQueue.async { [weak self] in
            guard let self = self, let data = text.data(using: .utf8) else { return }
            if let handle = try? FileHandle(forWritingTo: self.logFileURL) {
                handle.seekToEndOfFile()
                handle.write(data)
                try? handle.close()
            }
        }
    }
}

// Global logger instance
let log = DebugLogger.shared

// MARK: - Logger Setup

enum LoggerSetup {
    static func configure() {
        log.clearLog()
    }
}
