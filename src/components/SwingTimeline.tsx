import { useCallback } from 'react'
import type { PhaseSegment } from '@/types/analysis'
import { getPhaseDisplayName, getPhaseColor } from '@/utils/phaseDetection'

interface SwingTimelineProps {
  segments: PhaseSegment[]
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
}

export function SwingTimeline({
  segments,
  currentTime,
  duration,
  onSeek,
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
      <div className="w-full bg-gray-800 rounded-lg p-4">
        <p className="text-gray-500 text-sm text-center">No phase data available</p>
      </div>
    )
  }

  const currentPercentage = (currentTime / duration) * 100

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-400">Swing Phases</h3>

      {/* Timeline bar */}
      <div
        className="relative h-8 bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
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
              onClick={(e) => {
                e.stopPropagation()
                handlePhaseClick(segment)
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
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
            onClick={() => handlePhaseClick(segment)}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getPhaseColor(segment.phase) }}
            />
            <span className="text-gray-300">{getPhaseDisplayName(segment.phase)}</span>
          </button>
        ))}
      </div>

      {/* Current phase display */}
      <div className="text-center">
        <span className="text-sm text-gray-400">Current: </span>
        <span className="text-sm font-medium text-white">
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
