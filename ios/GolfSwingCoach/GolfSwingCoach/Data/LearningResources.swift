import Foundation
import UIKit

// MARK: - Resource Models

struct ResourceLink {
    let url: String
    let title: String
}

struct LearningResource {
    let youtubeLinks: [ResourceLink]
    let articleLinks: [ResourceLink]
    let drillTip: String?

    init(youtubeLinks: [ResourceLink] = [], articleLinks: [ResourceLink] = [], drillTip: String? = nil) {
        self.youtubeLinks = youtubeLinks
        self.articleLinks = articleLinks
        self.drillTip = drillTip
    }
}

// MARK: - Learning Resources Data

/// Learning resources for each swing mistake, ported from web's detectorResources.ts
enum LearningResources {

    static func getResource(for mistakeId: SwingMistakeId) -> LearningResource? {
        return resources[mistakeId]
    }

    private static let resources: [SwingMistakeId: LearningResource] = [
        // Setup
        .poorPosture: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://golf.com/instruction/quick-4-step-routine-ensure-perfect-posture/",
                    title: "Use This Quick 4-Step Routine to Ensure Perfect Posture at Address"
                )
            ],
            drillTip: "Stand tall, bend from the hips (not the waist), let arms hang naturally."
        ),

        .stanceWidthIssue: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://mygolfspy.com/news-opinion/instruction/golf-stance-width-3-setup-rules-every-golfer-should-know/",
                    title: "Golf Stance Width: 3 Setup Rules Every Golfer Should Know"
                )
            ],
            drillTip: "For driver, stance should be shoulder-width or slightly wider. For irons, narrow it slightly."
        ),

        // Backswing
        .reversePivot: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=bbs-BckY-wM",
                    title: "Fix a Reverse Pivot in the Golf Swing"
                )
            ],
            drillTip: "Feel your weight shift to your trail foot on the backswing while keeping your head steady."
        ),

        .insufficientShoulderTurn: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=OCuK7nWvHt0",
                    title: "How to Move the Shoulders in the Golf Swing - Ultimate Guide"
                ),
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=MvxnhmvWM3I",
                    title: "Three tips to improve your shoulder turn"
                )
            ],
            drillTip: "Try to turn your back to the target at the top of your backswing."
        ),

        .overRotation: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://rotaryswing.com/c4/112452-stop-overswinging-get-your-backswing-under-control",
                    title: "Stop Overswinging | Get Your Backswing Under Control"
                )
            ],
            drillTip: "Focus on a compact backswing - your lead arm should stay connected to your chest."
        ),

        .bentLeadArm: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://mygolfspy.com/news-opinion/instruction/your-lead-arm-might-be-ruining-your-swing-heres-how-to-fix-it/",
                    title: "Your Lead Arm Might Be Ruining Your Swing - Here's How to Fix It"
                )
            ],
            drillTip: "Practice half swings keeping your lead arm straight but not rigid."
        ),

        .liftingHead: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=jlf0Nk7WNRM",
                    title: "Stop Lifting Your Head in the Golf Swing - Fix Your Contact"
                )
            ],
            drillTip: "Keep your eyes focused on the back of the ball throughout the swing."
        ),

        // Downswing
        .earlyExtension: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=5Fyb4ET0LtU",
                    title: "The ONLY Golf Drill That Made My Early Extension Disappear"
                )
            ],
            drillTip: "Practice with a chair behind you - your glutes should stay in contact through impact."
        ),

        .hangingBack: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://hackmotion.com/stop-hanging-back-in-golf-swing/",
                    title: "How to Stop Hanging Back in Golf Swing (Drills & Tips)"
                )
            ],
            drillTip: "Feel your weight shift to your lead foot as you start the downswing."
        ),

        .lossOfSpineAngle: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://www.rotaryswing.com/golf-lessons-blog/how-to-stop-losing-your-posture-in-the-golf-swing/",
                    title: "How To Stop Losing Spine Angle in Golf - Why Posture Matters"
                )
            ],
            drillTip: "Maintain your spine angle from address through impact - don't stand up."
        ),

        .slidingHips: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://www.caddiehq.com/resources/how-to-stop-hip-sway-in-golf-swing",
                    title: "How to Stop Hip Sway in a Golf Swing"
                )
            ],
            drillTip: "Rotate your hips instead of sliding - imagine turning in a barrel."
        ),

        // Impact
        .chickenWing: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=h3dGdMlt88I",
                    title: "Stop the Chicken Wing! Simple Drill for Better Extension"
                )
            ],
            drillTip: "Practice keeping both arms extended through impact and into the follow-through."
        ),

        .poorArmExtension: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://mygolfspy.com/news-opinion/instruction/your-lead-arm-might-be-ruining-your-swing-heres-how-to-fix-it/",
                    title: "Your Lead Arm Might Be Ruining Your Swing - Here's How to Fix It"
                )
            ],
            drillTip: "Feel like you're throwing the club head at the target through impact."
        ),

        .headMovement: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://golf-info-guide.com/video-golf-tips/should-i-let-my-head-move-during-my-golf-back-swing-video/",
                    title: "How to Keep Your Head Still in Golf - by Peter Finch"
                )
            ],
            drillTip: "Your head can rotate slightly, but should not move up, down, or toward the target."
        ),

        // Follow-through
        .incompleteFollowThrough: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=pggMuByVM7E",
                    title: "This ONE Move Will Stop You Rushing The Downswing Forever"
                )
            ],
            drillTip: "Hold your finish position for 3 seconds - belt buckle facing the target."
        ),

        .unbalancedFinish: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=pggMuByVM7E",
                    title: "This ONE Move Will Stop You Rushing The Downswing Forever"
                )
            ],
            drillTip: "You should be able to hold your finish position on your lead foot for several seconds."
        ),

        .reverseCFinish: LearningResource(
            articleLinks: [
                ResourceLink(
                    url: "https://www.titleist.com/videos/instruction/reverse-spine-angle-solution",
                    title: "Reverse Spine Angle Solution"
                )
            ],
            drillTip: "Focus on rotating your body fully through impact rather than leaning back."
        ),

        // Tempo
        .poorTempoRatio: LearningResource(
            youtubeLinks: [
                ResourceLink(
                    url: "https://www.youtube.com/watch?v=pggMuByVM7E",
                    title: "This ONE Move Will Stop You Rushing The Downswing Forever"
                )
            ],
            drillTip: "Count '1-2-3' on the backswing, '1' on the downswing for a 3:1 tempo ratio."
        ),
    ]
}

