/**
 * Shared constants for golf swing analysis
 * All thresholds, weights, and configuration values are defined here
 */

// =============================================================================
// SCORING WEIGHTS BY CAMERA ANGLE
// =============================================================================

export const SCORING_WEIGHTS = {
  /** Down-the-line camera angle weights */
  DTL: {
    xFactor: 0,           // Unreliable for DTL
    shoulder: 0,          // Unreliable for DTL
    hip: 0,               // Unreliable for DTL
    spine: 0.30,          // Very reliable for DTL (down-the-line view shows spine clearly)
    leadArm: 0.35,        // Very reliable for DTL
    tempo: 0.35,          // Reliable for all angles
    hipSway: 0,           // Not available for DTL
    headStability: 0,     // Not available for DTL
    impactExtension: 0,   // Not available for DTL
  },
  /** Face-on camera angle weights */
  FACE_ON: {
    xFactor: 0.12,        // Reliable with width-based calculation
    shoulder: 0.10,       // Reliable with width-based calculation
    hip: 0.08,            // Reliable with width-based calculation
    spine: 0.08,          // Less reliable (shows lateral tilt, not forward bend)
    leadArm: 0.12,        // Visible but partially occluded
    tempo: 0.20,          // Reliable for all angles
    hipSway: 0.10,        // Face-on specific (lower is better)
    headStability: 0.10,  // Face-on specific (lower is better)
    impactExtension: 0.10,// Face-on specific (higher is better)
  },
  /** Oblique camera angle weights */
  OBLIQUE: {
    xFactor: 0.20,
    shoulder: 0.15,
    hip: 0.10,
    spine: 0.15,
    leadArm: 0.15,
    tempo: 0.25,
    hipSway: 0,
    headStability: 0,
    impactExtension: 0,
  },
} as const

// =============================================================================
// IDEAL RANGES FOR SCORING (by camera angle)
// =============================================================================

export const SCORING_RANGES = {
  /** X-Factor ranges (same for all camera angles) */
  X_FACTOR: {
    IDEAL_MIN: 35,
    IDEAL_MAX: 65,
    ABS_MIN: 20,
    ABS_MAX: 80,
  },
  /** Shoulder rotation ranges */
  SHOULDER: {
    FACE_ON: { IDEAL_MIN: 55, IDEAL_MAX: 95, ABS_MIN: 35, ABS_MAX: 130 },
    DEFAULT: { IDEAL_MIN: 80, IDEAL_MAX: 110, ABS_MIN: 60, ABS_MAX: 130 },
  },
  /** Hip rotation ranges */
  HIP: {
    FACE_ON: { IDEAL_MIN: 25, IDEAL_MAX: 55, ABS_MIN: 15, ABS_MAX: 75 },
    DEFAULT: { IDEAL_MIN: 40, IDEAL_MAX: 60, ABS_MIN: 25, ABS_MAX: 75 },
  },
  /** Spine angle tolerance (multiplier for difference from address to impact) */
  SPINE_TOLERANCE: {
    FACE_ON: 1,   // More lenient - measures lateral tilt
    DEFAULT: 3,
  },
  /** Lead arm extension ranges */
  LEAD_ARM: {
    FACE_ON: { IDEAL_MIN: 140, IDEAL_MAX: 180, ABS_MIN: 100, ABS_MAX: 180 },
    DEFAULT: { IDEAL_MIN: 160, IDEAL_MAX: 180, ABS_MIN: 120, ABS_MAX: 180 },
  },
  /** Hip sway ranges (inverted: 1 - value, so higher = less sway = better) */
  HIP_SWAY: {
    IDEAL_MIN: 0.60,  // Corresponds to hipSway < 0.40
    IDEAL_MAX: 1.0,
    ABS_MIN: 0.3,
    ABS_MAX: 1.0,
  },
  /** Head stability ranges (inverted: 1 - value, so higher = less movement = better) */
  HEAD_STABILITY: {
    IDEAL_MIN: 0.65,  // Corresponds to headStability < 0.35
    IDEAL_MAX: 1.0,
    ABS_MIN: 0.3,
    ABS_MAX: 1.0,
  },
  /** Impact extension ranges */
  IMPACT_EXTENSION: {
    IDEAL_MIN: 0.7,
    IDEAL_MAX: 1.0,
    ABS_MIN: 0.3,
    ABS_MAX: 1.0,
  },
} as const

