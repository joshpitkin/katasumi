'use client'

import { AppSelector } from './AppSelector'
import { SearchBar } from './SearchBar'
import { Filters } from './Filters'
import { ResultsList } from './ResultsList'
import { ShortcutDetail } from './ShortcutDetail'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'

export function AppFirstMode() {
  const selectedApp = useStore((state) => state.selectedApp)
  const results = useStore((state) => state.results)
  const mode = useStore((state) => state.mode)
  const toggleMode = useStore((state) => state.toggleMode)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Check if typing in input
      const target = e.target as HTMLElement
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      
      // Tab: Toggle mode (handled globally in page.tsx)
      
      // g - Go to app selector (vi-style, only when not typing)
      if (e.key === 'g' && !isTyping && selectedApp) {
        e.preventDefault()
        useStore.setState({ selectedApp: null, query: '', results: [], selectedShortcut: null })
        return
      }
      
      // f - Focus filters (vi-style, only when not typing)
      if (e.key === 'f' && !isTyping && selectedApp) {
        e.preventDefault()
        // Focus the first filter input/select element
        const filterElement = document.querySelector('.filters-container input, .filters-container select') as HTMLElement
        filterElement?.focus()
        return
      }
      
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux): Change app (also works)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useStore.setState({ selectedApp: null, query: '', results: [], selectedShortcut: null })
        return
      }
      
      // Escape: Clear selection (handled globally, but we can also handle it here)
      if (e.key === 'Escape') {
        if (selectedApp && !isTyping) {
          useStore.setState({ selectedApp: null, query: '', results: [] })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, toggleMode, selectedApp])

  return (
    <div className="space-y-6">
      {!selectedApp ? (
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            App-First Mode
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Select an application to search its shortcuts
          </p>
          <AppSelector />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button
              onClick={() => useStore.setState({ selectedApp: null, query: '', results: [] })}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              title="Press Cmd+K to change app"
            >
              ← Back to apps
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedApp}
            </h2>
          </div>
          <Filters />
          <SearchBar />
          <ResultsList results={results} />
          <ShortcutDetail />
        </>
      )}
    </div>
  )
}
