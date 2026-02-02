import { ChevronDown } from 'lucide-react'
import type { ProVideoReference } from '@/types/proVideo'
import type { CameraAngle } from '@/utils/angleCalculations'
import type { ClubType } from '@/types/analysis'
import { getCompatibleProVideos } from '@/data/proVideos'

interface ProVideoSelectorProps {
  cameraAngle: CameraAngle
  clubType: ClubType
  selected: ProVideoReference | null
  onSelect: (video: ProVideoReference) => void
}

export function ProVideoSelector({
  cameraAngle,
  clubType,
  selected,
  onSelect,
}: ProVideoSelectorProps) {
  const compatibleVideos = getCompatibleProVideos(cameraAngle, clubType)
  const allVideosForAngle = getCompatibleProVideos(cameraAngle)

  // If no videos match both angle and club type, show all videos for the angle
  const availableVideos = compatibleVideos.length > 0 ? compatibleVideos : allVideosForAngle

  if (availableVideos.length === 0) {
    return (
      <div className="px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm">
        No pro videos available for this camera angle
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Compare to:</span>
        <div className="relative">
          <select
            value={selected?.id || ''}
            onChange={(e) => {
              const video = availableVideos.find((v) => v.id === e.target.value)
              if (video) onSelect(video)
            }}
            className="appearance-none px-3 py-2 pr-8 bg-gray-700 text-white text-sm rounded-lg border border-gray-600 focus:outline-none focus:border-green-500 cursor-pointer"
          >
            {!selected && (
              <option value="" disabled>
                Select a pro swing...
              </option>
            )}
            {availableVideos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {compatibleVideos.length === 0 && allVideosForAngle.length > 0 && (
        <p className="text-xs text-yellow-500 mt-1">
          No exact match for {clubType}. Showing all {cameraAngle === 'face-on' ? 'face-on' : 'down the line'} videos.
        </p>
      )}
    </div>
  )
}
