import { ArrowLeft, Youtube, FileText, ExternalLink, AlertTriangle } from 'lucide-react'
import { getMistakeById } from '@/utils/swingMistakes'
import { getResourceForMistake, getResourceLinks } from '@/utils/detectorResources'
import type { SwingMistakeId } from '@/types/swingMistakes'

interface MistakeDetailProps {
  mistakeId: SwingMistakeId
  onBack: () => void
}

export function MistakeDetail({ mistakeId, onBack }: MistakeDetailProps) {
  const mistake = getMistakeById(mistakeId)
  const resource = getResourceForMistake(mistakeId)

  if (!mistake) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
          Mistake not found
        </div>
      </div>
    )
  }

  const { youtubeLinks, articleLinks } = resource
    ? getResourceLinks(resource)
    : { youtubeLinks: [], articleLinks: [] }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Mistake Header */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{mistake.name}</h1>
            <span className="text-sm text-gray-400 capitalize">{mistake.category}</span>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed">{mistake.description}</p>
      </div>

      {/* Learning Resources */}
      {(youtubeLinks.length > 0 || articleLinks.length > 0) && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">How to Fix It</h2>
          <div className="space-y-3">
            {youtubeLinks.map((link, index) => (
              <a
                key={`yt-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <Youtube className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {link.title}
                  </div>
                  <div className="text-sm text-gray-400">YouTube</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            ))}
            {articleLinks.map((link, index) => (
              <a
                key={`art-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {link.title}
                  </div>
                  <div className="text-sm text-gray-400">Article</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No Resources Available */}
      {youtubeLinks.length === 0 && articleLinks.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
          No learning resources available for this mistake yet.
        </div>
      )}
    </div>
  )
}
