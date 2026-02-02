import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AnalysisResult } from '@/types/analysis'
import type { ProVideoReference } from '@/types/proVideo'
import { getCompatibleProVideos } from '@/data/proVideos'
import { DualVideoPlayer } from './DualVideoPlayer'
import { ProVideoSelector } from './ProVideoSelector'

interface ComparisonViewProps {
  userResult: AnalysisResult
  userVideoUrl: string
  onBack: () => void
}

export function ComparisonView({
  userResult,
  userVideoUrl,
  onBack,
}: ComparisonViewProps) {
  const [selectedProVideo, setSelectedProVideo] = useState<ProVideoReference | null>(null)

  // Auto-select the first compatible pro video
  useEffect(() => {
    const compatible = getCompatibleProVideos(
      userResult.cameraAngle,
      userResult.clubType
    )
    if (compatible.length > 0 && !selectedProVideo) {
      setSelectedProVideo(compatible[0])
    } else if (compatible.length === 0) {
      // Fallback to any video with matching camera angle
      const fallback = getCompatibleProVideos(userResult.cameraAngle)
      if (fallback.length > 0 && !selectedProVideo) {
        setSelectedProVideo(fallback[0])
      }
    }
  }, [userResult.cameraAngle, userResult.clubType, selectedProVideo])

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Results</span>
        </button>

        <ProVideoSelector
          cameraAngle={userResult.cameraAngle}
          clubType={userResult.clubType}
          selected={selectedProVideo}
          onSelect={setSelectedProVideo}
        />
      </div>

      {/* Comparison Content */}
      {selectedProVideo ? (
        <DualVideoPlayer
          userVideoUrl={userVideoUrl}
          proVideoUrl={selectedProVideo.videoUrl}
          userPhases={userResult.phaseSegments}
          proPhases={selectedProVideo.phaseSegments}
          userLabel="Your Swing"
          proLabel={selectedProVideo.name}
          userScore={userResult.overallScore}
        />
      ) : (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">
            No pro videos available for comparison.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Pro videos for {userResult.cameraAngle === 'face-on' ? 'face-on' : 'down the line'} camera angle
            with {userResult.clubType} are not yet available.
          </p>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Tips for Comparison</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>
            Use the phase icons to jump to specific swing positions (address, top, impact, etc.)
          </li>
          <li>
            Use the frame-by-frame controls to examine positions in detail
          </li>
          <li>
            Both videos are synchronized by swing phase, so they stay aligned even if one swing is faster
          </li>
        </ul>
      </div>
    </div>
  )
}
