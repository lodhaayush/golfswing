import { useState, useCallback, useRef } from 'react'
import { Upload, Film, AlertCircle } from 'lucide-react'
import { colors } from '@/styles/colors'

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.webm']

export function VideoUploader({ onVideoSelect }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Please upload ${ACCEPTED_EXTENSIONS.join(', ')} files.`)
      return false
    }

    // 500MB limit
    if (file.size > 500 * 1024 * 1024) {
      setError('File too large. Maximum size is 500MB.')
      return false
    }

    return true
  }, [])

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onVideoSelect(file)
    }
  }, [validateFile, onVideoSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? colors.primary.dragOver
            : `${colors.border.input} hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50`
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {isDragging ? (
            <Film className={`w-16 h-16 ${colors.primary.text}`} />
          ) : (
            <Upload className={`w-16 h-16 ${colors.text.secondary}`} />
          )}

          <div>
            <p className={`text-lg font-medium ${colors.text.primary}`}>
              {isDragging ? 'Drop your video here' : 'Drag & drop your swing video'}
            </p>
            <p className={`text-sm ${colors.text.secondary} mt-1`}>
              or click to browse
            </p>
          </div>

          <p className={`text-xs ${colors.text.subtle}`}>
            Supports MP4, MOV, WebM (max 500MB)
          </p>
        </div>
      </div>

      {error && (
        <div className={`mt-4 flex items-center gap-2 ${colors.status.error} ${colors.status.errorBg} px-4 py-3 rounded-lg`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
