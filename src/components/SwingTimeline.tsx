import { useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import type { PhaseSegment } from '@/types/analysis'
import { getPhaseDisplayName, getPhaseColor } from '@/utils/phaseDetection'
import { colors } from '@/styles/colors'

interface SwingTimelineProps {
  segments: PhaseSegment[]
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
  onRerunAnalysis?: () => void
}

export function SwingTimeline({
  segments,
  currentTime,
  duration,
  onSeek,
  onRerunAnalysis,
}: SwingTimelineProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || duration === 0) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const time = percentage * duration

      onSeek(Math.max(0, Math.min(time, duration)))
    },
    [onSeek, duration]
  )

  const handlePhaseClick = useCallback(
    (segment: PhaseSegment) => {
      if (!onSeek) return
      // Jump to the start of the phase
      onSeek(segment.startTime)
    },
    [onSeek]
  )

  if (segments.length === 0 || duration === 0) {
    return (
      <div className={`w-full ${colors.bg.card} rounded-lg p-4`}>
        <p className={`${colors.text.subtle} text-sm text-center`}>No phase data available</p>
      </div>
    )
  }

  const currentPercentage = (currentTime / duration) * 100

  return (
    <div className={`w-full ${colors.bg.card} rounded-lg p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium ${colors.text.secondary}`}>Swing Phases</h3>
        {onRerunAnalysis && (
          <button
            onClick={onRerunAnalysis}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${colors.bg.hover} transition-colors`}
            title="Re-run analysis if phases look incorrect"
          >
            <span className="text-red-500">(Something Wrong?)</span>
            <RefreshCw className="w-3 h-3" />
            <span className={colors.text.muted}>Re-run</span>
          </button>
        )}
      </div>

      {/* Timeline bar */}
      <div
        className={`relative h-8 ${colors.bg.slider} rounded-lg overflow-hidden cursor-pointer`}
        onClick={handleClick}
      >
        {/* Phase segments */}
        {segments.map((segment, index) => {
          const startPercentage = (segment.startTime / duration) * 100
          const widthPercentage = (segment.duration / duration) * 100

          return (
            <div
              key={index}
              className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-white/80 hover:brightness-110 transition-all"
              style={{
                left: `${startPercentage}%`,
                width: `${Math.max(widthPercentage, 1)}%`,
                backgroundColor: getPhaseColor(segment.phase),
              }}
              title={`${getPhaseDisplayName(segment.phase)}: ${segment.startTime.toFixed(2)}s - ${segment.endTime.toFixed(2)}s`}
            >
              {widthPercentage > 10 && (
                <span className="truncate px-1">{getPhaseDisplayName(segment.phase)}</span>
              )}
            </div>
          )
        })}

        {/* Current position indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-lg"
          style={{ left: `${currentPercentage}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white" />
        </div>
      </div>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-2">
        {segments.map((segment, index) => (
          <button
            key={index}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${colors.bg.hover} transition-colors`}
            onClick={() => handlePhaseClick(segment)}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getPhaseColor(segment.phase) }}
            />
            <span className={colors.text.muted}>{getPhaseDisplayName(segment.phase)}</span>
          </button>
        ))}
      </div>

      {/* Current phase display */}
      <div className="text-center">
        <span className={`text-sm ${colors.text.secondary}`}>Current: </span>
        <span className={`text-sm font-medium ${colors.text.primary}`}>
          {getCurrentPhase(segments, currentTime)}
        </span>
      </div>
    </div>
  )
}

function getCurrentPhase(segments: PhaseSegment[], currentTime: number): string {
  for (const segment of segments) {
    if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
      return getPhaseDisplayName(segment.phase)
    }
  }
  return 'Unknown'
}
