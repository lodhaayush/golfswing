import { useState, useCallback, useEffect, useRef } from 'react'
import { del, keys } from 'idb-keyval'
import { BookOpen, Lightbulb, Upload, BarChart2 } from 'lucide-react'
import { colors } from '@/styles/colors'
import { ThemeToggle } from '@/components/ThemeToggle'
import { VideoUploader } from '@/components/VideoUploader'
import { VideoPlayer } from '@/components/VideoPlayer'
import { AnalysisProgress } from '@/components/AnalysisProgress'
import { SwingResults } from '@/components/SwingResults'
import { SwingTimeline } from '@/components/SwingTimeline'
import { ComparisonView } from '@/components/ComparisonView'
import { LearningResources } from '@/components/LearningResources'
import { MistakeDetail } from '@/components/MistakeDetail'
import { useVideoStorage } from '@/hooks/useVideoStorage'
import { useSwingAnalysis } from '@/hooks/useSwingAnalysis'
import { useAutoAnalyze } from '@/hooks/useAutoAnalyze'
import { analyzeSwing } from '@/utils/swingAnalyzer'
import { logger } from '@/utils/debugLogger'
import type { VideoFile } from '@/types/video'
import type { AnalysisResult, ClubType } from '@/types/analysis'
import type { SwingMistakeId } from '@/types/swingMistakes'

type AppState = 'upload' | 'player' | 'analyzing' | 'results' | 'comparison' | 'learning' | 'mistakeDetail'

