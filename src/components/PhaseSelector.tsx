import type { PhaseSegment, SwingPhase } from '@/types/analysis'
import { colors } from '@/styles/colors'

interface PhaseSelectorProps {
  segments: PhaseSegment[]
  currentPhase: SwingPhase | null
  onPhaseSelect: (phase: SwingPhase) => void
}

const PHASE_LABELS: Record<SwingPhase, string> = {
  address: 'Address',
  backswing: 'Backswing',
  top: 'Top',
  downswing: 'Downswing',
  impact: 'Impact',
  'follow-through': 'Follow',
  finish: 'Finish',
}

const PHASE_ORDER: SwingPhase[] = [
  'address',
  'backswing',
  'top',
  'downswing',
  'impact',
  'follow-through',
  'finish',
]

export function PhaseSelector({ segments, currentPhase, onPhaseSelect }: PhaseSelectorProps) {
  // Get available phases from segments
  const availablePhases = new Set(segments.map((s) => s.phase))

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-3">
      {PHASE_ORDER.map((phase) => {
        const isAvailable = availablePhases.has(phase)
        const isCurrent = phase === currentPhase

        return (
          <button
            key={phase}
            onClick={() => isAvailable && onPhaseSelect(phase)}
            disabled={!isAvailable}
            className={`
              px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-medium
              ${isCurrent
                ? `${colors.primary.active} ${colors.primary.ring}`
                : isAvailable
                ? `${colors.button.ghost} ${colors.bg.hover}`
                : `${colors.text.disabled} cursor-not-allowed opacity-50`
              }
            `}
          >
            {PHASE_LABELS[phase]}
          </button>
        )
      })}
    </div>
  )
}
