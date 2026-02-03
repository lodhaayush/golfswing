import { useRef } from 'react'
import type { RefObject } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { PhaseSegment, SwingPhase } from '@/types/analysis'
import { useDualVideoSync } from '@/hooks/useDualVideoSync'
import { PhaseSelector } from './PhaseSelector'
import { colors } from '@/styles/colors'

interface DualVideoPlayerProps {
  userVideoUrl: string
  userVideoRef?: RefObject<HTMLVideoElement>
  proVideoUrl: string
  userPhases: PhaseSegment[]
  proPhases: PhaseSegment[]
  userLabel?: string
  proLabel?: string
  userScore?: number
}

export function DualVideoPlayer({
  userVideoUrl,
  userVideoRef: externalUserRef,
  proVideoUrl,
  userPhases,
  proPhases,
  userLabel = 'Your Swing',
  proLabel = 'Pro Swing',
  userScore,
}: DualVideoPlayerProps) {
  const internalUserRef = useRef<HTMLVideoElement>(null)
  const userVideoRef = externalUserRef || internalUserRef
  const proVideoRef = useRef<HTMLVideoElement>(null)

  const {
    isPlaying,
    currentPhase,
    togglePlay,
    seekToPhase,
    seekUserVideo,
    userCurrentTime,
    proCurrentTime,
    userDuration,
    proDuration,
  } = useDualVideoSync({
    userVideoRef,
    proVideoRef,
    userPhases,
    proPhases,
  })

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  const handleUserSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekUserVideo(parseFloat(e.target.value))
  }

  const stepFrame = (direction: 1 | -1) => {
    const frameTime = 1 / 30
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (userVideo) {
      userVideo.pause()
      userVideo.currentTime = Math.max(
        0,
        Math.min(userVideo.currentTime + direction * frameTime, userDuration)
      )
    }
    if (proVideo) {
      proVideo.pause()
    }
  }

  const restart = () => {
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (userVideo) userVideo.currentTime = 0
    if (proVideo) proVideo.currentTime = 0
  }

  const handlePhaseSelect = (phase: SwingPhase) => {
    seekToPhase(phase)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* User Video */}
      <div className={`${colors.bg.card} rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className={`text-lg font-semibold ${colors.text.primary}`}>{userLabel}</h3>
            {userScore !== undefined && (
              <span className={`px-2 py-0.5 ${colors.primary.active} text-sm rounded-full font-medium`}>
                Score: {userScore}
              </span>
            )}
          </div>
        </div>

        <div className={`relative ${colors.bg.video} rounded-lg overflow-hidden`}>
          <video
            ref={userVideoRef}
            src={userVideoUrl}
            className="w-full aspect-video"
            playsInline
            muted
          />
        </div>

        {/* User video seek bar */}
        <div className="flex items-center gap-3 mt-3">
          <span className={`text-sm ${colors.text.secondary} w-16 text-right font-mono`}>
            {formatTime(userCurrentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={userDuration || 100}
            step={0.001}
            value={userCurrentTime}
            onChange={handleUserSeek}
            className={`flex-1 h-2 ${colors.bg.slider} rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-green-400
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer`}
          />
          <span className={`text-sm ${colors.text.secondary} w-16 font-mono`}>
            {formatTime(userDuration)}
          </span>
        </div>
      </div>

      {/* Pro Video */}
      <div className={`${colors.bg.card} rounded-xl p-4`}>
        <div className="mb-3">
          <h3 className={`text-lg font-semibold ${colors.text.primary}`}>{proLabel}</h3>
        </div>

        <div className={`relative ${colors.bg.video} rounded-lg overflow-hidden`}>
          <video
            ref={proVideoRef}
            src={proVideoUrl}
            className="w-full aspect-video"
            playsInline
            muted
          />
        </div>

        {/* Pro video progress (read-only when synced) */}
        <div className="flex items-center gap-3 mt-3">
          <span className={`text-sm ${colors.text.secondary} w-16 text-right font-mono`}>
            {formatTime(proCurrentTime)}
          </span>
          <div className={`flex-1 h-2 ${colors.bg.slider} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${colors.secondary.progress} transition-all`}
              style={{ width: `${proDuration > 0 ? (proCurrentTime / proDuration) * 100 : 0}%` }}
            />
          </div>
          <span className={`text-sm ${colors.text.secondary} w-16 font-mono`}>
            {formatTime(proDuration)}
          </span>
        </div>
      </div>

      {/* Phase Selector */}
      <div className={`${colors.bg.card} rounded-xl px-4 py-2`}>
        <PhaseSelector
          segments={userPhases}
          currentPhase={currentPhase}
          onPhaseSelect={handlePhaseSelect}
        />
      </div>

      {/* Shared Playback Controls */}
      <div className={`${colors.bg.card} rounded-xl p-4`}>
        <div className="flex items-center justify-center gap-4">
          {/* Restart */}
          <button
            onClick={restart}
            className={`p-2 ${colors.control.default} transition-colors`}
            title="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Step back */}
          <button
            onClick={() => stepFrame(-1)}
            className={`p-2 ${colors.control.default} transition-colors`}
            title="Previous frame"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className={`p-3 ${colors.primary.button} rounded-full transition-colors`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          {/* Step forward */}
          <button
            onClick={() => stepFrame(1)}
            className={`p-2 ${colors.control.default} transition-colors`}
            title="Next frame"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