// MARK: - URL Opening Helpers

@MainActor
enum URLOpener {

    /// Opens a YouTube video, preferring the YouTube app if installed
    static func openYouTube(url: String) {
        guard let webURL = URL(string: url) else { return }

        // Extract video ID from YouTube URL
        if let videoId = extractYouTubeVideoId(from: url) {
            // Try YouTube app URL scheme first
            let youtubeAppURL = URL(string: "youtube://\(videoId)")!
            if UIApplication.shared.canOpenURL(youtubeAppURL) {
                UIApplication.shared.open(youtubeAppURL)
                return
            }
        }

        // Fallback to web URL
        UIApplication.shared.open(webURL)
    }

    /// Opens an article URL in Safari
    static func openArticle(url: String) {
        guard let webURL = URL(string: url) else { return }
        UIApplication.shared.open(webURL)
    }

    /// Extracts video ID from various YouTube URL formats
    private static func extractYouTubeVideoId(from urlString: String) -> String? {
        guard let url = URL(string: urlString) else { return nil }

        // Handle youtube.com/watch?v=VIDEO_ID
        if let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems {
            if let videoId = queryItems.first(where: { $0.name == "v" })?.value {
                return videoId
            }
        }

        // Handle youtu.be/VIDEO_ID
        if url.host == "youtu.be" {
            return url.pathComponents.last
        }

        return nil
    }
}
