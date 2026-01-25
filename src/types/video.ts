export interface VideoFile {
  id: string
  name: string
  blob: Blob
  createdAt: number
  duration?: number
  width?: number
  height?: number
}

export interface VideoMetadata {
  id: string
  name: string
  createdAt: number
  duration?: number
  width?: number
  height?: number
}
