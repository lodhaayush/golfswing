import type { SwingMistakeId } from '@/types/swingMistakes'

export interface ResourceLink {
  url: string
  title: string
}

export interface DetectorResource {
  youtube?: string | ResourceLink[]    // Single URL (legacy) or array of {url, title}
  article?: string | ResourceLink[]    // Single URL (legacy) or array of {url, title}
  title?: string                       // Display title (used for single URL format)
}

export const DETECTOR_RESOURCES: Partial<Record<SwingMistakeId, DetectorResource>> = {
  // Setup
  POOR_POSTURE: {
    article: 'https://golf.com/instruction/quick-4-step-routine-ensure-perfect-posture/',
    title: 'Use This Quick 4-Step Routine to Ensure Perfect Posture at Address',
  },
  STANCE_WIDTH_ISSUE: {
    article: 'https://mygolfspy.com/news-opinion/instruction/golf-stance-width-3-setup-rules-every-golfer-should-know/',
    title: 'Golf Stance Width: 3 Setup Rules Every Golfer Should Know',
  },

  // Backswing
  REVERSE_PIVOT: {
    youtube: 'https://www.youtube.com/watch?v=bbs-BckY-wM',
    title: 'Fix a Reverse Pivot in the Golf Swing',
  },
  INSUFFICIENT_SHOULDER_TURN: {
    youtube: [
      { url: 'https://www.youtube.com/watch?v=OCuK7nWvHt0', title: 'How to Move the Shoulders in the Golf Swing - Ultimate Guide' },
      { url: 'https://www.youtube.com/watch?v=MvxnhmvWM3I', title: 'Three tips to improve your shoulder turn' },
    ],
  },
  OVER_ROTATION: {
    article: 'https://rotaryswing.com/c4/112452-stop-overswinging-get-your-backswing-under-control',
    title: 'Stop Overswinging | Get Your Backswing Under Control',
  },
  BENT_LEAD_ARM: {
    article: 'https://mygolfspy.com/news-opinion/instruction/your-lead-arm-might-be-ruining-your-swing-heres-how-to-fix-it/',
    title: 'Your Lead Arm Might Be Ruining Your Swing – Here\'s How to Fix It',
  },
  LIFTING_HEAD: {
    youtube: 'https://www.youtube.com/watch?v=jlf0Nk7WNRM',
    title: 'Stop Lifting Your Head in the Golf Swing – Fix Your Contact and Consistency',
  },

  // Downswing
  EARLY_EXTENSION: {
    youtube: 'https://www.youtube.com/watch?v=5Fyb4ET0LtU',
    title: 'The ONLY Golf Drill That Made My Early Extension Disappear',
  },
  HANGING_BACK: {
    article: 'https://hackmotion.com/stop-hanging-back-in-golf-swing/',
    title: 'How to Stop Hanging Back in Golf Swing (Drills & Tips)',
  },
  LOSS_OF_SPINE_ANGLE: {
    article: 'https://www.rotaryswing.com/golf-lessons-blog/how-to-stop-losing-your-posture-in-the-golf-swing/',
    title: 'How To Stop Losing Spine Angle in Golf – Why Posture Matters',
  },
  SLIDING_HIPS: {
    article: 'https://www.caddiehq.com/resources/how-to-stop-hip-sway-in-golf-swing',
    title: 'How to Stop Hip Sway in a Golf Swing',
  },

  // Impact
  CHICKEN_WING: {
    youtube: 'https://www.youtube.com/watch?v=h3dGdMlt88I',
    title: 'Stop the Chicken Wing! Simple Drill for Better Extension',
  },
  POOR_ARM_EXTENSION: {
    article: 'https://mygolfspy.com/news-opinion/instruction/your-lead-arm-might-be-ruining-your-swing-heres-how-to-fix-it/',
    title: 'Your Lead Arm Might Be Ruining Your Swing – Here\'s How to Fix It',
  },
  HEAD_MOVEMENT: {
    article: 'https://golf-info-guide.com/video-golf-tips/should-i-let-my-head-move-during-my-golf-back-swing-video/',
    title: 'How to Keep Your Head Still in Golf – by Peter Finch',
  },

  // Follow-through
  INCOMPLETE_FOLLOW_THROUGH: {
    youtube: 'https://www.youtube.com/watch?v=pggMuByVM7E',
    title: 'This ONE Move Will Stop You Rushing The Downswing Forever',
  },
  UNBALANCED_FINISH: {
    youtube: 'https://www.youtube.com/watch?v=pggMuByVM7E',
    title: 'This ONE Move Will Stop You Rushing The Downswing Forever',
  },
  REVERSE_C_FINISH: {
    article: 'https://www.titleist.com/videos/instruction/reverse-spine-angle-solution',
    title: 'Reverse Spine Angle Solution',
  },

  // Tempo
  POOR_TEMPO_RATIO: {
    youtube: 'https://www.youtube.com/watch?v=pggMuByVM7E',
    title: 'This ONE Move Will Stop You Rushing The Downswing Forever',
  },
}

export function getResourceForMistake(mistakeId: SwingMistakeId): DetectorResource | undefined {
  return DETECTOR_RESOURCES[mistakeId]
}

export function getResourceLinks(resource: DetectorResource): {
  youtubeLinks: ResourceLink[]
  articleLinks: ResourceLink[]
} {
  let youtubeLinks: ResourceLink[] = []
  let articleLinks: ResourceLink[] = []

  if (resource.youtube) {
    if (Array.isArray(resource.youtube)) {
      youtubeLinks = resource.youtube
    } else {
      youtubeLinks = [{ url: resource.youtube, title: resource.title || 'Video Tutorial' }]
    }
  }

  if (resource.article) {
    if (Array.isArray(resource.article)) {
      articleLinks = resource.article
    } else {
      articleLinks = [{ url: resource.article, title: resource.title || 'Instructional Article' }]
    }
  }

  return { youtubeLinks, articleLinks }
}
