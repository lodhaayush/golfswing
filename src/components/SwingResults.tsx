import { Clock, RotateCw, User, Zap, Camera, Target, Edit2, AlertTriangle, CheckCircle, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { AnalysisResult, ClubType } from '@/types/analysis'
import type { CameraAngle } from '@/utils/angleCalculations'
import { formatTempoRatio, formatDuration, evaluateTempo } from '@/utils/tempoAnalysis'
import type { DetectorResult } from '@/utils/detectors/types'
import { getCategoryFromMistakeId } from '@/utils/detectors/types'
import { getMistakeById } from '@/utils/swingMistakes'
import type { SwingMistakeId } from '@/types/swingMistakes'

interface SwingResultsProps {
  result: AnalysisResult
  onBackToPlayer?: () => void
  onUploadNew?: () => void
  onClubTypeChange?: (clubType: ClubType) => void
  onCompare?: () => void
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
    <div className={`rounded-lg p-4 ${unreliable ? 'bg-gray-800/50 opacity-50' : 'bg-gray-700/50'}`}>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${unreliable ? 'text-gray-500' : 'text-white'}`}>
        {typeof value === 'number' ? Math.round(value) : value}
        {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
      </div>
      {ideal && <div className="text-xs text-gray-500 mt-1">Ideal: {ideal}</div>}
      {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
    </div>
  )
}

function getSeverityColor(severity: number): string {
  if (severity >= 70) return 'text-red-400'
  if (severity >= 40) return 'text-yellow-400'
  return 'text-orange-400'
}

function getSeverityBgColor(severity: number): string {
  if (severity >= 70) return 'bg-red-900/30 border-red-800'
  if (severity >= 40) return 'bg-yellow-900/30 border-yellow-800'
  return 'bg-orange-900/30 border-orange-800'
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

function DetectedMistakeItem({ mistake }: { mistake: DetectorResult }) {
  const category = getCategoryFromMistakeId(mistake.mistakeId)

  return (
    <div className={`p-4 rounded-lg border ${getSeverityBgColor(mistake.severity)}`}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className={`w-4 h-4 ${getSeverityColor(mistake.severity)}`} />
        <span className="font-medium text-white">{formatMistakeId(mistake.mistakeId)}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 capitalize">{category}</span>
      </div>
      <p className="text-sm text-gray-300 mt-1">{mistake.message}</p>
    </div>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 60) return 'text-yellow-400'
    if (s >= 40) return 'text-orange-400'
    return 'text-red-400'
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
      <div className="text-gray-400 mt-2">{getScoreLabel(score)}</div>
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

export function SwingResults({ result, onBackToPlayer, onUploadNew, onClubTypeChange, onCompare }: SwingResultsProps) {
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
    .map(id => {
      const mistake = getMistakeById(id)
      return mistake ? { id, name: mistake.name, category: mistake.category, description: mistake.description } : null
    })
    .filter((item): item is { id: SwingMistakeId; name: string; category: string; description: string } => item !== null)

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
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          Overall Score
        </h2>
        <div className="flex items-center justify-center py-4">
          <ScoreGauge score={result.overallScore} />
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{result.isRightHanded ? 'Right-handed' : 'Left-handed'}</span>
          </div>
          <div className="text-gray-600">|</div>
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            <span>{getCameraAngleLabel(result.cameraAngle)}</span>
            {result.cameraAngleConfidence >= 0.8 && (
              <span className="text-green-500 text-xs">(high confidence)</span>
            )}
            {result.cameraAngleConfidence < 0.8 && result.cameraAngleConfidence >= 0.5 && (
              <span className="text-yellow-500 text-xs">(medium confidence)</span>
            )}
            {result.cameraAngleConfidence < 0.5 && (
              <span className="text-red-500 text-xs">(low confidence)</span>
            )}
          </div>
          <div className="text-gray-600">|</div>
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            {!isEditingClub ? (
              <>
                <span>{getClubTypeLabel(selectedClub)}</span>
                {result.clubTypeOverridden ? (
                  <span className="text-blue-400 text-xs flex items-center gap-0.5">
                    <Check className="w-3 h-3" />
                    (manual)
                  </span>
                ) : (
                  <>
                    {result.clubTypeConfidence >= 0.8 && (
                      <span className="text-green-500 text-xs">(high confidence)</span>
                    )}
                    {result.clubTypeConfidence < 0.8 && result.clubTypeConfidence >= 0.6 && (
                      <span className="text-yellow-500 text-xs">(medium confidence)</span>
                    )}
                    {result.clubTypeConfidence < 0.6 && (
                      <span className="text-gray-500 text-xs">(low confidence)</span>
                    )}
                  </>
                )}
                <button
                  onClick={() => setIsEditingClub(true)}
                  className="ml-1 p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Change club type"
                >
                  <Edit2 className="w-3 h-3 text-gray-400" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedClub}
                  onChange={(e) => handleClubChange(e.target.value as ClubType)}
                  className="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:border-green-500"
                  autoFocus
                >
                  <option value="driver">Driver</option>
                  <option value="iron">Iron</option>
                  <option value="unknown">Unknown</option>
                </select>
                <button
                  onClick={() => setIsEditingClub(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-blue-400" />
          Rotation Metrics
          {isDTL && (
            <span className="text-xs font-normal text-gray-500 ml-2">(limited accuracy for down-the-line view)</span>
          )}
        </h2>
        {isDTL && (
          <div className="mb-4 px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-gray-400">
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
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
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
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-orange-400" />
          Posture & Arm Position
          {isFaceOn && (
            <span className="text-xs font-normal text-gray-500 ml-2">(spine shows lateral tilt in face-on view)</span>
          )}
        </h2>
        {isFaceOn && (
          <div className="mb-4 px-3 py-2 bg-gray-700/50 rounded-lg text-sm text-gray-400">
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
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Balance & Extension
            <span className="text-xs font-normal text-gray-500 ml-2">(face-on view analysis)</span>
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
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDetectedIssues(!showDetectedIssues)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold text-white">Detected Issues</span>
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({result.detectedMistakes.length} found)
              </span>
            </div>
            {showDetectedIssues ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showDetectedIssues && (
            <div className="px-6 pb-6 space-y-3">
              {result.detectedMistakes
                .sort((a, b) => b.severity - a.severity)
                .map((mistake, index) => (
                  <DetectedMistakeItem key={index} mistake={mistake} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* No Issues Found */}
      {result.detectedMistakes && result.detectedMistakes.length === 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle className="w-6 h-6" />
            <span className="text-lg font-medium">No major swing issues detected!</span>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Your swing mechanics look solid. Keep practicing to maintain consistency.
          </p>
        </div>
      )}

      {/* Areas Looking Good - Collapsed Section */}
      {notDetectedIssues.length > 0 && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowNotDetected(!showNotDetected)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-xl font-bold text-white">{notDetectedIssues.length} Areas Looking Good</span>
            </div>
            {showNotDetected ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showNotDetected && (
            <div className="px-6 pb-6 space-y-3">
              {notDetectedIssues.map(item => (
                <div key={item.id} className="p-4 rounded-lg border bg-green-900/30 border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 capitalize">{item.category}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">No issues detected</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {onBackToPlayer && (
          <button
            onClick={onBackToPlayer}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Back to Player
          </button>
        )}
        {onCompare && (
          <button
            onClick={onCompare}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            Compare to Pro
          </button>
        )}
        {onUploadNew && (
          <button
            onClick={onUploadNew}
            className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
          >
            Analyze New Video
          </button>
        )}
      </div>
    </div>
  )
}
