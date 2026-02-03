// Semantic color constants for consistent theming
// Each constant is a Tailwind class string (light dark:dark pattern)

export const colors = {
  // Backgrounds - Light mode uses 3 shades of amber (cream/sand)
  // Layering: page (amber-50) → card (amber-100) → nested items (amber-200)
  bg: {
    page: 'bg-amber-50 dark:bg-gray-900',
    header: 'bg-amber-100 dark:bg-gray-800',
    card: 'bg-amber-100 dark:bg-gray-800 shadow-sm dark:shadow-none border border-amber-300 dark:border-gray-700',
    cardMuted: 'bg-amber-200/50 dark:bg-gray-700/50',
    cardAlt: 'bg-amber-200 dark:bg-gray-700/50 border border-amber-300 dark:border-gray-600',
    input: 'bg-amber-50 dark:bg-gray-700 border border-amber-300 dark:border-gray-600',
    hover: 'hover:bg-amber-200 dark:hover:bg-gray-700',
    hoverAlt: 'hover:bg-amber-300 dark:hover:bg-gray-700',
    hoverSubtle: 'hover:bg-amber-100 dark:hover:bg-gray-700/50',
    video: 'bg-black',
    slider: 'bg-amber-300 dark:bg-gray-700',
  },

  // Text
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-600 dark:text-gray-300',
    subtle: 'text-gray-400 dark:text-gray-500',
    disabled: 'text-gray-300 dark:text-gray-600',
    hover: 'hover:text-gray-900 dark:hover:text-white',
  },

  // Borders - Light mode uses amber tones for visibility
  border: {
    default: 'border-amber-300 dark:border-gray-700',
    input: 'border-amber-300 dark:border-gray-600',
    subtle: 'border-amber-300 dark:border-gray-600',
    divider: 'text-amber-400 dark:text-gray-600', // for | dividers
  },

  // Primary accent (green)
  primary: {
    button: 'bg-green-600 hover:bg-green-500 text-white',
    text: 'text-green-600 dark:text-green-400',
    active: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    focusBorder: 'focus:border-green-500',
    ring: 'ring-2 ring-green-500',
    dragOver: 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-400/10',
  },

  // Secondary accent (blue)
  secondary: {
    button: 'bg-blue-600 hover:bg-blue-500 text-white',
    text: 'text-blue-600 dark:text-blue-400',
    active: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    progress: 'bg-blue-500 dark:bg-blue-400',
  },

  // Status colors - stronger for visibility against amber
  status: {
    success: 'text-green-700 dark:text-green-400',
    successBadge: 'text-green-700 dark:text-green-500 text-xs',
    successBg: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800',

    warning: 'text-yellow-700 dark:text-yellow-400',
    warningBadge: 'text-yellow-700 dark:text-yellow-500 text-xs',
    warningBg: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-800',

    error: 'text-red-700 dark:text-red-400',
    errorBadge: 'text-red-700 dark:text-red-500 text-xs',
    errorBg: 'bg-red-100 dark:bg-red-400/10',
    errorProgress: 'bg-red-500',
    errorCard: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800',

    info: 'text-blue-700 dark:text-blue-400',
  },

  // Severity (for detected issues) - stronger colors for visibility
  severity: {
    high: 'text-red-700 dark:text-red-400',
    highBg: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800',
    medium: 'text-yellow-700 dark:text-yellow-400',
    mediumBg: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-800',
    low: 'text-orange-700 dark:text-orange-400',
    lowBg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800',
  },

  // Icon accents (for metric sections)
  icon: {
    score: 'text-green-600 dark:text-green-400',      // Zap icon
    rotation: 'text-blue-600 dark:text-blue-400',     // RotateCw icon
    tempo: 'text-purple-600 dark:text-purple-400',    // Clock icon
    posture: 'text-orange-600 dark:text-orange-400',  // User icon
    balance: 'text-cyan-600 dark:text-cyan-400',      // Target icon
    warning: 'text-yellow-600 dark:text-yellow-400',  // AlertTriangle icon
  },

  // Buttons
  button: {
    secondary: 'bg-amber-100 dark:bg-gray-700 hover:bg-amber-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    ghost: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
    disabled: 'opacity-50 cursor-not-allowed',
  },

  // Interactive controls
  control: {
    default: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
    active: 'text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300',
  },

  // Progress bars
  progress: {
    track: 'bg-amber-200 dark:bg-gray-700',
    fill: 'bg-green-500',
    error: 'bg-red-500',
  },

  // Score colors (for gauge)
  score: {
    excellent: 'text-green-600 dark:text-green-400',  // 80+
    good: 'text-yellow-600 dark:text-yellow-400',     // 60-79
    needsWork: 'text-orange-600 dark:text-orange-400', // 40-59
    poor: 'text-red-600 dark:text-red-400',           // <40
  },
} as const

// Helper type for accessing nested color values
export type Colors = typeof colors
