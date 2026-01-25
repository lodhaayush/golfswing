import { useCallback } from 'react'
import { get, set, del, keys } from 'idb-keyval'
import type { VideoFile, VideoMetadata } from '@/types/video'

const VIDEO_PREFIX = 'video:'
const METADATA_PREFIX = 'metadata:'

export function useVideoStorage() {
  const saveVideo = useCallback(async (file: File): Promise<VideoFile> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    const videoFile: VideoFile = {
      id,
      name: file.name,
      blob: file,
      createdAt: Date.now(),
    }

    // Save the video blob
    await set(`${VIDEO_PREFIX}${id}`, videoFile)

    // Save metadata separately for quick listing
    const metadata: VideoMetadata = {
      id,
      name: file.name,
      createdAt: videoFile.createdAt,
    }
    await set(`${METADATA_PREFIX}${id}`, metadata)

    return videoFile
  }, [])

  const loadVideo = useCallback(async (id: string): Promise<VideoFile | null> => {
    const video = await get<VideoFile>(`${VIDEO_PREFIX}${id}`)
    return video || null
  }, [])

  const deleteVideo = useCallback(async (id: string): Promise<void> => {
    await del(`${VIDEO_PREFIX}${id}`)
    await del(`${METADATA_PREFIX}${id}`)
  }, [])

  const listVideos = useCallback(async (): Promise<VideoMetadata[]> => {
    const allKeys = await keys()
    const metadataKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(METADATA_PREFIX)
    )

    const metadataList: VideoMetadata[] = []
    for (const key of metadataKeys) {
      const metadata = await get<VideoMetadata>(key as string)
      if (metadata) {
        metadataList.push(metadata)
      }
    }

    // Sort by createdAt descending (newest first)
    return metadataList.sort((a, b) => b.createdAt - a.createdAt)
  }, [])

  const getVideoUrl = useCallback((video: VideoFile): string => {
    return URL.createObjectURL(video.blob)
  }, [])

  const revokeVideoUrl = useCallback((url: string): void => {
    URL.revokeObjectURL(url)
  }, [])

  return {
    saveVideo,
    loadVideo,
    deleteVideo,
    listVideos,
    getVideoUrl,
    revokeVideoUrl,
  }
}
