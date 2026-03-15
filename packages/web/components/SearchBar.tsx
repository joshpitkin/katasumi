'use client'

import { useStore } from '@/lib/store'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isAIConfigured } from '@/lib/config'

export function SearchBar() {
  const router = useRouter()
  const query = useStore((state) => state.query)
  const setQuery = useStore((state) => state.setQuery)
  const selectedApp = useStore((state) => state.selectedApp)
  const platform = useStore((state) => state.platform)
  const filters = useStore((state) => state.filters)
  const setResults = useStore((state) => state.setResults)
  const mode = useStore((state) => state.mode)
  const aiEnabled = useStore((state) => state.aiEnabled)
  const aiKeyMode = useStore((state) => state.aiKeyMode)
  const decrementAIQueryCount = useStore((state) => state.decrementAIQueryCount)
  const [localQuery, setLocalQuery] = useState(query)
  const [isSearching, setIsSearching] = useState(false)
  const [isAISearching, setIsAISearching] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSearchSuccess, setAiSearchSuccess] = useState(false)

  // Automatic keyword search (debounced)
  const performSearch = useCallback(async (searchQuery: string) => {
    // In app-first mode, app must be selected
    if (mode === 'app-first' && !selectedApp) return
    
    // In app-first mode with app selected, allow empty query to show all shortcuts
    // In full-phrase mode, require query for search
    if (mode === 'full-phrase' && !searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    setAiError(null)
    setAiSearchSuccess(false) // Clear AI success indicator on keyword search
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        platform: platform === 'all' ? '' : platform,
        ...(mode === 'app-first' && selectedApp && { app: selectedApp }),
        ...(filters.context && { context: filters.context }),
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
      })

      console.log('[SearchBar] Performing keyword search with params:', Object.fromEntries(params))

      // Include authentication token if available to search user shortcuts
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        console.log('[SearchBar] Including auth token in search request')
      }

      const response = await fetch(`/api/search?${params}`, { headers })
      const data = await response.json()
      
      console.log('[SearchBar] Search response:', { 
        resultsCount: data.results?.length || 0,
        error: data.error 
      })
      
      if (data.error) {
        console.error('[SearchBar] API returned error:', data.error)
      }
      
      if (data.results?.length === 0 && mode === 'app-first' && selectedApp) {
        console.warn(`[SearchBar] No shortcuts found for app: ${selectedApp}`)
      }
      
      setResults(data.results || [])
      setQuery(searchQuery)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [mode, selectedApp, platform, filters, setResults, setQuery])

  // AI-powered semantic search (explicit button click)
  const performAISearch = useCallback(async (searchQuery: string) => {
    // Check authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      setAiError('Please login to use AI search')
      router.push('/login')
      return
    }

    // Check AI configuration
    if (aiKeyMode !== 'builtin' && !isAIConfigured()) {
      setAiError('Please configure AI in Settings')
      return
    }

    // Require query for AI search
    if (!searchQuery.trim()) {
      setAiError('Please enter a search query')
      return
    }

    setIsAISearching(true)
    setAiError(null)
    setAiSearchSuccess(false) // Clear success indicator before new search
    try {
      const requestBody = {
        query: searchQuery,
        platform: platform === 'all' ? undefined : platform,
        ...(mode === 'app-first' && selectedApp && { app: selectedApp }),
        ...(filters.category && { category: filters.category }),
      }

      console.log('[SearchBar] Performing AI search with body:', requestBody)

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('[SearchBar] AI search error:', data.error)
        setAiError(data.error || 'AI search failed')
        
        // If auth error, redirect to login
        if (response.status === 401) {
          router.push('/login')
        }
        return
      }
      
      console.log('[SearchBar] AI search response:', { 
        resultsCount: data.results?.length || 0,
        enhanced: data.enhanced,
        provider: data.provider
      })
      
      setResults(data.results || [])
      setQuery(searchQuery)
      
      // Show success indicator
      setAiSearchSuccess(true)
      
      // Decrement AI query count
      decrementAIQueryCount()
    } catch (error) {
      console.error('AI search failed:', error)
      setAiError('AI search failed. Please try again.')
      setResults([])
    } finally {
      setIsAISearching(false)
    }
  }, [mode, selectedApp, platform, filters, setResults, setQuery, decrementAIQueryCount, router])

  // Debounced search effect for query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (mode === 'full-phrase' || (mode === 'app-first' && selectedApp)) {
        performSearch(localQuery)
      }
    }, 300) // 300ms debounce

    return () => {
      clearTimeout(handler)
    }
  }, [localQuery, mode, selectedApp, performSearch])

  // Immediate search when app is selected in app-first mode (shows all shortcuts)
  useEffect(() => {
    if (mode === 'app-first' && selectedApp) {
      setLocalQuery('') // Clear search input
      performSearch('') // Show all shortcuts immediately
    }
  }, [selectedApp, mode, performSearch])

  // Re-search when filters change in app-first mode
  useEffect(() => {
    if (mode === 'app-first' && selectedApp) {
      performSearch(localQuery)
    }
  }, [filters, mode, selectedApp, performSearch, localQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In Full-Phrase mode with AI enabled, button triggers AI search
    // Button is only shown when AI is enabled, so this always triggers AI search
    if (showAIButton) {
      performAISearch(localQuery)
    }
    // In app-first mode or when AI is off, perform keyword search
    // But this case shouldn't happen since button is hidden when AI is off
  }

  const isFullPhrase = mode === 'full-phrase'
  const placeholder = isFullPhrase 
    ? 'Ask anything... (e.g., "how to split screen" or "undo last change")'
    : selectedApp
      ? 'Filter shortcuts... (optional)'
      : 'Quick search shortcuts...'

  // Determine button visibility and behavior
  const showAIButton = isFullPhrase && aiEnabled
  const buttonLabel = 'Search with AI'
  // Builtin AI (premium) is always ready; personal key requires localStorage config
  const isAIReady = aiKeyMode === 'builtin' || isAIConfigured()
  const buttonDisabled = isSearching || isAISearching || !isAIReady
  const buttonTooltip = !isAIReady ? 'Configure AI in Settings' : undefined

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={placeholder}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={(e) => {
                // Prevent Tab from cycling through form elements
                // Tab should only toggle mode (handled by global keydown handler)
                console.log('[SearchBar] Key down:', e)
                if (e.key === 'Tab') {
                  e.preventDefault()
                  // The global handler will toggle mode
                  return
                }
                if (e.key === 'Enter') {
                  // After Enter, unfocus so user can use shortcuts on results
                  setTimeout(() => {
                    if (e.target instanceof HTMLInputElement) {
                      e.target.blur()
                    }
                  }, 0)
                }
              }}
              className={`w-full px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                isFullPhrase ? 'py-4 text-lg' : 'py-3'
              }`}
              autoFocus
            />
            {(isSearching || isAISearching) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary-600 border-r-transparent"></div>
              </div>
            )}
          </div>
          {showAIButton && (
            <button
              type="submit"
              className="px-6 py-3 rounded-lg font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={buttonDisabled}
              title={buttonTooltip}
            >
              {isAISearching ? 'Searching...' : buttonLabel}
            </button>
          )}
        </div>
        
        {/* AI Error Message */}
        {aiError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
            {aiError}
          </div>
        )}
        
        {/* AI Success Indicator */}
        {aiSearchSuccess && !aiError && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg text-sm">
            ✓ AI-ranked results
          </div>
        )}
        
        {/* AI Search Info */}
        {showAIButton && !aiError && !aiSearchSuccess && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            AI ranks existing shortcuts by relevance — it does not find new apps or shortcuts.
            To discover shortcuts for a new app, use <strong>App-First Mode</strong> and press &ldquo;Use AI to search for shortcuts&rdquo;.
          </div>
        )}
      </div>
    </form>
  )
}
