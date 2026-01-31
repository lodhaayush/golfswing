import { SwingMistake } from '@/types/swingMistakes'

/**
 * Canonical list of common amateur golf swing mistakes.
 * This serves as the authoritative reference for swing analysis feedback.
 *
 * Sources:
 * - MyGolfSpy: 10 Most Common Golf Swing Mistakes
 * - Golf Monthly: 32 Biggest Swing Faults
 * - Keiser University College of Golf: Biggest Mistakes with Your Golf Swing
 * - CaddieHQ: Most Common Mistakes in a Golf Swing
 * - Backswing: Most Common Issue for Beginning Golfers
 * - Inside Golf Australia: Common Golf Swing Faults
 */
export const COMMON_SWING_MISTAKES: readonly SwingMistake[] = [
  // ============================================
  // Category 1: Setup & Address Issues
  // ============================================
  {
    id: 'POOR_POSTURE',
    category: 'setup',
    name: 'Poor posture at address',
    description:
      'Standing too upright or hunched, S-posture (excessive lower back curve)',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'POOR_ALIGNMENT',
    category: 'setup',
    name: 'Poor alignment',
    description: 'Feet/body not aligned parallel to target line',
    detectableViaPose: 'partial',
    severity: 'moderate',
  },
  {
    id: 'INCORRECT_BALL_POSITION',
    category: 'setup',
    name: 'Incorrect ball position',
    description: 'Ball too far forward/back for the club being used',
    detectableViaPose: false,
    severity: 'moderate',
  },
  {
    id: 'INCORRECT_GRIP',
    category: 'setup',
    name: 'Incorrect grip',
    description: 'Grip too strong, too weak, or too tight',
    detectableViaPose: false,
    severity: 'major',
  },
  {
    id: 'STANCE_WIDTH_ISSUE',
    category: 'setup',
    name: 'Improper stance width',
    description: 'Stance too narrow or too wide for the club',
    detectableViaPose: true,
    severity: 'minor',
  },

  // ============================================
  // Category 2: Backswing Faults
  // ============================================
  {
    id: 'SWAYING',
    category: 'backswing',
    name: 'Swaying',
    description:
      'Lateral hip/body movement away from target instead of rotation',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'REVERSE_PIVOT',
    category: 'backswing',
    name: 'Reverse pivot',
    description:
      'Weight shifts toward target during backswing (opposite of correct)',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'INSUFFICIENT_SHOULDER_TURN',
    category: 'backswing',
    name: 'Insufficient shoulder turn',
    description: 'Not rotating shoulders enough (~90°), losing power',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'OVER_ROTATION',
    category: 'backswing',
    name: 'Over-rotation',
    description: 'Excessive rotation causing loss of control',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'BENT_LEAD_ARM',
    category: 'backswing',
    name: 'Bent lead arm at top',
    description: 'Lead arm collapses at top, reducing swing arc and power',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'LIFTING_HEAD',
    category: 'backswing',
    name: 'Lifting head in backswing',
    description: 'Head moves up during backswing',
    detectableViaPose: true,
    severity: 'minor',
  },
  {
    id: 'POOR_WRIST_HINGE',
    category: 'backswing',
    name: 'Poor wrist hinge',
    description: 'Insufficient or excessive wrist cock at top',
    detectableViaPose: 'partial',
    severity: 'moderate',
  },

  // ============================================
  // Category 3: Downswing Faults
  // ============================================
  {
    id: 'OVER_THE_TOP',
    category: 'downswing',
    name: 'Over the top (OTT)',
    description:
      'Club moves outside-in, shoulders rotate before arms drop',
    detectableViaPose: 'partial',
    severity: 'major',
  },
  {
    id: 'CASTING',
    category: 'downswing',
    name: 'Casting / early release',
    description: 'Releasing wrist angle too early, losing lag and power',
    detectableViaPose: 'partial',
    severity: 'major',
  },
  {
    id: 'EARLY_EXTENSION',
    category: 'downswing',
    name: 'Early extension',
    description:
      'Hips thrust toward ball during downswing, losing posture',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'HANGING_BACK',
    category: 'downswing',
    name: 'Hanging back',
    description: 'Weight stays on back foot through impact',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'LOSS_OF_SPINE_ANGLE',
    category: 'downswing',
    name: 'Loss of spine angle',
    description:
      'Spine angle changes significantly from address to impact',
    detectableViaPose: true,
    severity: 'major',
  },
  {
    id: 'SLIDING_HIPS',
    category: 'downswing',
    name: 'Sliding hips',
    description: 'Hips slide laterally instead of rotating',
    detectableViaPose: true,
    severity: 'moderate',
  },

  // ============================================
  // Category 4: Impact Faults
  // ============================================
  {
    id: 'SCOOPING',
    category: 'impact',
    name: 'Scooping',
    description:
      'Trying to lift ball instead of trusting club loft; hands behind ball',
    detectableViaPose: 'partial',
    severity: 'major',
  },
  {
    id: 'CHICKEN_WING',
    category: 'impact',
    name: 'Chicken wing',
    description: 'Lead elbow bends outward at/after impact',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'POOR_ARM_EXTENSION',
    category: 'impact',
    name: 'Poor arm extension',
    description: 'Arms collapse through impact zone',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'HEAD_MOVEMENT',
    category: 'impact',
    name: 'Excessive head movement',
    description: 'Head moves significantly during swing',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'FLIPPING',
    category: 'impact',
    name: 'Flipping',
    description: 'Wrists break down at impact, adding loft',
    detectableViaPose: 'partial',
    severity: 'major',
  },

  // ============================================
  // Category 5: Follow-Through & Finish Faults
  // ============================================
  {
    id: 'INCOMPLETE_FOLLOW_THROUGH',
    category: 'follow-through',
    name: 'Incomplete follow-through',
    description: 'Stopping rotation at or shortly after impact',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'UNBALANCED_FINISH',
    category: 'follow-through',
    name: 'Unbalanced finish',
    description: 'Falling off balance at finish position',
    detectableViaPose: true,
    severity: 'minor',
  },
  {
    id: 'REVERSE_C_FINISH',
    category: 'follow-through',
    name: 'Reverse C finish',
    description: 'Excessive backward lean at finish (spine stress)',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'DECELERATING_THROUGH_IMPACT',
    category: 'follow-through',
    name: 'Decelerating through impact',
    description: 'Slowing down before contact instead of accelerating',
    detectableViaPose: 'partial',
    severity: 'major',
  },

  // ============================================
  // Category 6: Tempo & Timing Issues
  // ============================================
  {
    id: 'POOR_TEMPO_RATIO',
    category: 'tempo',
    name: 'Poor tempo ratio',
    description: 'Backswing-to-downswing ratio far from ideal 3:1',
    detectableViaPose: true,
    severity: 'moderate',
  },
  {
    id: 'RUSHING_TRANSITION',
    category: 'tempo',
    name: 'Rushing transition',
    description: 'Jerky change from backswing to downswing',
    detectableViaPose: 'partial',
    severity: 'moderate',
  },
  {
    id: 'SWINGING_TOO_HARD',
    category: 'tempo',
    name: 'Swinging too hard',
    description: 'Excessive effort reducing accuracy and control',
    detectableViaPose: 'partial',
    severity: 'minor',
  },

  // ============================================
  // Category 7: Ball Flight Issues (Result of Above Faults)
  // ============================================
  {
    id: 'SLICE',
    category: 'ball-flight',
    name: 'Slice',
    description: 'Ball curves sharply away from golfer',
    detectableViaPose: false,
    severity: 'major',
  },
  {
    id: 'HOOK',
    category: 'ball-flight',
    name: 'Hook',
    description: 'Ball curves sharply toward golfer',
    detectableViaPose: false,
    severity: 'major',
  },
  {
    id: 'PUSH',
    category: 'ball-flight',
    name: 'Push',
    description: 'Ball goes straight right (for right-handed golfer)',
    detectableViaPose: false,
    severity: 'moderate',
  },
  {
    id: 'PULL',
    category: 'ball-flight',
    name: 'Pull',
    description: 'Ball goes straight left (for right-handed golfer)',
    detectableViaPose: false,
    severity: 'moderate',
  },
  {
    id: 'TOPPED_SHOT',
    category: 'ball-flight',
    name: 'Topping the ball',
    description: 'Hitting top of ball, low running shot',
    detectableViaPose: false,
    severity: 'major',
  },
  {
    id: 'FAT_SHOT',
    category: 'ball-flight',
    name: 'Fat/chunked shot',
    description: 'Hitting ground before ball',
    detectableViaPose: false,
    severity: 'major',
  },
  {
    id: 'THIN_SHOT',
    category: 'ball-flight',
    name: 'Thin shot',
    description: 'Hitting ball on upswing',
    detectableViaPose: false,
    severity: 'moderate',
  },
] as const

/**
 * Get all mistakes in a specific category
 */
export function getMistakesByCategory(
  category: SwingMistake['category']
): SwingMistake[] {
  return COMMON_SWING_MISTAKES.filter((m) => m.category === category)
}

/**
 * Get a specific mistake by ID
 */
export function getMistakeById(
  id: SwingMistake['id']
): SwingMistake | undefined {
  return COMMON_SWING_MISTAKES.find((m) => m.id === id)
}

/**
 * Get all mistakes that are detectable via pose estimation
 */
export function getDetectableMistakes(): SwingMistake[] {
  return COMMON_SWING_MISTAKES.filter((m) => m.detectableViaPose === true)
}

/**
 * Get all mistakes that are partially detectable via pose estimation
 */
export function getPartiallyDetectableMistakes(): SwingMistake[] {
  return COMMON_SWING_MISTAKES.filter((m) => m.detectableViaPose === 'partial')
}
