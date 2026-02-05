import SwiftUI

struct FeedbackView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var feedbackText = ""
    @State private var feedbackType: FeedbackType = .bug
    @State private var showCopiedAlert = false

    enum FeedbackType: String, CaseIterable {
        case bug = "Bug Report"
        case feature = "Feature Request"
        case analysis = "Analysis Issue"
        case other = "Other"

        var icon: String {
            switch self {
            case .bug: return "ladybug.fill"
            case .feature: return "lightbulb.fill"
            case .analysis: return "chart.bar.xaxis"
            case .other: return "ellipsis.bubble.fill"
            }
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Feedback Type") {
                    Picker("Type", selection: $feedbackType) {
                        ForEach(FeedbackType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section("Your Feedback") {
                    TextEditor(text: $feedbackText)
                        .frame(minHeight: 150)
                }

                Section {
                    Button(action: copyToClipboard) {
                        Label("Copy to Clipboard", systemImage: "doc.on.doc.fill")
                    }
                    .disabled(feedbackText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                } header: {
                    Text("Submit")
                } footer: {
                    Text("Copy your feedback and paste it in an email to support@golfswingcoach.app")
                }
            }
            .navigationTitle("Feedback")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Copied!", isPresented: $showCopiedAlert) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your feedback has been copied to the clipboard. Paste it in an email to support@golfswingcoach.app")
            }
        }
    }

    private func copyToClipboard() {
        let content = """
        Feedback Type: \(feedbackType.rawValue)

        \(feedbackText)

        ---
        App Version: \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown")
        iOS Version: \(UIDevice.current.systemVersion)
        Device: \(UIDevice.current.model)
        """

        UIPasteboard.general.string = content
        showCopiedAlert = true
    }
}
