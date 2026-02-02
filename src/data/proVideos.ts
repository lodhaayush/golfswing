import type { ProVideoReference } from '@/types/proVideo'
import type { CameraAngle } from '@/utils/angleCalculations'
import type { ClubType, SwingPhase } from '@/types/analysis'

/**
 * Pre-analyzed pro swing videos bundled with the app.
 * Each video includes pre-extracted pose frames and phase segments.
 *
 * To add a new pro video:
 * 1. Add the video file to public/videos/
 * 2. Run the analysis on the video to extract pose frames and phase segments
 * 3. Add the data to this array
 */
export const PRO_VIDEOS: ProVideoReference[] = [
  {
    id: 'pro-faceon-driver',
    name: 'Tiger Woods Driver (Face-On)',
    videoUrl: '/videos/pro-faceon-driver.mov',
    cameraAngle: 'face-on',
    clubType: 'driver',
    isRightHanded: true,
    phaseSegments: [
      { phase: 'address' as SwingPhase, startFrame: 0, endFrame: 10, startTime: 0, endTime: 0.667, duration: 0.667 },
      { phase: 'backswing' as SwingPhase, startFrame: 11, endFrame: 32, startTime: 0.733, endTime: 2.133, duration: 1.4 },
      { phase: 'top' as SwingPhase, startFrame: 33, endFrame: 34, startTime: 2.2, endTime: 2.267, duration: 0.067 },
      { phase: 'downswing' as SwingPhase, startFrame: 35, endFrame: 41, startTime: 2.333, endTime: 2.733, duration: 0.4 },
      { phase: 'impact' as SwingPhase, startFrame: 42, endFrame: 43, startTime: 2.8, endTime: 2.867, duration: 0.067 },
      { phase: 'follow-through' as SwingPhase, startFrame: 44, endFrame: 48, startTime: 2.933, endTime: 3.2, duration: 0.267 },
      { phase: 'finish' as SwingPhase, startFrame: 49, endFrame: 57, startTime: 3.267, endTime: 3.8, duration: 0.533 },
    ],
    poseFrames: [],
  },
  {
    id: 'pro-faceon-iron',
    name: 'Pro Iron (Face-On)',
    videoUrl: '/videos/pro-faceon-iron.mp4',
    cameraAngle: 'face-on',
    clubType: 'iron',
    isRightHanded: true,
    phaseSegments: [
      { phase: 'address' as SwingPhase, startFrame: 0, endFrame: 25, startTime: 0, endTime: 0.83, duration: 0.83 },
      { phase: 'backswing' as SwingPhase, startFrame: 25, endFrame: 50, startTime: 0.83, endTime: 1.67, duration: 0.84 },
      { phase: 'top' as SwingPhase, startFrame: 50, endFrame: 60, startTime: 1.67, endTime: 2.0, duration: 0.33 },
      { phase: 'downswing' as SwingPhase, startFrame: 60, endFrame: 72, startTime: 2.0, endTime: 2.4, duration: 0.4 },
      { phase: 'impact' as SwingPhase, startFrame: 72, endFrame: 76, startTime: 2.4, endTime: 2.53, duration: 0.13 },
      { phase: 'follow-through' as SwingPhase, startFrame: 76, endFrame: 100, startTime: 2.53, endTime: 3.33, duration: 0.8 },
      { phase: 'finish' as SwingPhase, startFrame: 100, endFrame: 120, startTime: 3.33, endTime: 4.0, duration: 0.67 },
    ],
    poseFrames: [],
  },
  {
    id: 'pro-dtl-driver',
    name: 'Tiger Woods Driver (Down the Line)',
    videoUrl: '/videos/pro-dtl-driver.mov',
    cameraAngle: 'dtl',
    clubType: 'driver',
    isRightHanded: true,
    phaseSegments: [
      { phase: 'address' as SwingPhase, startFrame: 0, endFrame: 25, startTime: 0, endTime: 1.667, duration: 1.667 },
      { phase: 'backswing' as SwingPhase, startFrame: 26, endFrame: 45, startTime: 1.733, endTime: 3.0, duration: 1.267 },
      { phase: 'top' as SwingPhase, startFrame: 46, endFrame: 47, startTime: 3.067, endTime: 3.133, duration: 0.067 },
      { phase: 'downswing' as SwingPhase, startFrame: 48, endFrame: 54, startTime: 3.2, endTime: 3.6, duration: 0.4 },
      { phase: 'impact' as SwingPhase, startFrame: 55, endFrame: 56, startTime: 3.667, endTime: 3.733, duration: 0.067 },
      { phase: 'follow-through' as SwingPhase, startFrame: 57, endFrame: 65, startTime: 3.8, endTime: 4.333, duration: 0.533 },
      { phase: 'finish' as SwingPhase, startFrame: 66, endFrame: 77, startTime: 4.4, endTime: 5.133, duration: 0.733 },
    ],
    poseFrames: [],
  },
  {
    id: 'pro-dtl-iron',
    name: 'Pro Iron (Down the Line)',
    videoUrl: '/videos/pro-dtl-iron.mp4',
    cameraAngle: 'dtl',
    clubType: 'iron',
    isRightHanded: true,
    phaseSegments: [
      { phase: 'address' as SwingPhase, startFrame: 0, endFrame: 25, startTime: 0, endTime: 0.83, duration: 0.83 },
      { phase: 'backswing' as SwingPhase, startFrame: 25, endFrame: 50, startTime: 0.83, endTime: 1.67, duration: 0.84 },
      { phase: 'top' as SwingPhase, startFrame: 50, endFrame: 60, startTime: 1.67, endTime: 2.0, duration: 0.33 },
      { phase: 'downswing' as SwingPhase, startFrame: 60, endFrame: 72, startTime: 2.0, endTime: 2.4, duration: 0.4 },
      { phase: 'impact' as SwingPhase, startFrame: 72, endFrame: 76, startTime: 2.4, endTime: 2.53, duration: 0.13 },
      { phase: 'follow-through' as SwingPhase, startFrame: 76, endFrame: 100, startTime: 2.53, endTime: 3.33, duration: 0.8 },
      { phase: 'finish' as SwingPhase, startFrame: 100, endFrame: 120, startTime: 3.33, endTime: 4.0, duration: 0.67 },
    ],
    poseFrames: [],
  },
]

/**
 * Get pro videos that are compatible with the user's video
 * (matching camera angle and optionally club type)
 */
export function getCompatibleProVideos(
  cameraAngle: CameraAngle,
  clubType?: ClubType
): ProVideoReference[] {
  return PRO_VIDEOS.filter((video) => {
    // Must match camera angle
    if (video.cameraAngle !== cameraAngle) {
      return false
    }

    // Optionally filter by club type (if specified and not unknown)
    if (clubType && clubType !== 'unknown' && video.clubType !== clubType) {
      return false
    }

    return true
  })
}

/**
 * Get a specific pro video by ID
 */
export function getProVideoById(id: string): ProVideoReference | undefined {
  return PRO_VIDEOS.find((video) => video.id === id)
}
