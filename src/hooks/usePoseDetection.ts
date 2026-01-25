import { useState, useCallback, useRef, useEffect } from 'react'
import { Pose, Results } from '@mediapipe/pose'
import { logger } from '@/utils/debugLogger'
import type { Landmark } from '@/types/pose'

interface UsePoseDetectionResult {
  isLoading: boolean
  isReady: boolean
  error: string | null
  detectPose: (imageSource: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) => Promise<Landmark[] | null>
  resetModel: () => void
}

// Singleton state for MediaPipe Pose - prevents double initialization in React Strict Mode
let poseInstance: Pose | null = null
let poseInitPromise: Promise<Pose> | null = null
let initializationError: string | null = null

// Reset the singleton to force reinitialization with new options
export function resetPoseDetection(): void {
  if (poseInstance) {
    poseInstance.close()
    poseInstance = null
  }
  poseInitPromise = null
  initializationError = null
}

async function getOrCreatePose(): Promise<Pose> {
  // Return existing instance if available
  if (poseInstance) {
    return poseInstance
  }

  // Return existing promise if initialization is in progress
  if (poseInitPromise) {
    return poseInitPromise
  }

  // Start new initialization
  poseInitPromise = (async () => {
    logger.info('usePoseDetection: Starting model initialization (singleton)...')

    const pose = new Pose({
      locateFile: (file) => {
        logger.info('usePoseDetection: Loading file:', file)
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      },
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false, // Disable smoothing for consistent frame-by-frame analysis
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    logger.info('usePoseDetection: Calling pose.initialize()...')
    await pose.initialize()
    logger.info('usePoseDetection: Model initialized successfully!')

    poseInstance = pose
    return pose
  })()

  return poseInitPromise
}

export function usePoseDetection(): UsePoseDetectionResult {
  const [isLoading, setIsLoading] = useState(!poseInstance)
  const [isReady, setIsReady] = useState(!!poseInstance)
  const [error, setError] = useState<string | null>(initializationError)

  const resultRef = useRef<Landmark[] | null>(null)
  const resolveRef = useRef<((landmarks: Landmark[] | null) => void) | null>(null)
  const callbackSetRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const initPose = async () => {
      // If already initialized, just set up the callback
      if (poseInstance) {
        if (!callbackSetRef.current) {
          poseInstance.onResults((results: Results) => {
            if (results.poseLandmarks) {
              const landmarks: Landmark[] = results.poseLandmarks.map((lm) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility ?? 0,
              }))
              resultRef.current = landmarks
            } else {
              resultRef.current = null
            }

            if (resolveRef.current) {
              resolveRef.current(resultRef.current)
              resolveRef.current = null
            }
          })
          callbackSetRef.current = true
        }
        setIsReady(true)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const pose = await getOrCreatePose()

        if (mounted && !callbackSetRef.current) {
          pose.onResults((results: Results) => {
            if (results.poseLandmarks) {
              const landmarks: Landmark[] = results.poseLandmarks.map((lm) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility ?? 0,
              }))
              resultRef.current = landmarks
            } else {
              resultRef.current = null
            }

            if (resolveRef.current) {
              resolveRef.current(resultRef.current)
              resolveRef.current = null
            }
          })
          callbackSetRef.current = true
        }

        if (mounted) {
          setIsReady(true)
          setIsLoading(false)
          logger.info('usePoseDetection: Model is ready')
        }
      } catch (err) {
        const errorDetails = err instanceof Error
          ? { message: err.message, name: err.name, stack: err.stack }
          : err
        logger.error('usePoseDetection: Error initializing model:', errorDetails)

        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pose detection'
        initializationError = errorMessage

        if (mounted) {
          setError(errorMessage)
          setIsLoading(false)
        }
      }
    }

    initPose()

    return () => {
      mounted = false
      // Don't close the singleton - it persists for the app lifetime
    }
  }, [])

  const detectPose = useCallback(
    async (imageSource: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): Promise<Landmark[] | null> => {
      if (!poseInstance || !isReady) {
        return null
      }

      return new Promise((resolve) => {
        resolveRef.current = resolve
        poseInstance!.send({ image: imageSource })
      })
    },
    [isReady]
  )

  const resetModel = useCallback(() => {
    resetPoseDetection()
    setIsReady(false)
    setIsLoading(true)
    setError(null)
  }, [])

  return {
    isLoading,
    isReady,
    error,
    detectPose,
    resetModel,
  }
}
