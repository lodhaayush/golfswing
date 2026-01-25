import { Clock, Trash2, ChevronRight } from 'lucide-react'
import type { SavedAnalysis } from '@/hooks/useAnalysisHistory'

interface HistoryPanelProps {
  history: SavedAnalysis[]
  isLoading: boolean
  onSelect: (analysis: SavedAnalysis) => void
  onDelete: (id: string) => void
}

export function HistoryPanel({
  history,
  isLoading,
  onSelect,
  onDelete,
}: HistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Previous Analyses</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Previous Analyses</h3>
        <p className="text-gray-500 text-sm text-center py-4">
          No previous analyses found. Upload a video to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Previous Analyses</h3>
      <div className="space-y-3">
        {history.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
          >
            {/* Thumbnail placeholder */}
            <div className="w-16 h-12 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>

            {/* Info */}
            <button
              onClick={() => onSelect(item)}
              className="flex-1 text-left"
            >
              <p className="font-medium text-sm truncate">{item.videoName}</p>
              <p className="text-xs text-gray-400">
                Score: {item.result.overallScore}/100 •{' '}
                {formatDate(item.createdAt)}
              </p>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(item.id)
                }}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelect(item)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {history.length > 5 && (
          <p className="text-center text-gray-500 text-sm pt-2">
            +{history.length - 5} more analyses
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
