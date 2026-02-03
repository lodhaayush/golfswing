import { ChevronRight } from 'lucide-react'
import { DETECTOR_RESOURCES } from '@/utils/detectorResources'
import { getMistakeById } from '@/utils/swingMistakes'
import type { SwingMistakeId } from '@/types/swingMistakes'
import { colors } from '@/styles/colors'

interface LearningResourcesProps {
  onMistakeSelect: (mistakeId: SwingMistakeId) => void
}

// Group resources by category
const CATEGORIES = {
  setup: { title: 'Setup & Address', mistakeIds: ['POOR_POSTURE', 'STANCE_WIDTH_ISSUE'] as const },
  backswing: { title: 'Backswing', mistakeIds: ['REVERSE_PIVOT', 'INSUFFICIENT_SHOULDER_TURN', 'OVER_ROTATION', 'BENT_LEAD_ARM', 'LIFTING_HEAD'] as const },
  downswing: { title: 'Downswing', mistakeIds: ['EARLY_EXTENSION', 'HANGING_BACK', 'LOSS_OF_SPINE_ANGLE', 'SLIDING_HIPS'] as const },
  impact: { title: 'Impact', mistakeIds: ['CHICKEN_WING', 'POOR_ARM_EXTENSION', 'HEAD_MOVEMENT'] as const },
  followThrough: { title: 'Follow-Through', mistakeIds: ['INCOMPLETE_FOLLOW_THROUGH', 'UNBALANCED_FINISH', 'REVERSE_C_FINISH'] as const },
  tempo: { title: 'Tempo', mistakeIds: ['POOR_TEMPO_RATIO'] as const },
}

function ResourceCard({
  mistakeId,
  onSelect
}: {
  mistakeId: SwingMistakeId
  onSelect: (id: SwingMistakeId) => void
}) {
  const mistake = getMistakeById(mistakeId)

  return (
    <button
      onClick={() => onSelect(mistakeId)}
      className={`w-full flex items-center gap-3 p-4 rounded-lg ${colors.bg.cardAlt} ${colors.bg.hoverAlt} transition-colors text-left`}
    >
      <div className="flex-1 min-w-0">
        <div className={`${colors.text.primary} font-medium`}>{mistake?.name || mistakeId}</div>
        <div className={`text-sm ${colors.text.secondary} capitalize`}>{mistake?.category}</div>
      </div>
      <ChevronRight className={`w-4 h-4 ${colors.text.subtle} flex-shrink-0`} />
    </button>
  )
}

export function LearningResources({ onMistakeSelect }: LearningResourcesProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className={`text-3xl font-bold ${colors.text.primary} mb-2`}>Learning Resources</h2>
        <p className={colors.text.secondary}>Videos and articles to help fix common swing issues</p>
      </div>

      {Object.entries(CATEGORIES).map(([key, category]) => {
        const resources = category.mistakeIds
          .filter(id => DETECTOR_RESOURCES[id as SwingMistakeId])
          .map(id => id as SwingMistakeId)

        if (resources.length === 0) return null

        return (
          <div key={key} className={`${colors.bg.card} rounded-xl p-6`}>
            <h3 className={`text-xl font-bold ${colors.text.primary} mb-4`}>{category.title}</h3>
            <div className="grid gap-3">
              {resources.map(id => (
                <ResourceCard key={id} mistakeId={id} onSelect={onMistakeSelect} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
