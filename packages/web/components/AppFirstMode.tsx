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
  const selectedShortcut = useStore((state) => state.selectedShortcut)
  const results = useStore((state) => state.results)
  const mode = useStore((state) => state.mode)
  const toggleMode = useStore((state) => state.toggleMode)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Tab: Toggle mode
      if (e.key === 'Tab' && !e.shiftKey && mode === 'app-first') {
        e.preventDefault()
        toggleMode()
      }
      
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux): Change app
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useStore.setState({ selectedApp: null, query: '', results: [], selectedShortcut: null })
      }
      
      // Cmd+F (Mac) or Ctrl+F (Windows/Linux): Focus filters (handled by browser default)
      // We'll let the browser handle this naturally
      
      // Escape: Clear selection
      if (e.key === 'Escape') {
        if (selectedShortcut) {
          useStore.setState({ selectedShortcut: null })
        } else if (selectedApp) {
          useStore.setState({ selectedApp: null, query: '', results: [] })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, toggleMode, selectedApp, selectedShortcut])

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
          {selectedShortcut ? (
            <ShortcutDetail />
          ) : (
            <ResultsList results={results} />
          )}
        </>
      )}
    </div>
  )
}
