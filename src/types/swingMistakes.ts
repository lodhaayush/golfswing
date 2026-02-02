export type SwingMistakeCategory =
  | 'setup'
  | 'backswing'
  | 'downswing'
  | 'impact'
  | 'follow-through'
  | 'tempo'
  | 'ball-flight'

export type SwingMistakeId =
  // Setup & Address Issues
  | 'POOR_POSTURE'
  | 'POOR_ALIGNMENT'
  | 'INCORRECT_BALL_POSITION'
  | 'INCORRECT_GRIP'
  | 'STANCE_WIDTH_ISSUE'
  // Backswing Faults
  | 'REVERSE_PIVOT'
  | 'INSUFFICIENT_SHOULDER_TURN'
  | 'OVER_ROTATION'
  | 'BENT_LEAD_ARM'
  | 'LIFTING_HEAD'
  | 'POOR_WRIST_HINGE'
  // Downswing Faults
  | 'OVER_THE_TOP'
  | 'CASTING'
  | 'EARLY_EXTENSION'
  | 'HANGING_BACK'
  | 'LOSS_OF_SPINE_ANGLE'
  | 'SLIDING_HIPS'
  // Impact Faults
  | 'SCOOPING'
  | 'CHICKEN_WING'
  | 'POOR_ARM_EXTENSION'
  | 'HEAD_MOVEMENT'
  | 'FLIPPING'
  // Follow-Through & Finish Faults
  | 'INCOMPLETE_FOLLOW_THROUGH'
  | 'UNBALANCED_FINISH'
  | 'REVERSE_C_FINISH'
  | 'DECELERATING_THROUGH_IMPACT'
  // Tempo & Timing Issues
  | 'POOR_TEMPO_RATIO'
  | 'RUSHING_TRANSITION'
  | 'SWINGING_TOO_HARD'
  // Ball Flight Issues
  | 'SLICE'
  | 'HOOK'
  | 'PUSH'
  | 'PULL'
  | 'TOPPED_SHOT'
  | 'FAT_SHOT'
  | 'THIN_SHOT'

export interface SwingMistake {
  id: SwingMistakeId
  category: SwingMistakeCategory
  name: string
  description: string
  detectableViaPose: boolean | 'partial'
  severity: 'minor' | 'moderate' | 'major'
}
