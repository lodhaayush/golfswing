import { useRef, useEffect, useCallback, useState } from 'react'
import type { Landmark } from '@/types/pose'
import {
  POSE_CONNECTIONS,
  getPointSize,
  getLineWidth,
} from '@/utils/poseConnections'

const POSE_COLOR = '#10B981' // green-500

interface PoseOverlayProps {
  landmarks: Landmark[] | null
  videoWidth: number
  videoHeight: number
  containerRef: React.RefObject<HTMLDivElement>
  visible?: boolean
}

interface VideoDisplayArea {
  offsetX: number
  offsetY: number
  displayWidth: number
  displayHeight: number
}

function calculateVideoDisplayArea(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
): VideoDisplayArea {
  // Calculate how the video is displayed with object-fit: contain
  const containerAspect = containerWidth / containerHeight
  const videoAspect = videoWidth / videoHeight

  let displayWidth: number
  let displayHeight: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > containerAspect) {
    // Video is wider than container - letterbox top/bottom
    displayWidth = containerWidth
    displayHeight = containerWidth / videoAspect
    offsetX = 0
    offsetY = (containerHeight - displayHeight) / 2
  } else {
    // Video is taller than container - letterbox left/right
    displayHeight = containerHeight
    displayWidth = containerHeight * videoAspect
    offsetX = (containerWidth - displayWidth) / 2
    offsetY = 0
  }

  return { offsetX, offsetY, displayWidth, displayHeight }
}

export function PoseOverlay({
  landmarks,
  videoWidth,
  videoHeight,
  containerRef,
  visible = true,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Track container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      setCanvasSize({ width: rect.width, height: rect.height })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [containerRef])

  const drawPose = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: Landmark[]) => {
      const { width, height } = canvasSize

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      if (!visible || landmarks.length === 0 || width === 0 || height === 0) return

      // Calculate where the video is actually displayed (accounting for letterboxing)
      const displayArea = calculateVideoDisplayArea(width, height, videoWidth, videoHeight)
      const { offsetX, offsetY, displayWidth, displayHeight } = displayArea

      // Draw connections first (so points are on top)
      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const start = landmarks[startIdx]
        const end = landmarks[endIdx]

        if (!start || !end) continue

        // Skip if visibility is too low
        if (start.visibility < 0.1 || end.visibility < 0.1) continue

        // Calculate screen coordinates with offset for letterboxing
        const startX = offsetX + start.x * displayWidth
        const startY = offsetY + start.y * displayHeight
        const endX = offsetX + end.x * displayWidth
        const endY = offsetY + end.y * displayHeight

        // Get styling based on visibility
        const lineWidth = getLineWidth(start.visibility, end.visibility, 3)

        // Draw line
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = POSE_COLOR
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      // Calculate and draw synthesized neck point (midpoint of shoulders)
      const leftShoulder = landmarks[11]
      const rightShoulder = landmarks[12]

      // Calculate head centroid from all face landmarks (0-10)
      const faceLandmarkIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      let headX = 0, headY = 0, headVisibility = 0, validFaceCount = 0

      for (const idx of faceLandmarkIndices) {
        const lm = landmarks[idx]
        if (lm && lm.visibility > 0.1) {
          headX += lm.x
          headY += lm.y
          headVisibility += lm.visibility
          validFaceCount++
        }
      }

      if (validFaceCount > 0) {
        headX /= validFaceCount
        headY /= validFaceCount
        headVisibility /= validFaceCount
      }

      const hasValidHead = validFaceCount > 0

      if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.1 && rightShoulder.visibility > 0.1) {
        const neck = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          visibility: Math.min(leftShoulder.visibility, rightShoulder.visibility),
        }

        const neckScreenX = offsetX + neck.x * displayWidth
        const neckScreenY = offsetY + neck.y * displayHeight

        // Draw head-to-neck connection
        if (hasValidHead) {
          const headScreenX = offsetX + headX * displayWidth
          const headScreenY = offsetY + headY * displayHeight

          ctx.beginPath()
          ctx.moveTo(headScreenX, headScreenY)
          ctx.lineTo(neckScreenX, neckScreenY)
          ctx.strokeStyle = POSE_COLOR
          ctx.lineWidth = getLineWidth(headVisibility, neck.visibility, 3)
          ctx.lineCap = 'round'
          ctx.stroke()

          // Draw head point
          const headSize = getPointSize(headVisibility, 5)

          ctx.beginPath()
          ctx.arc(headScreenX, headScreenY, headSize, 0, 2 * Math.PI)
          ctx.fillStyle = POSE_COLOR
          ctx.fill()
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Draw neck point
        const neckSize = getPointSize(neck.visibility, 5)

        ctx.beginPath()
        ctx.arc(neckScreenX, neckScreenY, neckSize, 0, 2 * Math.PI)
        ctx.fillStyle = POSE_COLOR
        ctx.fill()
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Draw landmark points
      // Skip: all face landmarks (0-10), fingers (17-22), heel/foot_index (29-32)
      const skipLandmarks = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 29, 30, 31, 32])
      for (let i = 0; i < landmarks.length; i++) {
        if (skipLandmarks.has(i)) continue
        const landmark = landmarks[i]
        if (!landmark || landmark.visibility < 0.1) continue

        // Calculate screen coordinates with offset for letterboxing
        const x = offsetX + landmark.x * displayWidth
        const y = offsetY + landmark.y * displayHeight
        const size = getPointSize(landmark.visibility, 5)

        // Draw point
        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fillStyle = POSE_COLOR
        ctx.fill()

        // Draw outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    },
    [canvasSize, videoWidth, videoHeight, visible]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (landmarks) {
      drawPose(ctx, landmarks)
    } else {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    }
  }, [landmarks, drawPose, canvasSize])

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="absolute inset-0 pointer-events-none"
    />
  )
}

