import type { PhaseSegment, SwingPhase } from '@/types/analysis'

interface PhaseSelectorProps {
  segments: PhaseSegment[]
  currentPhase: SwingPhase | null
  onPhaseSelect: (phase: SwingPhase) => void
}

// Phase icons as simple SVG silhouettes
const PHASE_ICONS: Record<SwingPhase, string> = {
  address: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 8v8h-2v-6l-2.5-4.5L13 12l2 3h-6l2-3-1.5-2.5L7 14v6H5v-8l3-5 1-2h6l1 2 3 5z',
  backswing: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 8l-2-6h-4l-2 6 2 3v5h2v-4l2-2 2 4h2v-6z',
  top: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm5 5l-4-2h-2l-4 2 1 4 2-1v8h2v-5l2 2 2-2v5h2v-8l-1-3z',
  downswing: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-4 8l2-6h4l2 6-2 3v5h-2v-4l-2-2-2 4H8v-6z',
  impact: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2 0-4 1-4 3v7h2v-4h4v4h2v-7c0-2-2-3-4-3z',
  'follow-through': 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 8l-2-6h-4l-2 6 2 3v5h2v-4l2-2 2 4h2v-6z',
  finish: 'M12 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-1 4h2v6h3l-4 6-4-6h3V8z',
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
              flex flex-col items-center gap-1 p-2 rounded-lg transition-all
              ${isCurrent
                ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500'
                : isAvailable
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 cursor-not-allowed opacity-50'
              }
            `}
            title={PHASE_LABELS[phase]}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="currentColor"
            >
              <path d={PHASE_ICONS[phase]} />
            </svg>
            <span className="text-[10px] sm:text-xs font-medium hidden sm:block">
              {PHASE_LABELS[phase]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
