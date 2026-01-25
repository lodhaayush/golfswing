import { useCallback, useRef } from 'react'

interface FrameData {
  canvas: HTMLCanvasElement
  timestamp: number
  frameIndex: number
}

interface ExtractFramesOptions {
  fps?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

interface UseFrameExtractorResult {
  extractFrames: (
    video: HTMLVideoElement,
    options?: ExtractFramesOptions
  ) => AsyncGenerator<FrameData, void, unknown>
}

export function useFrameExtractor(): UseFrameExtractorResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  const extractFrames = useCallback(
    async function* (
      video: HTMLVideoElement,
      options: ExtractFramesOptions = {}
    ): AsyncGenerator<FrameData, void, unknown> {
      const { fps = 15, onProgress, signal } = options

      // Ensure video is loaded
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const handleLoaded = () => {
            video.removeEventListener('loadeddata', handleLoaded)
            resolve()
          }
          const handleError = () => {
            video.removeEventListener('error', handleError)
            reject(new Error('Failed to load video'))
          }
          video.addEventListener('loadeddata', handleLoaded)
          video.addEventListener('error', handleError)
        })
      }

      const duration = video.duration
      const frameInterval = 1 / fps
      const totalFrames = Math.floor(duration * fps)

      // Create or reuse canvas
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (!ctxRef.current || ctxRef.current.canvas !== canvas) {
        ctxRef.current = canvas.getContext('2d')
      }
      const ctx = ctxRef.current

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Pause video for frame extraction
      video.pause()

      let frameIndex = 0

      for (let time = 0; time < duration; time += frameInterval) {
        // Check for cancellation
        if (signal?.aborted) {
          return
        }

        // Seek to time
        video.currentTime = time

        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked)
            resolve()
          }
          video.addEventListener('seeked', handleSeeked)
        })

        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Report progress
        if (onProgress) {
          onProgress((frameIndex + 1) / totalFrames)
        }

        yield {
          canvas,
          timestamp: time,
          frameIndex,
        }

        frameIndex++
      }
    },
    []
  )

  return {
    extractFrames,
  }
}