// =============================================================================
// CLUB-SPECIFIC SCORING ADJUSTMENTS
// =============================================================================

export const CLUB_SCORING = {
  /** Driver-specific ideal ranges - bigger swings, more rotation */
  DRIVER: {
    X_FACTOR: { IDEAL_MIN: 40, IDEAL_MAX: 65, ABS_MIN: 25, ABS_MAX: 80 },
    SHOULDER: {
      FACE_ON: { IDEAL_MIN: 60, IDEAL_MAX: 100, ABS_MIN: 40, ABS_MAX: 130 },
      DEFAULT: { IDEAL_MIN: 85, IDEAL_MAX: 115, ABS_MIN: 65, ABS_MAX: 135 },
    },
    HIP: {
      FACE_ON: { IDEAL_MIN: 30, IDEAL_MAX: 60, ABS_MIN: 20, ABS_MAX: 80 },
      DEFAULT: { IDEAL_MIN: 45, IDEAL_MAX: 65, ABS_MIN: 30, ABS_MAX: 80 },
    },
    LEAD_ARM: {
      FACE_ON: { IDEAL_MIN: 140, IDEAL_MAX: 180, ABS_MIN: 100, ABS_MAX: 180 },
      DEFAULT: { IDEAL_MIN: 160, IDEAL_MAX: 180, ABS_MIN: 120, ABS_MAX: 180 },
    },
    /** Driver tempo can be slightly slower/smoother */
    TEMPO_IDEAL_RATIO: 3.0,
    TEMPO_TOLERANCE: 0.4,
  },
  /** Iron-specific ideal ranges - more controlled, less rotation */
  IRON: {
    X_FACTOR: { IDEAL_MIN: 30, IDEAL_MAX: 55, ABS_MIN: 15, ABS_MAX: 70 },
    SHOULDER: {
      FACE_ON: { IDEAL_MIN: 50, IDEAL_MAX: 90, ABS_MIN: 30, ABS_MAX: 120 },
      DEFAULT: { IDEAL_MIN: 75, IDEAL_MAX: 105, ABS_MIN: 55, ABS_MAX: 125 },
    },
    HIP: {
      FACE_ON: { IDEAL_MIN: 20, IDEAL_MAX: 50, ABS_MIN: 10, ABS_MAX: 70 },
      DEFAULT: { IDEAL_MIN: 35, IDEAL_MAX: 55, ABS_MIN: 20, ABS_MAX: 70 },
    },
    LEAD_ARM: {
      FACE_ON: { IDEAL_MIN: 145, IDEAL_MAX: 180, ABS_MIN: 110, ABS_MAX: 180 },
      DEFAULT: { IDEAL_MIN: 165, IDEAL_MAX: 180, ABS_MIN: 130, ABS_MAX: 180 },
    },
    /** Iron tempo tends to be slightly quicker */
    TEMPO_IDEAL_RATIO: 3.0,
    TEMPO_TOLERANCE: 0.3,
  },
} as const

// =============================================================================
// FEEDBACK THRESHOLDS (for generating feedback messages)
// =============================================================================

export const FEEDBACK_THRESHOLDS = {
  /** Spine angle difference thresholds */
  SPINE_DIFF: {
    FACE_ON: { GOOD: 20, WARNING: 30 },
    DEFAULT: { GOOD: 5, WARNING: 10 },
  },
  /** Lead arm extension thresholds */
  LEAD_ARM: {
    FACE_ON: { GOOD: 140, OK: 120 },
    DEFAULT: { GOOD: 160, OK: 140 },
  },
  /** Hip sway thresholds (lower is better) */
  HIP_SWAY: {
    GOOD: 0.40,
    OK: 0.55,
  },
  /** Head stability thresholds (lower is better) */
  HEAD_STABILITY: {
    GOOD: 0.35,
    OK: 0.50,
  },
  /** Impact extension thresholds (higher is better) */
  IMPACT_EXTENSION: {
    GOOD: 0.75,
    OK: 0.50,
  },
} as const

// =============================================================================
// PHASE DETECTION CONSTANTS
// =============================================================================