function App() {
  const [appState, setAppState] = useState<AppState>('upload')
  const [previousAppState, setPreviousAppState] = useState<AppState>('upload')
  const [selectedMistakeId, setSelectedMistakeId] = useState<SwingMistakeId | null>(null)
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)

  const { saveVideo, getVideoUrl, revokeVideoUrl } = useVideoStorage()
  const { progress, startAnalysis, cancelAnalysis } = useSwingAnalysis()

  // One-time cleanup of old analysis history from IndexedDB
  useEffect(() => {
    const cleanupOldAnalyses = async () => {
      try {
        const allKeys = await keys()
        const analysisKeys = allKeys.filter(
          (key) => typeof key === 'string' && key.startsWith('analysis_')
        )
        if (analysisKeys.length > 0) {
          logger.info(`Cleaning up ${analysisKeys.length} old analyses from IndexedDB`)
          for (const key of analysisKeys) {
            await del(key)
          }
          logger.info('Cleanup complete')
        }
      } catch (error) {
        logger.error('Failed to cleanup old analyses:', error)
      }
    }
    cleanupOldAnalyses()
  }, [])

  // Track video duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl])

  // Clean up video URL when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (videoUrl) {
        revokeVideoUrl(videoUrl)
      }
    }
  }, [videoUrl, revokeVideoUrl])

  const handleVideoSelect = useCallback(async (file: File) => {
    // Revoke previous URL if exists
    if (videoUrl) {
      revokeVideoUrl(videoUrl)
    }

    // Save video to IndexedDB
    const savedVideo = await saveVideo(file)
    setCurrentVideo(savedVideo)

    // Create URL for playback
    const url = getVideoUrl(savedVideo)
    setVideoUrl(url)

    // Reset analysis
    setAnalysisResult(null)

    // Transition to player
    setAppState('player')
  }, [saveVideo, getVideoUrl, revokeVideoUrl, videoUrl])

  const handleUploadNew = useCallback(() => {
    if (videoUrl) {
      revokeVideoUrl(videoUrl)
    }
    setVideoUrl(null)
    setCurrentVideo(null)
    setAnalysisResult(null)
    setAppState('upload')
  }, [videoUrl, revokeVideoUrl])

  const handleAnalyze = useCallback(async () => {
    logger.info('handleAnalyze called')
    logger.info('videoRef.current exists:', !!videoRef.current)
    logger.info('currentVideo:', currentVideo ? { id: currentVideo.id, name: currentVideo.name } : null)

    if (!videoRef.current || !currentVideo) {
      logger.error('Video element or video data not available')
      return
    }

    setAppState('analyzing')
    logger.info('Starting analysis, calling startAnalysis...')

    try {
      const frames = await startAnalysis(videoRef.current)
      logger.info('Analysis returned frames:', frames.length)

      if (frames.length > 0) {
        // Run full swing analysis
        const result = analyzeSwing(frames, currentVideo.id)

        // Log detailed analysis results for debugging variance
        logger.info('=== ANALYSIS RESULTS ===')
        logger.info('Video:', currentVideo.name)
        logger.info('Overall Score:', result.overallScore)
        logger.info('Handedness:', result.isRightHanded ? 'Right' : 'Left')
        logger.info('Metrics:', {
          maxXFactor: result.metrics.maxXFactor,
          maxShoulderRotation: result.metrics.maxShoulderRotation,
          maxHipRotation: result.metrics.maxHipRotation,
          addressSpineAngle: result.metrics.addressSpineAngle,
          impactSpineAngle: result.metrics.impactSpineAngle,
          topLeadArmExtension: result.metrics.topLeadArmExtension,
          impactLeadArmExtension: result.metrics.impactLeadArmExtension,
          addressKneeFlex: result.metrics.addressKneeFlex,
          topKneeFlex: result.metrics.topKneeFlex,
        })
        logger.info('Tempo:', {
          backswingDuration: result.tempo.backswingDuration,
          downswingDuration: result.tempo.downswingDuration,
          tempoRatio: result.tempo.tempoRatio,
        })
        logger.info('Phase Segments:', result.phaseSegments.length)
        logger.info('=== END RESULTS ===')

        // Log phase segments in copy-paste format for proVideos.ts
        const phaseSegmentsCode = result.phaseSegments.map(seg =>
          `      { phase: '${seg.phase}' as SwingPhase, startFrame: ${seg.startFrame}, endFrame: ${seg.endFrame}, startTime: ${seg.startTime.toFixed(3)}, endTime: ${seg.endTime.toFixed(3)}, duration: ${seg.duration.toFixed(3)} },`
        ).join('\n')
        console.log('\n=== COPY THIS TO proVideos.ts phaseSegments ===\n')
        console.log('phaseSegments: [')
        console.log(phaseSegmentsCode)
        console.log('],')
        console.log('\n=== END COPY ===\n')

        setAnalysisResult(result)
        setAppState('results')
      } else {
        // Analysis was cancelled or failed
        logger.warn('No frames returned, going back to player')
        setAppState('player')
      }
    } catch (err) {
      logger.error('handleAnalyze error:', err instanceof Error ? { message: err.message, stack: err.stack } : err)
      setAppState('player')
    }
  }, [startAnalysis, currentVideo])

  const handleCancelAnalysis = useCallback(() => {
    cancelAnalysis()
    setAppState('player')
  }, [cancelAnalysis])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }, [])

  const handleCompare = useCallback(() => {
    setAppState('comparison')
  }, [])

  const handleBackToResults = useCallback(() => {
    setAppState('results')
  }, [])

  const handleGoToLearning = useCallback(() => {
    if (appState !== 'learning') {
      setPreviousAppState(appState)
    }
    setAppState('learning')
  }, [appState])

  const handleGoToAnalyze = useCallback(() => {
    if (currentVideo && videoUrl) {
      setAppState('player')
    } else {
      setAppState('upload')
    }
  }, [currentVideo, videoUrl])

  const handleGoToResults = useCallback(() => {
    if (analysisResult) {
      setAppState('results')
    }
  }, [analysisResult])

  const handleBackFromLearning = useCallback(() => {
    setAppState(previousAppState)
  }, [previousAppState])

  const handleGoToMistakeDetail = useCallback((mistakeId: SwingMistakeId) => {
    setPreviousAppState(appState)
    setSelectedMistakeId(mistakeId)
    setAppState('mistakeDetail')
  }, [appState])

  const handleClubTypeChange = useCallback((newClubType: ClubType) => {
    if (!analysisResult || !currentVideo) return

    logger.info('Club type override:', { newClubType, previousClubType: analysisResult.clubType })

    // Re-run analysis with the overridden club type using existing frames
    const result = analyzeSwing(analysisResult.frames, currentVideo.id, {
      clubTypeOverride: newClubType,
    })

    logger.info('Re-analysis complete with club type override:', {
      clubType: result.clubType,
      clubTypeOverridden: result.clubTypeOverridden,
      overallScore: result.overallScore,
    })

    setAnalysisResult(result)
  }, [analysisResult, currentVideo])

  // Auto-load video from URL params (dev mode only)
  useAutoAnalyze({
    onVideoLoad: handleVideoSelect,
    onAnalyze: handleAnalyze,
    videoRef,
    isReady: appState === 'player' && !!videoUrl,
  })

  return (
    <div className={`min-h-screen ${colors.bg.page} ${colors.text.primary}`}>
      {/* Header */}
      <header className={`border-b ${colors.border.default} ${colors.bg.header}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${colors.primary.text}`}>Golf Swing Coach</h1>
            <p className={`${colors.text.secondary} text-sm`}>Analyze your swing with AI-powered pose detection</p>
          </div>
          <nav className="flex items-center gap-2">
            {/* Analyze Tab */}
            <button
              onClick={handleGoToAnalyze}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                appState === 'upload' || appState === 'player' || appState === 'analyzing'
                  ? colors.primary.active
                  : `${colors.text.secondary} ${colors.text.hover} ${colors.bg.hover}`
              }`}
              disabled={appState === 'analyzing'}
            >
              <Upload className="w-4 h-4" />
              Analyze
            </button>

            {/* Results Tab */}
            <button
              onClick={handleGoToResults}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                appState === 'results' || appState === 'comparison'
                  ? colors.primary.active
                  : !analysisResult
                    ? `${colors.text.subtle} cursor-not-allowed`
                    : `${colors.text.secondary} ${colors.text.hover} ${colors.bg.hover}`
              }`}
              disabled={appState === 'analyzing' || !analysisResult}
            >
              <BarChart2 className="w-4 h-4" />
              Results
            </button>

            {/* Learn Tab */}
            <button
              onClick={handleGoToLearning}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                appState === 'learning' || appState === 'mistakeDetail'
                  ? colors.primary.active
                  : `${colors.text.secondary} ${colors.text.hover} ${colors.bg.hover}`
              }`}
              disabled={appState === 'analyzing'}
            >
              <BookOpen className="w-4 h-4" />
              Learn
            </button>

            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {appState === 'upload' && (
          <div className="space-y-8">
            <VideoUploader onVideoSelect={handleVideoSelect} />

            {/* Tips Section */}
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className={`w-5 h-5 ${colors.text.secondary}`} />
                <h3 className={`text-lg font-medium ${colors.text.primary}`}>Tips for best results</h3>
              </div>
              <ul className={`space-y-2 ${colors.text.muted}`}>
                <li className="flex items-baseline gap-2">
                  <span className={colors.text.secondary}>1.</span>
                  <span>Trim your video to show just the swing</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className={colors.text.secondary}>2.</span>
                  <span>Use normal speed for best results — slow-motion can reduce accuracy</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className={colors.text.secondary}>3.</span>
                  <span>Film from down the line or face-on, with your full body in frame</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {(appState === 'player' || appState === 'analyzing') && videoUrl && (
          <div className="space-y-6">
            <div className={appState === 'analyzing' ? 'opacity-50 pointer-events-none' : ''}>
              <VideoPlayer
                src={videoUrl}
                videoRef={videoRef}
                onAnalyze={appState === 'player' ? handleAnalyze : undefined}
                onUploadNew={appState === 'player' ? handleUploadNew : undefined}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            {appState === 'analyzing' && (
              <AnalysisProgress
                phase={progress.phase}
                progress={progress.progress}
                message={progress.message}
                onCancel={handleCancelAnalysis}
              />
            )}
          </div>
        )}

        {appState === 'results' && analysisResult && (
          <div className="space-y-6">
            {videoUrl && (
              <VideoPlayer
                src={videoUrl}
                videoRef={videoRef}
                poseFrames={analysisResult.frames}
                onTimeUpdate={handleTimeUpdate}
              />
            )}

            {/* Swing Timeline */}
            <SwingTimeline
              segments={analysisResult.phaseSegments}
              currentTime={currentTime}
              duration={videoDuration}
              onSeek={handleSeek}
              onRerunAnalysis={handleAnalyze}
            />

            <SwingResults
              result={analysisResult}
              onUploadNew={handleUploadNew}
              onClubTypeChange={handleClubTypeChange}
              onCompare={handleCompare}
              onMistakeSelect={handleGoToMistakeDetail}
            />
          </div>
        )}

        {appState === 'comparison' && analysisResult && videoUrl && (
          <ComparisonView
            userResult={analysisResult}
            userVideoUrl={videoUrl}
            onBack={handleBackToResults}
          />
        )}

        {appState === 'learning' && (
          <LearningResources onMistakeSelect={handleGoToMistakeDetail} />
        )}

        {appState === 'mistakeDetail' && selectedMistakeId && (
          <MistakeDetail
            mistakeId={selectedMistakeId}
            onBack={handleBackFromLearning}
          />
        )}
      </main>
    </div>
  )
}

export default App
