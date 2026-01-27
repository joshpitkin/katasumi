'use client'

import { AppSelector } from './AppSelector'
import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { ShortcutDetail } from './ShortcutDetail'
import { useStore } from '@/lib/store'

export function AppFirstMode() {
  const selectedApp = useStore((state) => state.selectedApp)
  const selectedShortcut = useStore((state) => state.selectedShortcut)
  const results = useStore((state) => state.results)

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
            >
              ← Back to apps
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedApp}
            </h2>
          </div>
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
