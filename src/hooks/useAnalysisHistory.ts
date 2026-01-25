import { useState, useEffect, useCallback } from 'react'
import { get, set, del, keys } from 'idb-keyval'
import type { AnalysisResult } from '@/types/analysis'

export interface SavedAnalysis {
  id: string
  videoId: string
  videoName: string
  result: AnalysisResult
  createdAt: number
  thumbnailUrl?: string
}

const HISTORY_PREFIX = 'analysis_'

export function useAnalysisHistory() {
  const [history, setHistory] = useState<SavedAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const allKeys = await keys()
      const analysisKeys = allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith(HISTORY_PREFIX)
      )

      const analyses: SavedAnalysis[] = []
      for (const key of analysisKeys) {
        const data = await get<SavedAnalysis>(key)
        if (data) {
          analyses.push(data)
        }
      }

      // Sort by date, newest first
      analyses.sort((a, b) => b.createdAt - a.createdAt)
      setHistory(analyses)
    } catch (error) {
      console.error('Failed to load analysis history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const saveAnalysis = useCallback(
    async (
      result: AnalysisResult,
      videoName: string,
      thumbnailUrl?: string
    ): Promise<SavedAnalysis> => {
      const id = `${Date.now()}_${result.videoId}`
      const savedAnalysis: SavedAnalysis = {
        id,
        videoId: result.videoId,
        videoName,
        result,
        createdAt: Date.now(),
        thumbnailUrl,
      }

      await set(`${HISTORY_PREFIX}${id}`, savedAnalysis)

      // Update local state
      setHistory((prev) => [savedAnalysis, ...prev])

      return savedAnalysis
    },
    []
  )

  const deleteAnalysis = useCallback(async (id: string) => {
    await del(`${HISTORY_PREFIX}${id}`)
    setHistory((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearHistory = useCallback(async () => {
    const allKeys = await keys()
    const analysisKeys = allKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(HISTORY_PREFIX)
    )

    for (const key of analysisKeys) {
      await del(key)
    }

    setHistory([])
  }, [])

  const getAnalysis = useCallback(async (id: string): Promise<SavedAnalysis | null> => {
    const data = await get<SavedAnalysis>(`${HISTORY_PREFIX}${id}`)
    return data || null
  }, [])

  return {
    history,
    isLoading,
    saveAnalysis,
    deleteAnalysis,
    clearHistory,
    getAnalysis,
    refreshHistory: loadHistory,
  }
}
