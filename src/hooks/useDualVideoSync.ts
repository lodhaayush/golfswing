import { useState, useCallback, useRef, useEffect } from 'react'
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
  playbackSpeed: number
  syncEnabled: boolean
  play: () => void
  pause: () => void
  togglePlay: () => void
  setPlaybackSpeed: (speed: number) => void
  seekToPhase: (phase: SwingPhase) => void
  seekUserVideo: (time: number) => void
  setSyncEnabled: (enabled: boolean) => void
  userCurrentTime: number
  proCurrentTime: number
  userDuration: number
  proDuration: number
}

/**
 * Calculate the equivalent time in the pro video based on user video time
 * by matching swing phases
 */
function calculateSyncedTime(
  userTime: number,
  userPhases: PhaseSegment[],
  proPhases: PhaseSegment[]
): number {
  if (userPhases.length === 0 || proPhases.length === 0) {
    return userTime // No phases, just use same time
  }

  // Find user's current phase (with some tolerance for gaps)
  let userPhase = userPhases.find(
    (p) => userTime >= p.startTime && userTime <= p.endTime
  )

  // If not in any phase, find the nearest phase
  if (!userPhase) {
    let minDistance = Infinity
    for (const p of userPhases) {
      const distToStart = Math.abs(userTime - p.startTime)
      const distToEnd = Math.abs(userTime - p.endTime)
      const minDist = Math.min(distToStart, distToEnd)
      if (minDist < minDistance) {
        minDistance = minDist
        userPhase = p
      }
    }
  }

  if (!userPhase) {
    return userTime // Fallback to same time
  }

  // Calculate relative position within user's phase (0 to 1)
  // Clamp to 0-1 range in case we're slightly outside the phase
  let relativePos = 0
  if (userPhase.duration > 0) {
    relativePos = (userTime - userPhase.startTime) / userPhase.duration
    relativePos = Math.max(0, Math.min(1, relativePos))
  }

  // Find matching pro phase
  const proPhase = proPhases.find((p) => p.phase === userPhase!.phase)
  if (!proPhase) {
    // No matching phase - try to find by index position
    const userPhaseIndex = userPhases.indexOf(userPhase)
    if (userPhaseIndex >= 0 && userPhaseIndex < proPhases.length) {
      const fallbackProPhase = proPhases[userPhaseIndex]
      return fallbackProPhase.startTime + relativePos * fallbackProPhase.duration
    }
    return userTime // Fallback to same time
  }

  // Calculate equivalent time in pro video
  return proPhase.startTime + relativePos * proPhase.duration
}

/**
 * Get the current phase based on video time
 * Handles gaps between phases by finding the nearest phase
 */
