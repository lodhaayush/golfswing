import { ArrowLeft, Youtube, FileText, ExternalLink, AlertTriangle } from 'lucide-react'
import { getMistakeById } from '@/utils/swingMistakes'
import { getResourceForMistake, getResourceLinks } from '@/utils/detectorResources'
import type { SwingMistakeId } from '@/types/swingMistakes'
import { colors } from '@/styles/colors'

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
          className={`flex items-center gap-2 ${colors.text.secondary} ${colors.text.hover} transition-colors mb-6`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className={`${colors.bg.card} rounded-xl p-6 text-center ${colors.text.secondary}`}>
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
        className={`flex items-center gap-2 ${colors.text.secondary} ${colors.text.hover} transition-colors`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Mistake Header */}
      <div className={`${colors.bg.card} rounded-xl p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className={`w-8 h-8 ${colors.icon.warning}`} />
          <div>
            <h1 className={`text-2xl font-bold ${colors.text.primary}`}>{mistake.name}</h1>
            <span className={`text-sm ${colors.text.secondary} capitalize`}>{mistake.category}</span>
          </div>
        </div>
        <p className={`${colors.text.muted} leading-relaxed`}>{mistake.description}</p>
      </div>

      {/* Learning Resources */}
      {(youtubeLinks.length > 0 || articleLinks.length > 0) && (
        <div className={`${colors.bg.card} rounded-xl p-6`}>
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-4`}>How to Fix It</h2>
          <div className="space-y-3">
            {youtubeLinks.map((link, index) => (
              <a
                key={`yt-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-lg ${colors.bg.cardAlt} ${colors.bg.hoverAlt} transition-colors`}
              >
                <Youtube className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className={`${colors.text.primary} font-medium`}>
                    {link.title}
                  </div>
                  <div className={`text-sm ${colors.text.secondary}`}>YouTube</div>
                </div>
                <ExternalLink className={`w-4 h-4 ${colors.text.subtle}`} />
              </a>
            ))}
            {articleLinks.map((link, index) => (
              <a
                key={`art-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-lg ${colors.bg.cardAlt} ${colors.bg.hoverAlt} transition-colors`}
              >
                <FileText className={`w-6 h-6 ${colors.status.info} flex-shrink-0`} />
                <div className="flex-1">
                  <div className={`${colors.text.primary} font-medium`}>
                    {link.title}
                  </div>
                  <div className={`text-sm ${colors.text.secondary}`}>Article</div>
                </div>
                <ExternalLink className={`w-4 h-4 ${colors.text.subtle}`} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No Resources Available */}
      {youtubeLinks.length === 0 && articleLinks.length === 0 && (
        <div className={`${colors.bg.card} rounded-xl p-6 text-center ${colors.text.secondary}`}>
          No learning resources available for this mistake yet.
        </div>
      )}
    </div>
  )
}
