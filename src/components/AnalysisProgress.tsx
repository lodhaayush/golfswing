import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { AnalysisPhase } from '@/hooks/useSwingAnalysis'
import { colors } from '@/styles/colors'

interface AnalysisProgressProps {
  phase: AnalysisPhase
  progress: number
  message: string
  onCancel?: () => void
}

export function AnalysisProgress({ phase, progress, message, onCancel }: AnalysisProgressProps) {
  const isComplete = phase === 'complete'
  const isError = phase === 'error'
  const isActive = !isComplete && !isError && phase !== 'idle'

  const progressPercent = Math.round(progress * 100)

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`${colors.bg.card} rounded-xl p-6 shadow-lg`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isActive && (
              <Loader2 className={`w-5 h-5 ${colors.status.success} animate-spin`} />
            )}
            {isComplete && (
              <CheckCircle className={`w-5 h-5 ${colors.status.success}`} />
            )}
            {isError && (
              <AlertCircle className={`w-5 h-5 ${colors.status.error}`} />
            )}
            <h3 className={`text-lg font-medium ${colors.text.primary}`}>
              {isComplete ? 'Analysis Complete' : isError ? 'Analysis Failed' : 'Analyzing Swing'}
            </h3>
          </div>

          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className={`p-1 ${colors.text.secondary} ${colors.text.hover} transition-colors`}
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3 w-full">
          <div className={`relative w-full h-2 ${colors.progress.track} rounded-full overflow-hidden`}>
            <div
              className={`absolute top-0 left-0 h-full ${
                isError ? colors.progress.error : colors.progress.fill
              }`}
              style={{
                width: `${progressPercent}%`,
                transition: 'width 100ms ease-out'
              }}
            >&nbsp;</div>
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-end text-sm">
          {isError && (
            <span className={colors.status.error}>
              {message}
            </span>
          )}
          {isActive && (
            <span className={`${colors.status.success} font-medium`}>
              {progressPercent}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
