import { Clock, RotateCw, User, Zap, Camera, Target, Edit2, AlertTriangle, CheckCircle, Check, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { AnalysisResult, ClubType } from '@/types/analysis'
import type { CameraAngle } from '@/utils/angleCalculations'
import { formatTempoRatio, formatDuration, evaluateTempo } from '@/utils/tempoAnalysis'
import type { DetectorResult } from '@/utils/detectors/types'
import { getCategoryFromMistakeId } from '@/utils/detectors/types'
import { getMistakeById } from '@/utils/swingMistakes'
import type { SwingMistakeId } from '@/types/swingMistakes'
import { colors } from '@/styles/colors'

interface SwingResultsProps {
  result: AnalysisResult
  onUploadNew?: () => void
  onClubTypeChange?: (clubType: ClubType) => void
  onCompare?: () => void
  onMistakeSelect?: (mistakeId: SwingMistakeId) => void
}

function MetricCard({
  label,
  value,
  unit,
  ideal,
  description,
  unreliable,
}: {
  label: string
  value: number | string
  unit?: string
  ideal?: string
  description?: string
  unreliable?: boolean
}) {
  return (
    <div className={`rounded-lg p-4 ${unreliable ? 'bg-gray-100/50 dark:bg-gray-800/50 opacity-50' : colors.bg.cardMuted}`}>
      <div className={`text-sm ${colors.text.secondary} mb-1`}>{label}</div>
      <div className={`text-2xl font-bold ${unreliable ? colors.text.subtle : colors.text.primary}`}>
        {typeof value === 'number' ? Math.round(value) : value}
        {unit && <span className={`text-lg ${colors.text.secondary} ml-1`}>{unit}</span>}
      </div>
      {ideal && <div className={`text-xs ${colors.text.subtle} mt-1`}>Ideal: {ideal}</div>}
      {description && <div className={`text-xs ${colors.text.subtle} mt-1`}>{description}</div>}
    </div>
  )
}

function getSeverityColor(severity: number): string {
  if (severity >= 70) return colors.severity.high
  if (severity >= 40) return colors.severity.medium
  return colors.severity.low
}

function getSeverityBgColor(severity: number): string {
  if (severity >= 70) return colors.severity.highBg
  if (severity >= 40) return colors.severity.mediumBg
  return colors.severity.lowBg
}

function formatMistakeId(id: string): string {
  return id
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

// All 18 active detectors that run on each swing analysis
const ALL_ACTIVE_DETECTOR_IDS: SwingMistakeId[] = [
  // Setup (2)
  'POOR_POSTURE',
  'STANCE_WIDTH_ISSUE',
  // Backswing (5)
  'REVERSE_PIVOT',
  'INSUFFICIENT_SHOULDER_TURN',
  'OVER_ROTATION',
  'BENT_LEAD_ARM',
  'LIFTING_HEAD',
  // Downswing (4)
  'EARLY_EXTENSION',
  'HANGING_BACK',
  'LOSS_OF_SPINE_ANGLE',
  'SLIDING_HIPS',
  // Impact (3)
  'CHICKEN_WING',
  'POOR_ARM_EXTENSION',
  'HEAD_MOVEMENT',
  // Follow-through (3)
  'INCOMPLETE_FOLLOW_THROUGH',
  'UNBALANCED_FINISH',
  'REVERSE_C_FINISH',
  // Tempo (1)
  'POOR_TEMPO_RATIO',
]

function DetectedMistakeItem({ mistake, onSelect }: { mistake: DetectorResult; onSelect?: (mistakeId: SwingMistakeId) => void }) {
  const category = getCategoryFromMistakeId(mistake.mistakeId)

  return (
    <button
      onClick={() => onSelect?.(mistake.mistakeId)}
      className={`w-full text-left p-4 rounded-lg border ${getSeverityBgColor(mistake.severity)} hover:opacity-90 transition-opacity cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${getSeverityColor(mistake.severity)}`} />
          <span className={`font-medium ${colors.text.primary}`}>{formatMistakeId(mistake.mistakeId)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg.input} ${colors.text.secondary} capitalize`}>{category}</span>
        </div>
        <ChevronRight className={`w-4 h-4 ${colors.text.subtle}`} />
      </div>
      <p className={`text-sm ${colors.text.muted} mt-1`}>{mistake.message}</p>
    </button>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return colors.score.excellent
    if (s >= 60) return colors.score.good
    if (s >= 40) return colors.score.needsWork
    return colors.score.poor
  }

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excellent'
    if (s >= 60) return 'Good'
    if (s >= 40) return 'Needs Work'
    return 'Keep Practicing'
  }

  return (
    <div className="text-center">
      <div className={`text-6xl font-bold ${getScoreColor(score)}`}>{score}</div>
      <div className={`${colors.text.secondary} mt-2`}>{getScoreLabel(score)}</div>
    </div>
  )
}

function getCameraAngleLabel(angle: CameraAngle): string {
  switch (angle) {
    case 'face-on':
      return 'Face-On'
    case 'dtl':
      return 'Down the Line'
    case 'oblique':
      return 'Oblique'
  }
}

function getClubTypeLabel(clubType: ClubType): string {
  switch (clubType) {
    case 'driver':
      return 'Driver'
    case 'iron':
      return 'Iron'
    case 'unknown':
      return 'Unknown'
  }
}

export function SwingResults({ result, onUploadNew, onClubTypeChange, onCompare, onMistakeSelect }: SwingResultsProps) {
  const tempoEval = evaluateTempo(result.tempo)
  const isDTL = result.cameraAngle === 'dtl'
  const isFaceOn = result.cameraAngle === 'face-on'
  const [isEditingClub, setIsEditingClub] = useState(false)
  const [selectedClub, setSelectedClub] = useState<ClubType>(result.clubType)
  const [showDetectedIssues, setShowDetectedIssues] = useState(true)
  const [showNotDetected, setShowNotDetected] = useState(false)

  // Calculate not-detected issues (areas looking good)
  const detectedIds = new Set(result.detectedMistakes?.map(m => m.mistakeId) || [])
  const notDetectedIssues = ALL_ACTIVE_DETECTOR_IDS
    .filter(id => !detectedIds.has(id))
    .flatMap(id => {
      const mistake = getMistakeById(id)
      return mistake ? [{ id, name: mistake.name, category: mistake.category, description: mistake.description }] : []
    })

  // Sync selectedClub when result changes (e.g., after re-analysis with override)
  useEffect(() => {
    setSelectedClub(result.clubType)
  }, [result.clubType])

  const handleClubChange = (newClubType: ClubType) => {
    setSelectedClub(newClubType)
    setIsEditingClub(false)
    if (onClubTypeChange) {
      onClubTypeChange(newClubType)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overall Score Card */}
      <div className={`${colors.bg.card} rounded-xl p-6`}>
        <h2 className={`text-xl font-bold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Zap className={`w-5 h-5 ${colors.icon.score}`} />
          Overall Score
        </h2>
        <div className="flex items-center justify-center py-4">
          <ScoreGauge score={result.overallScore} />
        </div>
        <div className={`flex items-center justify-center gap-4 mt-4 text-sm ${colors.text.secondary}`}>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{result.isRightHanded ? 'Right-handed' : 'Left-handed'}</span>
          </div>
          <div className={colors.border.divider}>|</div>
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            <span>{getCameraAngleLabel(result.cameraAngle)}</span>
            {result.cameraAngleConfidence >= 0.8 && (
              <span className={colors.status.successBadge}>(high confidence)</span>
            )}
            {result.cameraAngleConfidence < 0.8 && result.cameraAngleConfidence >= 0.5 && (
              <span className={colors.status.warningBadge}>(medium confidence)</span>
            )}
            {result.cameraAngleConfidence < 0.5 && (
              <span className={colors.status.errorBadge}>(low confidence)</span>
            )}
          </div>
          <div className={colors.border.divider}>|</div>
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            {!isEditingClub ? (
              <>
                <span>{getClubTypeLabel(selectedClub)}</span>
                {result.clubTypeOverridden ? (
                  <span className={`${colors.secondary.text} text-xs flex items-center gap-0.5`}>
                    <Check className="w-3 h-3" />
                    (manual)
                  </span>
                ) : (
                  <>
                    {result.clubTypeConfidence >= 0.8 && (
                      <span className={colors.status.successBadge}>(high confidence)</span>
                    )}
                    {result.clubTypeConfidence < 0.8 && result.clubTypeConfidence >= 0.6 && (
                      <span className={colors.status.warningBadge}>(medium confidence)</span>
                    )}
                    {result.clubTypeConfidence < 0.6 && (
                      <span className={`${colors.text.subtle} text-xs`}>(low confidence)</span>
                    )}
                  </>
                )}
                <button
                  onClick={() => setIsEditingClub(true)}
                  className={`ml-1 p-1 ${colors.bg.hover} rounded transition-colors`}
                  title="Change club type"
                >
                  <Edit2 className={`w-3 h-3 ${colors.text.secondary}`} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedClub}
                  onChange={(e) => handleClubChange(e.target.value as ClubType)}
                  className={`px-2 py-1 ${colors.bg.input} ${colors.text.primary} text-sm rounded border ${colors.border.input} focus:outline-none ${colors.primary.focusBorder}`}
                  autoFocus
                >
                  <option value="driver">Driver</option>
                  <option value="iron">Iron</option>
                  <option value="unknown">Unknown</option>
                </select>
                <button
                  onClick={() => setIsEditingClub(false)}
                  className={`text-xs ${colors.text.secondary} ${colors.text.hover}`}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className={`${colors.bg.card} rounded-xl p-6`}>
        <h2 className={`text-xl font-bold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <RotateCw className={`w-5 h-5 ${colors.icon.rotation}`} />
          Rotation Metrics
          {isDTL && (
            <span className={`text-xs font-normal ${colors.text.subtle} ml-2`}>(limited accuracy for down-the-line view)</span>
          )}
        </h2>
        {isDTL && (
          <div className={`mb-4 px-3 py-2 ${colors.bg.cardAlt} rounded-lg text-sm ${colors.text.secondary}`}>
            Rotation metrics are less reliable from a down-the-line camera angle. For accurate rotation analysis, use a face-on view.
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label="X-Factor"
            value={result.metrics.maxXFactor}
            unit="°"
            ideal="35-65°"
            description="Shoulder-hip separation"
            unreliable={isDTL}
          />
          <MetricCard
            label="Shoulder Turn"
            value={result.metrics.maxShoulderRotation}
            unit="°"
            ideal={isFaceOn ? "55-95°" : "80-110°"}
            unreliable={isDTL}
          />
          <MetricCard
            label="Hip Turn"
            value={result.metrics.maxHipRotation}
            unit="°"
            ideal={isFaceOn ? "25-55°" : "40-60°"}
            unreliable={isDTL}
          />
        </div>
      </div>

      {/* Tempo Metrics */}
      <div className={`${colors.bg.card} rounded-xl p-6`}>
        <h2 className={`text-xl font-bold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <Clock className={`w-5 h-5 ${colors.icon.tempo}`} />
          Tempo Analysis
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Backswing"
            value={formatDuration(result.tempo.backswingDuration)}
          />
          <MetricCard
            label="Downswing"
            value={formatDuration(result.tempo.downswingDuration)}
          />
          <MetricCard
            label="Tempo Ratio"
            value={formatTempoRatio(result.tempo.tempoRatio)}
            ideal="3:1"
          />
          <MetricCard
            label="Tempo Score"
            value={tempoEval.score}
            unit="/100"
          />
        </div>
      </div>

      {/* Posture Metrics */}
      <div className={`${colors.bg.card} rounded-xl p-6`}>
        <h2 className={`text-xl font-bold ${colors.text.primary} mb-4 flex items-center gap-2`}>
          <User className={`w-5 h-5 ${colors.icon.posture}`} />
          Posture & Arm Position
          {isFaceOn && (
            <span className={`text-xs font-normal ${colors.text.subtle} ml-2`}>(spine shows lateral tilt in face-on view)</span>
          )}
        </h2>
        {isFaceOn && (
          <div className={`mb-4 px-3 py-2 ${colors.bg.cardAlt} rounded-lg text-sm ${colors.text.secondary}`}>
            Spine angle in face-on view measures lateral tilt (side bend), not forward bend. Some change is normal for driver swings.
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label="Address Spine Angle"
            value={result.metrics.addressSpineAngle}
            unit="°"
            description={isFaceOn ? "Lateral tilt" : undefined}
            unreliable={isFaceOn}
          />
          <MetricCard
            label="Impact Spine Angle"
            value={result.metrics.impactSpineAngle}
            unit="°"
            description={isFaceOn ? "Lateral tilt (some change normal)" : "Should match address"}
            unreliable={isFaceOn}
          />
          <MetricCard
            label="Lead Arm at Top"
            value={result.metrics.topLeadArmExtension}
            unit="°"
            ideal={isFaceOn ? "140-180°" : "160-180°"}
            description={isFaceOn ? "Perspective may affect reading" : "Straighter is better"}
          />
        </div>
      </div>

      {/* Face-On Specific Metrics - only shown for face-on camera angle */}
      {isFaceOn && (result.metrics.headStability !== undefined || result.metrics.impactExtension !== undefined) && (
        <div className={`${colors.bg.card} rounded-xl p-6`}>
          <h2 className={`text-xl font-bold ${colors.text.primary} mb-4 flex items-center gap-2`}>
            <Target className={`w-5 h-5 ${colors.icon.balance}`} />
            Balance & Extension
            <span className={`text-xs font-normal ${colors.text.subtle} ml-2`}>(face-on view analysis)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {result.metrics.headStability !== undefined && (
              <MetricCard
                label="Head Stability"
                value={`${Math.round((1 - result.metrics.headStability) * 100)}%`}
                description="Higher = steadier head"
              />
            )}
            {result.metrics.impactExtension !== undefined && (
              <MetricCard
                label="Impact Extension"
                value={`${Math.round(result.metrics.impactExtension * 100)}%`}
                description="Arm reach through impact"
              />
            )}
          </div>
        </div>
      )}

      {/* Detected Issues Section */}
      {result.detectedMistakes && result.detectedMistakes.length > 0 && (
        <div className={`${colors.bg.card} rounded-xl overflow-hidden`}>
          <button
            onClick={() => setShowDetectedIssues(!showDetectedIssues)}
            className={`w-full p-6 flex items-center justify-between ${colors.bg.hoverSubtle} transition-colors`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${colors.icon.warning}`} />
              <span className={`text-xl font-bold ${colors.text.primary}`}>Detected Issues</span>
              <span className={`text-sm font-normal ${colors.text.subtle} ml-2`}>
                ({result.detectedMistakes.length} found)
              </span>
            </div>
            {showDetectedIssues ? (
              <ChevronUp className={`w-5 h-5 ${colors.text.secondary}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${colors.text.secondary}`} />
            )}
          </button>
          {showDetectedIssues && (
            <div className="px-6 pb-6 space-y-3">
              {result.detectedMistakes
                .sort((a, b) => b.severity - a.severity)
                .map((mistake, index) => (
                  <DetectedMistakeItem key={index} mistake={mistake} onSelect={onMistakeSelect} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* No Issues Found */}
      {result.detectedMistakes && result.detectedMistakes.length === 0 && (
        <div className={`${colors.bg.card} rounded-xl p-6`}>
          <div className={`flex items-center gap-3 ${colors.status.success}`}>
            <CheckCircle className="w-6 h-6" />
            <span className="text-lg font-medium">No major swing issues detected!</span>
          </div>
          <p className={`${colors.text.secondary} text-sm mt-2`}>
            Your swing mechanics look solid. Keep practicing to maintain consistency.
          </p>
        </div>
      )}

      {/* Areas Looking Good - Collapsed Section */}
      {notDetectedIssues.length > 0 && (
        <div className={`${colors.bg.card} rounded-xl overflow-hidden`}>
          <button
            onClick={() => setShowNotDetected(!showNotDetected)}
            className={`w-full p-6 flex items-center justify-between ${colors.bg.hoverSubtle} transition-colors`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${colors.status.success}`} />
              <span className={`text-xl font-bold ${colors.text.primary}`}>{notDetectedIssues.length} Areas Looking Good</span>
            </div>
            {showNotDetected ? (
              <ChevronUp className={`w-5 h-5 ${colors.text.secondary}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${colors.text.secondary}`} />
            )}
          </button>
          {showNotDetected && (
            <div className="px-6 pb-6 space-y-3">
              {notDetectedIssues.map(item => (
                <button
                  key={item.id}
                  onClick={() => onMistakeSelect?.(item.id)}
                  className={`w-full text-left p-4 rounded-lg border ${colors.status.successBg} hover:opacity-90 transition-opacity cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${colors.status.success}`} />
                      <span className={`font-medium ${colors.text.primary}`}>{item.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg.input} ${colors.text.secondary} capitalize`}>{item.category}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${colors.text.subtle}`} />
                  </div>
                  <p className={`text-sm ${colors.text.muted} mt-1`}>No issues detected</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {onCompare && (
          <button
            onClick={onCompare}
            className={`px-6 py-2 ${colors.secondary.button} font-medium rounded-lg transition-colors`}
          >
            Compare to Pro
          </button>
        )}
        {onUploadNew && (
          <button
            onClick={onUploadNew}
            className={`px-6 py-2 ${colors.primary.button} font-medium rounded-lg transition-colors`}
          >
            Analyze New Video
          </button>
        )}
      </div>
    </div>
  )
}
