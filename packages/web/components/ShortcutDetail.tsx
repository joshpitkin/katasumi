'use client'

import { useStore } from '@/lib/store'

export function ShortcutDetail() {
  const shortcut = useStore((state) => state.selectedShortcut)
  const selectShortcut = useStore((state) => state.selectShortcut)
  const platform = useStore((state) => state.platform)

  if (!shortcut) return null

  const getKeysForPlatform = () => {
    if (platform === 'all') {
      return shortcut.keys.mac || shortcut.keys.windows || shortcut.keys.linux || ''
    }
    if (platform === 'mac') return shortcut.keys.mac || ''
    if (platform === 'windows') return shortcut.keys.windows || ''
    if (platform === 'linux') return shortcut.keys.linux || ''
    return ''
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => selectShortcut(null)}
        className="mb-4 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
      >
        ← Back to results
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {shortcut.app}
            </span>
            {shortcut.category && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                • {shortcut.category}
              </span>
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {shortcut.action}
          </h2>
          {shortcut.context && (
            <p className="text-gray-600 dark:text-gray-400">
              {shortcut.context}
            </p>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Keyboard Shortcut
          </h3>
          <div className="inline-block">
            <kbd className="kbd text-2xl px-6 py-3">
              {getKeysForPlatform()}
            </kbd>
          </div>
        </div>

        {(shortcut.keys.mac || shortcut.keys.windows || shortcut.keys.linux) && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Platform Variants
            </h3>
            <div className="space-y-2">
              {shortcut.keys.mac && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-20">macOS:</span>
                  <kbd className="kbd">{shortcut.keys.mac}</kbd>
                </div>
              )}
              {shortcut.keys.windows && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-20">Windows:</span>
                  <kbd className="kbd">{shortcut.keys.windows}</kbd>
                </div>
              )}
              {shortcut.keys.linux && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-20">Linux:</span>
                  <kbd className="kbd">{shortcut.keys.linux}</kbd>
                </div>
              )}
            </div>
          </div>
        )}

        {shortcut.tags && shortcut.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {shortcut.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {shortcut.source && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Source
            </h3>
            <a
              href={shortcut.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm"
            >
              {shortcut.source.url}
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Type: {shortcut.source.type} • Confidence: {(shortcut.source.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