function getCurrentPhase(time: number, phases: PhaseSegment[]): SwingPhase | null {
  if (phases.length === 0) return null

  // First try exact match
  const exactMatch = phases.find((p) => time >= p.startTime && time <= p.endTime)
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
  const [playbackSpeed, setPlaybackSpeedState] = useState(0.25)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [userCurrentTime, setUserCurrentTime] = useState(0)
  const [proCurrentTime, setProCurrentTime] = useState(0)
  const [userDuration, setUserDuration] = useState(0)
  const [proDuration, setProDuration] = useState(0)
  const [videosReady, setVideosReady] = useState(false)

  const syncingRef = useRef(false)
  const lastSeekTimeRef = useRef(0)

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
      console.log('[Sync] Videos not ready yet', { userVideo: !!userVideo, proVideo: !!proVideo })
      return
    }

    console.log('[Sync] Setting up video event listeners')

    const handleUserTimeUpdate = () => {
      const time = userVideo.currentTime
      setUserCurrentTime(time)

      // Only sync when paused (for frame-by-frame comparison)
      // During playback, let both videos play naturally at the same speed
      if (syncEnabled && !syncingRef.current && userVideo.paused && userPhases.length > 0 && proPhases.length > 0) {
        // Skip sync for 200ms after manual seek to avoid overriding
        const timeSinceLastSeek = Date.now() - lastSeekTimeRef.current
        if (timeSinceLastSeek < 200) {
          return
        }

        syncingRef.current = true
        const syncedTime = calculateSyncedTime(time, userPhases, proPhases)

        const diff = Math.abs(proVideo.currentTime - syncedTime)
        if (diff > 0.05) {
          proVideo.currentTime = syncedTime
        }
        syncingRef.current = false
      }
    }

    // Sync when user video is seeked
    const handleUserSeeked = () => {
      if (syncEnabled && userPhases.length > 0 && proPhases.length > 0) {
        const syncedTime = calculateSyncedTime(userVideo.currentTime, userPhases, proPhases)
        proVideo.currentTime = syncedTime
      }
    }

    const handleProTimeUpdate = () => {
      setProCurrentTime(proVideo.currentTime)
    }

    const handleUserLoaded = () => {
      console.log('[Sync] User video loaded, duration:', userVideo.duration)
      setUserDuration(userVideo.duration)
      userVideo.playbackRate = playbackSpeed
    }

    const handleProLoaded = () => {
      console.log('[Sync] Pro video loaded, duration:', proVideo.duration)
      setProDuration(proVideo.duration)
      proVideo.playbackRate = playbackSpeed
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    userVideo.addEventListener('timeupdate', handleUserTimeUpdate)
    userVideo.addEventListener('loadedmetadata', handleUserLoaded)
    userVideo.addEventListener('play', handlePlay)
    userVideo.addEventListener('pause', handlePause)
    userVideo.addEventListener('seeked', handleUserSeeked)
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
      userVideo.removeEventListener('seeked', handleUserSeeked)
      proVideo.removeEventListener('timeupdate', handleProTimeUpdate)
      proVideo.removeEventListener('loadedmetadata', handleProLoaded)
    }
  }, [userVideoRef, proVideoRef, syncEnabled, userPhases, proPhases, playbackSpeed, videosReady])

  // Update playback speed on both videos
  useEffect(() => {
    const userVideo = userVideoRef.current
    const proVideo = proVideoRef.current
    if (userVideo) userVideo.playbackRate = playbackSpeed
    if (proVideo) proVideo.playbackRate = playbackSpeed
  }, [playbackSpeed, userVideoRef, proVideoRef])

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

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed)
  }, [])

  const seekToPhase = useCallback(
    (phase: SwingPhase) => {
      const userVideo = userVideoRef.current
      const proVideo = proVideoRef.current

      // Mark this as a manual seek to prevent immediate re-sync
      lastSeekTimeRef.current = Date.now()

      // Find phase in user video
      const userPhase = userPhases.find((p) => p.phase === phase)
      if (userPhase && userVideo) {
        userVideo.currentTime = userPhase.startTime
        // Update state immediately so UI reflects the change
        setUserCurrentTime(userPhase.startTime)
      }

      // Find phase in pro video
      const proPhase = proPhases.find((p) => p.phase === phase)
      if (proPhase && proVideo) {
        proVideo.currentTime = proPhase.startTime
        setProCurrentTime(proPhase.startTime)
      }
    },
    [userVideoRef, proVideoRef, userPhases, proPhases]
  )

  const seekUserVideo = useCallback(
    (time: number) => {
      const userVideo = userVideoRef.current
      // Mark this as a manual seek to prevent immediate re-sync
      lastSeekTimeRef.current = Date.now()
      if (userVideo) {
        userVideo.currentTime = time
      }
    },
    [userVideoRef]
  )

  return {
    isPlaying,
    currentPhase,
    playbackSpeed,
    syncEnabled,
    play,
    pause,
    togglePlay,
    setPlaybackSpeed,
    seekToPhase,
    seekUserVideo,
    setSyncEnabled,
    userCurrentTime,
    proCurrentTime,
    userDuration,
    proDuration,
  }
}
