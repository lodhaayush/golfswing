import { useState, useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import type { PhaseSegment, SwingPhase } from '@/types/analysis'

interface UseDualVideoSyncOptions {
  userVideoRef: RefObject<HTMLVideoElement>
  proVideoRef: RefObject<HTMLVideoElement>
  userPhases: PhaseSegment[]
  proPhases: PhaseSegment[]
}

interface UseDualVideoSyncReturn {
  isPlaying: boolean
  currentPhase: SwingPhase | null
  play: () => void
  pause: () => void
  togglePlay: () => void
  seekToPhase: (phase: SwingPhase) => void
  seekUserVideo: (time: number) => void
  userCurrentTime: number
  proCurrentTime: number
  userDuration: number
  proDuration: number
}

/**
 * Get the current phase based on video time
 * Handles gaps between phases by finding the nearest phase
 */
function getCurrentPhase(time: number, phases: PhaseSegment[]): SwingPhase | null {
  if (phases.length === 0) return null

  // First try exact match
  // Use exclusive end boundary (time < endTime) to handle phase boundaries correctly
  // At boundaries, prefer the phase that starts at that time over the one that ends there
  // Exception: for the last phase, include the end time
  const lastPhase = phases[phases.length - 1]
  const exactMatch = phases.find((p) => {
    const isLastPhase = p === lastPhase
    return time >= p.startTime && (isLastPhase ? time <= p.endTime : time < p.endTime)
  })
  if (exactMatch) {
    return exactMatch.phase
  }

  // If no exact match, find the nearest phase
  let nearestPhase = phases[0]
  let minDistance = Infinity

  for (const p of phases) {
    // Check distance to phase boundaries
    const distToStart = Math.abs(time - p.startTime)
    const distToEnd = Math.abs(time - p.endTime)
    const minDist = Math.min(distToStart, distToEnd)

    if (minDist < minDistance) {
      minDistance = minDist
      nearestPhase = p
    }
  }

  return nearestPhase.phase
}

export function useDualVideoSync({
  userVideoRef,
  proVideoRef,
  userPhases,
  proPhases,
}: UseDualVideoSyncOptions): UseDualVideoSyncReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [userCurrentTime, setUserCurrentTime] = useState(0)
  const [proCurrentTime, setProCurrentTime] = useState(0)
  const [userDuration, setUserDuration] = useState(0)
  const [proDuration, setProDuration] = useState(0)
  const [videosReady, setVideosReady] = useState(false)

  // Track current phase based on user video time
  const currentPhase = getCurrentPhase(userCurrentTime, userPhases)

  // Check for video elements being available
  useEffect(() => {
    const checkVideos = () => {
      if (userVideoRef.current && proVideoRef.current) {
        setVideosReady(true)
      }
    }
    // Check immediately and also after a short delay (for async mounting)
    checkVideos()
    const timer = setTimeout(checkVideos, 100)
    return () => clearTimeout(timer)
  }, [userVideoRef, proVideoRef])

  // Set up video event listeners
  useEffect(() => {
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (!userVideo || !proVideo) {
      return
    }

    const handleUserTimeUpdate = () => {
      setUserCurrentTime(userVideo.currentTime)
    }

    const handleProTimeUpdate = () => {
      setProCurrentTime(proVideo.currentTime)
    }

    const handleUserLoaded = () => {
      setUserDuration(userVideo.duration)
    }

    const handleProLoaded = () => {
      setProDuration(proVideo.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    userVideo.addEventListener('timeupdate', handleUserTimeUpdate)
    userVideo.addEventListener('loadedmetadata', handleUserLoaded)
    userVideo.addEventListener('play', handlePlay)
    userVideo.addEventListener('pause', handlePause)
    proVideo.addEventListener('timeupdate', handleProTimeUpdate)
    proVideo.addEventListener('loadedmetadata', handleProLoaded)

    // If videos are already loaded, trigger the handlers
    if (userVideo.readyState >= 1) {
      handleUserLoaded()
    }
    if (proVideo.readyState >= 1) {
      handleProLoaded()
    }

    return () => {
      userVideo.removeEventListener('timeupdate', handleUserTimeUpdate)
      userVideo.removeEventListener('loadedmetadata', handleUserLoaded)
      userVideo.removeEventListener('play', handlePlay)
      userVideo.removeEventListener('pause', handlePause)
      proVideo.removeEventListener('timeupdate', handleProTimeUpdate)
      proVideo.removeEventListener('loadedmetadata', handleProLoaded)
    }
  }, [userVideoRef, proVideoRef, videosReady])

  const play = useCallback(() => {
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (userVideo) userVideo.play()
    if (proVideo) proVideo.play()
  }, [userVideoRef, proVideoRef])

  const pause = useCallback(() => {
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (userVideo) userVideo.pause()
    if (proVideo) proVideo.pause()
  }, [userVideoRef, proVideoRef])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seekToPhase = useCallback(
    (phase: SwingPhase) => {
      const userVideo = userVideoRef.current
      const proVideo = proVideoRef.current

      // Small offset to ensure we land inside the phase, not at the exact boundary
      // Video seeking is imprecise and may land slightly before the requested time
      const SEEK_OFFSET = 0.02

      // Find phase in user video
      const userPhase = userPhases.find((p) => p.phase === phase)
      if (userPhase && userVideo) {
        const seekTime = userPhase.startTime + SEEK_OFFSET
        userVideo.currentTime = seekTime
        // Update state immediately so UI reflects the change
        setUserCurrentTime(seekTime)
      }

      // Find phase in pro video
      const proPhase = proPhases.find((p) => p.phase === phase)
      if (proPhase && proVideo) {
        const seekTime = proPhase.startTime + SEEK_OFFSET
        proVideo.currentTime = seekTime
        setProCurrentTime(seekTime)
      }
    },
    [userVideoRef, proVideoRef, userPhases, proPhases]
  )

  const seekUserVideo = useCallback(
    (time: number) => {
      const userVideo = userVideoRef.current
      if (userVideo) {
        userVideo.currentTime = time
      }
    },
    [userVideoRef]
  )

  return {
    isPlaying,
    currentPhase,
    play,
    pause,
    togglePlay,
    seekToPhase,
    seekUserVideo,
    userCurrentTime,
    proCurrentTime,
    userDuration,
    proDuration,
  }
}
