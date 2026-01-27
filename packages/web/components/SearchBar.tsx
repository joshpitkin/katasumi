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
  const [localQuery, setLocalQuery] = useState(query)
  const [isSearching, setIsSearching] = useState(false)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!selectedApp) return

    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        app: selectedApp,
        platform: platform === 'all' ? '' : platform,
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()
      setResults(data.results || [])
      setQuery(searchQuery)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [selectedApp, platform, filters, setResults, setQuery])

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (selectedApp) {
        performSearch(localQuery)
      }
    }, 300) // 300ms debounce

    return () => {
      clearTimeout(handler)
    }
  }, [localQuery, selectedApp, performSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(localQuery)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Quick search shortcuts..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