export const PHASE_DETECTION = {
  /** Smoothing window size for velocity and hand height data */
  SMOOTHING_WINDOW: 5,
  /** Minimum peak width for robust peak detection */
  MIN_PEAK_WIDTH: 2,
  /** Impact search range as fraction of total frames */
  IMPACT_SEARCH: {
    START_FRACTION: 0.3,  // Impact is never in first 30%
    END_FRACTION: 0.85,   // Impact is never in last 15%
  },
  /** Velocity drop threshold for impact refinement (fraction of peak) */
  VELOCITY_DROP_THRESHOLD: 0.85,
  /** Max frames to search after velocity peak for velocity drop */
  VELOCITY_DROP_SEARCH_FRAMES: 12,
  /** Max frames to search after velocity peak for hand height */
  HAND_HEIGHT_SEARCH_FRAMES: 15,
  /** Max offset from velocity peak to prefer hand height as impact */
  MAX_HAND_HEIGHT_OFFSET: 10,
  /** Address detection thresholds */
  ADDRESS_DETECTION: {
    /** Velocity multiplier over baseline to detect swing start */
    VELOCITY_MULTIPLIER: 1.5,
    /** Fraction of peak velocity to detect swing start */
    PEAK_VELOCITY_FRACTION: 0.04,
    /** Hand movement threshold as fraction of frame size */
    HAND_MOVEMENT_THRESHOLD: 0.015,
  },
  /** Top of backswing search start as fraction of total frames */
  TOP_SEARCH_START_FRACTION: 0.1,
  /** Finish start as fraction of total frames */
  FINISH_START_FRACTION: 0.85,
} as const

// =============================================================================
// CAMERA ANGLE DETECTION CONSTANTS
// =============================================================================

export const CAMERA_ANGLE_DETECTION = {
  /** Ratio threshold for face-on detection (dx/dz > this = face-on) */
  FACE_ON_THRESHOLD: 2.0,
  /** Ratio threshold for DTL detection (dx/dz < this = DTL) */
  DTL_THRESHOLD: 0.5,
  /** Number of frames to sample for camera angle detection */
  SAMPLE_COUNT: 10,
  /** Small epsilon to avoid division by zero */
  EPSILON: 0.001,
} as const

// =============================================================================
// TEMPO ANALYSIS CONSTANTS
// =============================================================================

export const TEMPO = {
  /** Ideal tempo ratio (backswing / downswing) */
  IDEAL_RATIO: 3.0,
  /** Tolerance for "excellent" tempo rating */
  EXCELLENT_TOLERANCE: 0.3,
  /** Tolerance for "good" tempo rating */
  GOOD_TOLERANCE: 0.6,
} as const

// =============================================================================
// CLUB TYPE DETECTION CONSTANTS
// =============================================================================

export const CLUB_DETECTION = {
  /**
   * Stance width ratio thresholds (stance width / hip width)
   * Driver stance is typically 1.5-2x hip width
   * Iron stance is typically 1.0-1.3x hip width
   */
  STANCE_RATIO: {
    DRIVER_MIN: 1.4,    // Above this suggests driver
    IRON_MAX: 1.25,     // Below this suggests iron
  },
  /**
   * Hand distance from hip center (normalized to shoulder width)
   * Longer clubs = hands further from body at address
   */
  HAND_DISTANCE: {
    DRIVER_MIN: 0.8,    // Above this suggests driver
    IRON_MAX: 0.65,     // Below this suggests iron
  },
  /**
   * Spine angle at address (degrees from vertical)
   * Driver = more upright (smaller angle)
   * Iron = more bent over (larger angle)
   * Note: Many golfers bend 35-45° even with driver, so thresholds are generous
   */
  SPINE_ANGLE: {
    DRIVER_MAX: 42,     // Below this suggests driver (more upright)
    IRON_MIN: 50,       // Above this suggests iron (more bent)
  },
  /** Number of frames to sample for detection */
  SAMPLE_FRAMES: 5,
  /** Minimum confidence to report a club type */
  MIN_CONFIDENCE: 0.6,
} as const

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULTS = {
  /** Default value for missing hip sway */
  HIP_SWAY: 0.5,
  /** Default value for missing head stability */
  HEAD_STABILITY: 0.5,
  /** Default value for missing impact extension */
  IMPACT_EXTENSION: 0.5,
} as const
