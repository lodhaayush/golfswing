import { useRef } from 'react'
import type { RefObject } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Link2,
  Link2Off,
} from 'lucide-react'
import type { PhaseSegment, SwingPhase } from '@/types/analysis'
import { useDualVideoSync } from '@/hooks/useDualVideoSync'
import { PhaseSelector } from './PhaseSelector'

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
    syncEnabled,
    togglePlay,
    seekToPhase,
    seekUserVideo,
    setSyncEnabled,
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
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{userLabel}</h3>
            {userScore !== undefined && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
                Score: {userScore}
              </span>
            )}
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden">
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
          <span className="text-sm text-gray-400 w-16 text-right font-mono">
            {formatTime(userCurrentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={userDuration || 100}
            step={0.001}
            value={userCurrentTime}
            onChange={handleUserSeek}
            className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-green-400
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-sm text-gray-400 w-16 font-mono">
            {formatTime(userDuration)}
          </span>
        </div>
      </div>

      {/* Pro Video */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{proLabel}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSyncEnabled(!syncEnabled)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                syncEnabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
              title={syncEnabled ? 'Sync enabled' : 'Sync disabled'}
            >
              {syncEnabled ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
              <span className="hidden sm:inline">{syncEnabled ? 'Synced' : 'Not synced'}</span>
            </button>
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden">
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
          <span className="text-sm text-gray-400 w-16 text-right font-mono">
            {formatTime(proCurrentTime)}
          </span>
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 transition-all"
              style={{ width: `${proDuration > 0 ? (proCurrentTime / proDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-400 w-16 font-mono">
            {formatTime(proDuration)}
          </span>
        </div>
      </div>

      {/* Phase Selector */}
      <div className="bg-gray-800 rounded-xl px-4 py-2">
        <PhaseSelector
          segments={userPhases}
          currentPhase={currentPhase}
          onPhaseSelect={handlePhaseSelect}
        />
      </div>

      {/* Shared Playback Controls */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Restart */}
          <button
            onClick={restart}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Step back */}
          <button
            onClick={() => stepFrame(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Previous frame"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
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

          {/* Step forward */}
          <button
            onClick={() => stepFrame(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Next frame"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
