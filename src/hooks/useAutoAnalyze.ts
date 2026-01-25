import { useEffect, useRef } from 'react'
import { logger } from '@/utils/debugLogger'

interface UseAutoAnalyzeOptions {
  onVideoLoad: (file: File) => Promise<void>
  onAnalyze: () => Promise<void>
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean // Whether the video is loaded and ready for analysis
}

/**
 * Hook that auto-loads a video from the project directory and optionally triggers analysis
 * based on URL query parameters.
 *
 * Usage: Add ?video=filename.mov to auto-load a video
 *        Add ?video=filename.mov&analyze=true to also run analysis
 *
 * Only active in development mode.
 */
export function useAutoAnalyze({
  onVideoLoad,
  onAnalyze,
  videoRef,
  isReady,
}: UseAutoAnalyzeOptions) {
  const hasAutoLoaded = useRef(false)
  const pendingAnalysis = useRef(false)

  // Load video from URL params
  useEffect(() => {
    // Only run in dev mode
    if (!import.meta.env.DEV) return

    // Only run once
    if (hasAutoLoaded.current) return

    const params = new URLSearchParams(window.location.search)
    const videoName = params.get('video')
    const shouldAnalyze = params.get('analyze') === 'true'

    if (!videoName) return

    hasAutoLoaded.current = true
    pendingAnalysis.current = shouldAnalyze

    logger.info(`[AutoAnalyze] Loading local video: ${videoName}, analyze: ${shouldAnalyze}`)

    // Fetch the video from local server
    fetch(`/__local_video/${encodeURIComponent(videoName)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        const file = new File([blob], videoName, { type: blob.type || 'video/mp4' })

        logger.info(`[AutoAnalyze] Video loaded: ${file.name}, size: ${file.size}`)

        await onVideoLoad(file)
      })
      .catch((error) => {
        logger.error('[AutoAnalyze] Failed to load video:', error)
        hasAutoLoaded.current = false // Allow retry
      })
  }, [onVideoLoad])

  // Trigger analysis when video is ready
  useEffect(() => {
    if (!import.meta.env.DEV) return

    if (!pendingAnalysis.current) return

    if (!isReady || !videoRef.current) return

    // Wait for video to have duration (metadata loaded)
    const video = videoRef.current
    if (!video.duration || video.duration === 0) {
      // Wait for metadata
      const handleMetadata = () => {
        if (pendingAnalysis.current) {
          pendingAnalysis.current = false
          logger.info('[AutoAnalyze] Video ready, triggering analysis...')
          onAnalyze()
        }
      }

      video.addEventListener('loadedmetadata', handleMetadata, { once: true })
      return () => video.removeEventListener('loadedmetadata', handleMetadata)
    }

    // Video is already ready
    pendingAnalysis.current = false
    logger.info('[AutoAnalyze] Video already ready, triggering analysis...')
    onAnalyze()
  }, [isReady, videoRef, onAnalyze])
}
