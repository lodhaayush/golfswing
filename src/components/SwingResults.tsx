import { TrendingUp, TrendingDown, Minus, Clock, RotateCw, User, Zap, Camera } from 'lucide-react'
import type { AnalysisResult } from '@/types/analysis'
import type { CameraAngle } from '@/utils/angleCalculations'
import { formatTempoRatio, formatDuration, evaluateTempo } from '@/utils/tempoAnalysis'
import { generateSwingFeedback, type SwingFeedback } from '@/utils/swingAnalyzer'

interface SwingResultsProps {
  result: AnalysisResult
  onBackToPlayer?: () => void
  onUploadNew?: () => void
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

function FeedbackItem({ feedback }: { feedback: SwingFeedback }) {
  const icons = {
    positive: <TrendingUp className="w-4 h-4 text-green-400" />,
    suggestion: <Minus className="w-4 h-4 text-yellow-400" />,
    warning: <TrendingDown className="w-4 h-4 text-red-400" />,
  }

  const bgColors = {
    positive: 'bg-green-900/30 border-green-800',
    suggestion: 'bg-yellow-900/30 border-yellow-800',
    warning: 'bg-red-900/30 border-red-800',
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgColors[feedback.type]}`}>
      <div className="mt-0.5">{icons[feedback.type]}</div>
      <p className="text-sm text-gray-300">{feedback.message}</p>
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

export function SwingResults({ result, onBackToPlayer, onUploadNew }: SwingResultsProps) {
  const feedback = generateSwingFeedback(result)
  const tempoEval = evaluateTempo(result.tempo)
  const isDTL = result.cameraAngle === 'dtl'

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
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-blue-400" />
          Rotation Metrics
          {isDTL && (
            <span className="text-xs font-normal text-gray-500 ml-2">(limited accuracy for side view)</span>
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
            ideal="35-55°"
            description="Shoulder-hip separation"
            unreliable={isDTL}
          />
          <MetricCard
            label="Shoulder Turn"
            value={result.metrics.maxShoulderRotation}
            unit="°"
            ideal="80-100°"
            unreliable={isDTL}
          />
          <MetricCard
            label="Hip Turn"
            value={result.metrics.maxHipRotation}
            unit="°"
            ideal="40-55°"
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
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label="Address Spine Angle"
            value={result.metrics.addressSpineAngle}
            unit="°"
          />
          <MetricCard
            label="Impact Spine Angle"
            value={result.metrics.impactSpineAngle}
            unit="°"
            description="Should match address"
          />
          <MetricCard
            label="Lead Arm at Top"
            value={result.metrics.topLeadArmExtension}
            unit="°"
            ideal="160-180°"
            description="Straighter is better"
          />
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Swing Feedback</h2>
        <div className="space-y-3">
          {feedback.map((item, index) => (
            <FeedbackItem key={index} feedback={item} />
          ))}
        </div>
      </div>

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
