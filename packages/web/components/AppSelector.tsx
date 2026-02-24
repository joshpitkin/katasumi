'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { isAIConfigured } from '@/lib/config'

interface AppInfo {
  id: string
  name: string
  displayName: string
  category: string
  platforms: string[]
  shortcutCount: number
}

interface ScrapedShortcut {
  action: string
  keys: {
    mac?: string
    windows?: string
    linux?: string
  }
  context?: string
  category?: string
  tags: string[]
  confidence?: number
}

interface ScrapedResult {
  app: {
    name: string
    displayName: string
    category: string
  }
  shortcuts: ScrapedShortcut[]
  sourceUrl: string
  scrapedAt: string
}

export function AppSelector() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [apps, setApps] = useState<AppInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [isInputMode, setIsInputMode] = useState(true)
  const [isAIScraping, setIsAIScraping] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiEnabled = useStore((state) => state.aiEnabled)

  // Focus input on mount (replacing autoFocus attribute)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    async function fetchApps() {
      try {
        // Include authentication token if available to get user apps
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
          console.log('[AppSelector] Including auth token in apps request')
        }

        const response = await fetch('/api/apps', { headers })
        const data = await response.json()
        setApps(data.apps || [])
      } catch (error) {
        console.error('Failed to fetch apps:', error)
        // Fallback to empty array - API should be available
        setApps([])
      } finally {
        setLoading(false)
      }
    }
    fetchApps()
  }, [])

  console.log('[AppSelector] Rendering with apps:', apps)
  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectApp = useCallback((appName: string) => {
    useStore.setState({ selectedApp: appName })
  }, [])

  const handleAISearch = async () => {
    // Check authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      setAiError('Please login to use AI search')
      router.push('/login')
      return
    }

    // Check AI configuration
    if (!isAIConfigured()) {
      setAiError('Please configure AI in Settings first')
      return
    }

    // Load AI config from localStorage
    const configStr = typeof window !== 'undefined' ? localStorage.getItem('katasumi-config') : null
    let aiConfig = null
    if (configStr) {
      try {
        const config = JSON.parse(configStr)
        aiConfig = config.ai
      } catch (e) {
        console.error('Failed to parse AI config:', e)
        setAiError('Invalid AI configuration. Please reconfigure in Settings.')
        return
      }
    }

    if (!aiConfig) {
      setAiError('AI configuration not found. Please configure in Settings.')
      return
    }

    setIsAIScraping(true)
    setAiError(null)

    try {
      console.log('[AppSelector] Starting AI scrape for app:', searchQuery)
      
      const response = await fetch('/api/ai/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          appName: searchQuery,
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          baseUrl: aiConfig.baseUrl
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to scrape shortcuts')
      }
      
      const data = await response.json()
      console.log('[AppSelector] Received scraped shortcuts:', data)
      
      // Show confirmation dialog
      const confirmed = confirm(
        `Found ${data.shortcuts.length} shortcuts for ${data.app.displayName}!\n\n` +
        `Source: ${data.sourceUrl}\n\n` +
        `Would you like to add these shortcuts to your database?`
      )
      
      if (confirmed) {
        await saveScrapedShortcuts(data, token)
        // Select the newly added app
        handleSelectApp(data.app.name)
      }
    } catch (error) {
      console.error('AI scraping failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to search for shortcuts. Please try again.'
      setAiError(errorMessage)
    } finally {
      setIsAIScraping(false)
    }
  }

  const saveScrapedShortcuts = async (scrapeData: ScrapedResult, token: string) => {
    try {
      // Save each shortcut to the database
      const promises = scrapeData.shortcuts.map((shortcut: ScrapedShortcut) => 
        fetch('/api/shortcuts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            app: scrapeData.app.name,
            action: shortcut.action,
            keysMac: shortcut.keys.mac,
            keysWindows: shortcut.keys.windows,
            keysLinux: shortcut.keys.linux,
            context: shortcut.context,
            category: shortcut.category || scrapeData.app.category,
            tags: shortcut.tags.join(','),
            sourceType: 'ai-scraped',
            sourceUrl: scrapeData.sourceUrl,
            sourceScrapedAt: scrapeData.scrapedAt,
            sourceConfidence: shortcut.confidence
          })
        })
      )
      
      await Promise.all(promises)
      console.log('[AppSelector] Successfully saved shortcuts')
    } catch (error) {
      console.error('[AppSelector] Failed to save shortcuts:', error)
      throw error
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // In input mode
      if (isInputMode) {
        if (e.key === 'Enter' && filteredApps.length > 0) {
          e.preventDefault()
          // Select first matching app
          handleSelectApp(filteredApps[0].name)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          // Exit input mode, enter navigation mode
          setIsInputMode(false)
          setFocusedIndex(0)
          inputRef.current?.blur()
        }
      } 
      // In navigation mode
      else {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % filteredApps.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + filteredApps.length) % filteredApps.length)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % filteredApps.length)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + filteredApps.length) % filteredApps.length)
        } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredApps.length) {
          e.preventDefault()
          handleSelectApp(filteredApps[focusedIndex].name)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          // Return to input mode
          setIsInputMode(true)
          setFocusedIndex(-1)
          inputRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInputMode, focusedIndex, filteredApps, handleSelectApp])

  // Reset to input mode when search query changes
  useEffect(() => {
    if (searchQuery && !isInputMode) {
      setIsInputMode(true)
      setFocusedIndex(-1)
    }
  }, [searchQuery, isInputMode])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading applications...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search applications... (Press Enter to select first, Escape to navigate with arrows)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredApps.map((app, index) => (
          <button
            key={app.id}
            type="button"
            onClick={() => handleSelectApp(app.name)}
            className={`px-6 py-4 rounded-lg border-2 transition-colors font-medium ${
              !isInputMode && focusedIndex === index
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 text-gray-900 dark:text-white ring-2 ring-primary-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-900 dark:text-white'
            }`}
          >
            {app.displayName}
          </button>
        ))}
      </div>
      {filteredApps.length === 0 && searchQuery.trim() && (
        <div className="text-center mt-8 space-y-4">
          <p className="text-gray-500 dark:text-gray-400">
            No applications found for &ldquo;{searchQuery}&rdquo;
          </p>
          
          {/* AI Search Button - only show if AI is enabled */}
          {aiEnabled && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleAISearch}
                disabled={isAIScraping || !isAIConfigured()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                title={!isAIConfigured() ? 'Configure AI in Settings' : undefined}
              >
                {isAIScraping ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Use AI to search for shortcuts
                  </>
                )}
              </button>
              
              {aiError && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm max-w-md">
                  {aiError}
                </div>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI will search the web for official documentation and extract keyboard shortcuts
              </p>
            </div>
          )}
        </div>
      )}
      {filteredApps.length === 0 && !searchQuery.trim() && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-6">
          Start typing to search for applications
        </p>
      )}
    </div>
  )
}
