import { useState, useCallback, useRef, useEffect } from 'react'
import { usePoseDetection } from './usePoseDetection'
import { useFrameExtractor } from './useFrameExtractor'
import { logger } from '@/utils/debugLogger'
import type { PoseFrame } from '@/types/pose'

export type AnalysisPhase = 'idle' | 'loading_model' | 'extracting_frames' | 'detecting_poses' | 'complete' | 'error'

interface AnalysisProgress {
  phase: AnalysisPhase
  progress: number
  message: string
}

interface UseSwingAnalysisResult {
  isAnalyzing: boolean
  progress: AnalysisProgress
  frames: PoseFrame[]
  error: string | null
  startAnalysis: (video: HTMLVideoElement) => Promise<PoseFrame[]>
  cancelAnalysis: () => void
}

export function useSwingAnalysis(): UseSwingAnalysisResult {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress>({
    phase: 'idle',
    progress: 0,
    message: '',
  })
  const [frames, setFrames] = useState<PoseFrame[]>([])
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const { isLoading: modelLoading, isReady: modelReady, error: modelError, detectPose } = usePoseDetection()
  const { extractFrames } = useFrameExtractor()

  // Use refs to track current model state (avoids stale closures)
  const modelLoadingRef = useRef(modelLoading)
  const modelReadyRef = useRef(modelReady)
  const modelErrorRef = useRef(modelError)

  useEffect(() => {
    modelLoadingRef.current = modelLoading
    modelReadyRef.current = modelReady
    modelErrorRef.current = modelError
  }, [modelLoading, modelReady, modelError])

  const startAnalysis = useCallback(
    async (video: HTMLVideoElement): Promise<PoseFrame[]> => {
      logger.info('startAnalysis called')
      logger.info('startAnalysis - video readyState:', video.readyState)
      logger.info('startAnalysis - video duration:', video.duration)
      logger.info('startAnalysis - modelReady:', modelReadyRef.current)
      logger.info('startAnalysis - modelLoading:', modelLoadingRef.current)
      logger.info('startAnalysis - modelError:', modelErrorRef.current)

      // Reset state
      setIsAnalyzing(true)
      setError(null)
      setFrames([])

      // Create abort controller
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        // Wait for model to load if needed
        if (!modelReadyRef.current) {
          logger.info('startAnalysis - waiting for model to load')
          setProgress({
            phase: 'loading_model',
            progress: 0,
            message: 'Loading pose detection model...',
          })

          // Wait for model to be ready (using refs for current values)
          await new Promise<void>((resolve, reject) => {
            const checkReady = setInterval(() => {
              if (signal.aborted) {
                clearInterval(checkReady)
                reject(new Error('Cancelled'))
              }
              if (modelReadyRef.current) {
                clearInterval(checkReady)
                resolve()
              }
              if (modelErrorRef.current) {
                clearInterval(checkReady)
                reject(new Error(modelErrorRef.current))
              }
            }, 100)
          })
        }

        if (!modelReadyRef.current) {
          throw new Error('Pose detection model not ready')
        }

        logger.info('startAnalysis - model ready, extracting frames')

        // Extract frames
        setProgress({
          phase: 'extracting_frames',
          progress: 0,
          message: 'Extracting video frames...',
        })

        const extractedFrames: { canvas: HTMLCanvasElement; timestamp: number; frameIndex: number }[] = []
        const frameGenerator = extractFrames(video, {
          fps: 15,
          signal,
          onProgress: (p) => {
            setProgress({
              phase: 'extracting_frames',
              progress: p * 0.99, // 0-99% for extraction (slower task)
              message: `Extracting frames... ${Math.round(p * 100)}%`,
            })
          },
        })

        logger.info('startAnalysis - starting frame extraction loop')

        for await (const frame of frameGenerator) {
          if (signal.aborted) {
            throw new Error('Cancelled')
          }
          // Clone the canvas content since we reuse the canvas
          const clonedCanvas = document.createElement('canvas')
          clonedCanvas.width = frame.canvas.width
          clonedCanvas.height = frame.canvas.height
          const clonedCtx = clonedCanvas.getContext('2d')
          if (clonedCtx) {
            clonedCtx.drawImage(frame.canvas, 0, 0)
          }
          extractedFrames.push({
            canvas: clonedCanvas,
            timestamp: frame.timestamp,
            frameIndex: frame.frameIndex,
          })
        }

        logger.info('startAnalysis - extracted frames:', extractedFrames.length)

        // Detect poses for each frame
        setProgress({
          phase: 'detecting_poses',
          progress: 0.99,
          message: 'Detecting poses...',
        })

        const poseFrames: PoseFrame[] = []
        const totalFrames = extractedFrames.length

        logger.info('startAnalysis - detecting poses for frames:', totalFrames)

        for (let i = 0; i < extractedFrames.length; i++) {
          if (signal.aborted) {
            throw new Error('Cancelled')
          }

          const frame = extractedFrames[i]
          const landmarks = await detectPose(frame.canvas)

          if (landmarks) {
            poseFrames.push({
              frameIndex: frame.frameIndex,
              timestamp: frame.timestamp,
              landmarks,
            })
          }

          const poseProgress = (i + 1) / totalFrames
          setProgress({
            phase: 'detecting_poses',
            progress: 0.99 + poseProgress * 0.01, // 99-100% for pose detection
            message: `Analyzing pose ${i + 1}/${totalFrames}...`,
          })
        }

        logger.info('startAnalysis - pose detection complete, frames with poses:', poseFrames.length)

        setFrames(poseFrames)
        setProgress({
          phase: 'complete',
          progress: 1,
          message: 'Analysis complete!',
        })

        setIsAnalyzing(false)
        return poseFrames
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed'
        logger.error('startAnalysis error:', err instanceof Error ? { message: err.message, stack: err.stack } : err)
        if (message !== 'Cancelled') {
          setError(message)
          setProgress({
            phase: 'error',
            progress: 0,
            message,
          })
        }
        setIsAnalyzing(false)
        return []
      }
    },
    [detectPose, extractFrames]
  )

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsAnalyzing(false)
    setProgress({
      phase: 'idle',
      progress: 0,
      message: '',
    })
  }, [])

  return {
    isAnalyzing,
    progress,
    frames,
    error,
    startAnalysis,
    cancelAnalysis,
  }
}
