import { useState, useRef, useEffect, useCallback } from 'react'
import type { RefObject } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { PoseFrame } from '@/types/pose'
import { PoseOverlay } from './PoseOverlay'

interface VideoPlayerProps {
  src: string
  onAnalyze?: () => void
  onUploadNew?: () => void
  videoRef?: RefObject<HTMLVideoElement>
  poseFrames?: PoseFrame[]
  onTimeUpdate?: (time: number) => void
}

export function VideoPlayer({
  src,
  onAnalyze,
  onUploadNew,
  videoRef: externalRef,
  poseFrames = [],
  onTimeUpdate,
}: VideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalRef || internalRef
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showOverlay, setShowOverlay] = useState(true)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  const [currentLandmarks, setCurrentLandmarks] = useState<PoseFrame['landmarks'] | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setVideoDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
      })
      // Set default playback speed to 0.25x for swing analysis
      video.playbackRate = 0.25
    }

    const handleEnded = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onTimeUpdate])

  // Update current landmarks based on video time
  useEffect(() => {
    if (poseFrames.length === 0) {
      setCurrentLandmarks(null)
      return
    }

    // Find closest frame to current time
    let closestFrame = poseFrames[0]
    let minDiff = Math.abs(poseFrames[0].timestamp - currentTime)

    for (const frame of poseFrames) {
      const diff = Math.abs(frame.timestamp - currentTime)
      if (diff < minDiff) {
        minDiff = diff
        closestFrame = frame
      }
    }

    // Only show if within reasonable range (0.1s)
    if (minDiff < 0.1) {
      setCurrentLandmarks(closestFrame.landmarks)
    } else {
      setCurrentLandmarks(null)
    }
  }, [currentTime, poseFrames])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [isPlaying])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(time, duration))
  }, [duration])

  const stepFrame = useCallback((direction: 1 | -1) => {
    const video = videoRef.current
    if (!video) return

    // Assume ~30fps, step ~1 frame
    const frameTime = 1 / 30
    video.pause()
    seek(currentTime + direction * frameTime)
  }, [currentTime, seek])

  const handleSeekBarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value))
  }, [seek])

  const restart = useCallback(() => {
    seek(0)
  }, [seek])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  const hasPoseData = poseFrames.length > 0

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video Container */}
      <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          className="w-full aspect-video"
          playsInline
          muted
        />
        {hasPoseData && videoDimensions.width > 0 && (
          <PoseOverlay
            landmarks={currentLandmarks}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            containerRef={containerRef}
            visible={showOverlay}
          />
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-4">
        {/* Seek Bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 w-16 text-right font-mono">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.001}
            value={currentTime}
            onChange={handleSeekBarChange}
            className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-green-400
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-sm text-gray-400 w-16 font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={restart}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => seek(currentTime - 5)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Back 5s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => stepFrame(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Previous frame"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-green-500 hover:bg-green-400 text-black rounded-full transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Next frame"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => seek(currentTime + 5)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Forward 5s"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {hasPoseData && (
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`p-2 transition-colors ${
                showOverlay ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-white'
              }`}
              title={showOverlay ? 'Hide skeleton overlay' : 'Show skeleton overlay'}
            >
              {showOverlay ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
            >
              Analyze Swing
            </button>
          )}
          {onUploadNew && (
            <button
              onClick={onUploadNew}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Upload New Video
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
