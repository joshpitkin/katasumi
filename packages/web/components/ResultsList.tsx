'use client'

import type { Shortcut } from '@katasumi/core'
import { useStore } from '@/lib/store'

interface ResultsListProps {
  results: Shortcut[]
}

export function ResultsList({ results }: ResultsListProps) {
  const selectShortcut = useStore((state) => state.selectShortcut)
  const platform = useStore((state) => state.platform)
  const mode = useStore((state) => state.mode)

  const getKeysForPlatform = (shortcut: Shortcut) => {
    if (platform === 'all') {
      return shortcut.keys.mac || shortcut.keys.windows || shortcut.keys.linux || ''
    }
    if (platform === 'mac') return shortcut.keys.mac || ''
    if (platform === 'windows') return shortcut.keys.windows || ''
    if (platform === 'linux') return shortcut.keys.linux || ''
    return ''
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No shortcuts found. Try a different search.
        </p>
      </div>
    )
  }

  // Group results by app in full-phrase mode
  const groupedResults = mode === 'full-phrase' 
    ? results.reduce((acc, shortcut) => {
        const app = shortcut.app
        if (!acc[app]) {
          acc[app] = []
        }
        acc[app].push(shortcut)
        return acc
      }, {} as Record<string, Shortcut[]>)
    : { '': results } // Single group for app-first mode

  return (
    <div className="max-w-4xl mx-auto">
      {mode === 'full-phrase' ? (
        // Full-Phrase mode: Results grouped by app
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([app, shortcuts]) => (
            <div key={app} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1 border-b-2 border-primary-500">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {app}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({shortcuts.length})
                </span>
              </div>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.id}
                    onClick={() => selectShortcut(shortcut)}
                    className="w-full text-left px-6 py-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {shortcut.action}
                        </p>
                        {shortcut.context && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {shortcut.context}
                          </p>
                        )}
                        {shortcut.category && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">
                            {shortcut.category}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <kbd className="kbd text-sm">
                          {getKeysForPlatform(shortcut)}
                        </kbd>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // App-First mode: Flat list
        <div className="space-y-2">
          {results.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => selectShortcut(shortcut)}
              className="w-full text-left px-6 py-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {shortcut.app}
                    </span>
                    {shortcut.category && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        • {shortcut.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {shortcut.action}
                  </p>
                  {shortcut.context && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {shortcut.context}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <kbd className="kbd text-sm">
                    {getKeysForPlatform(shortcut)}
                  </kbd>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
