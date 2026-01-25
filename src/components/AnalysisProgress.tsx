import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { AnalysisPhase } from '@/hooks/useSwingAnalysis'

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
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isActive && (
              <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
            )}
            {isComplete && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {isError && (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <h3 className="text-lg font-medium text-white">
              {isComplete ? 'Analysis Complete' : isError ? 'Analysis Failed' : 'Analyzing Swing'}
            </h3>
          </div>

          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-3 w-full">
          <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full ${
                isError ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{
                width: `${progressPercent}%`,
                transition: 'width 100ms ease-out'
              }}
            >&nbsp;</div>
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-between text-sm">
          <span className={isError ? 'text-red-400' : 'text-gray-400'}>
            {message}
          </span>
          {isActive && (
            <span className="text-green-400 font-medium">
              {progressPercent}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
