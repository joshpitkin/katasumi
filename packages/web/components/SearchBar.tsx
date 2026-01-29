'use client'

import { useStore } from '@/lib/store'
import { useState, useEffect, useCallback } from 'react'

export function SearchBar() {
  const query = useStore((state) => state.query)
  const setQuery = useStore((state) => state.setQuery)
  const selectedApp = useStore((state) => state.selectedApp)
  const platform = useStore((state) => state.platform)
  const filters = useStore((state) => state.filters)
  const setResults = useStore((state) => state.setResults)
  const mode = useStore((state) => state.mode)
  const aiEnabled = useStore((state) => state.aiEnabled)
  const decrementAIQueryCount = useStore((state) => state.decrementAIQueryCount)
  const [localQuery, setLocalQuery] = useState(query)
  const [isSearching, setIsSearching] = useState(false)

  const performSearch = useCallback(async (searchQuery: string) => {
    // In app-first mode, app must be selected
    if (mode === 'app-first' && !selectedApp) return
    
    // In full-phrase mode, allow search without app selection (cross-app search)
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        platform: platform === 'all' ? '' : platform,
        ...(mode === 'app-first' && selectedApp && { app: selectedApp }),
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()
      setResults(data.results || [])
      setQuery(searchQuery)
      
      // Decrement AI query count if AI is enabled and user performed a search
      if (aiEnabled && mode === 'full-phrase') {
        decrementAIQueryCount()
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [mode, selectedApp, platform, filters, setResults, setQuery, aiEnabled, decrementAIQueryCount])

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (mode === 'full-phrase' || selectedApp) {
        performSearch(localQuery)
      }
    }, 300) // 300ms debounce

    return () => {
      clearTimeout(handler)
    }
  }, [localQuery, mode, selectedApp, performSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(localQuery)
  }

  const isFullPhrase = mode === 'full-phrase'
  const placeholder = isFullPhrase 
    ? 'Ask anything... (e.g., "how to split screen" or "undo last change")'
    : 'Quick search shortcuts...'

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={placeholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // After Enter, unfocus so user can use shortcuts on results
                setTimeout(() => {
                  e.currentTarget.blur()
                }, 0)
              }
            }}
            className={`w-full px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              isFullPhrase ? 'py-4 text-lg' : 'py-3'
            }`}
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary-600 border-r-transparent"></div>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          disabled={isSearching}
        >
          Search
        </button>
      </div>
    </form>
  )
}
