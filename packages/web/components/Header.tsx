'use client'

import { useStore } from '@/lib/store'

export function Header() {
  const mode = useStore((state) => state.mode)
  const platform = useStore((state) => state.platform)
  const aiEnabled = useStore((state) => state.aiEnabled)
  const toggleMode = useStore((state) => state.toggleMode)
  const toggleAI = useStore((state) => state.toggleAI)
  const userTier = useStore((state) => state.userTier)
  const aiQueryCount = useStore((state) => state.aiQueryCount)

  const formatMode = (m: string) => {
    return m === 'app-first' ? 'App-First' : 'Full-Phrase'
  }

  const formatPlatform = (p: string) => {
    if (p === 'mac') return 'macOS'
    if (p === 'windows') return 'Windows'
    if (p === 'linux') return 'Linux'
    return 'All'
  }

  const getAIQueryDisplay = () => {
    if (userTier === 'premium') {
      return 'Unlimited'
    }
    return `${aiQueryCount} remaining`
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Katasumi
          </h1>
          <div className="flex items-center gap-4">
            {/* Mode Toggle Button */}
            <button
              onClick={toggleMode}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Press Tab to toggle mode"
            >
              Mode: {formatMode(mode)}
            </button>

            {/* Platform Display */}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Platform:</span> {formatPlatform(platform)}
            </span>

            {/* AI Toggle Button with Status */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAI}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  aiEnabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Press F4 to toggle AI (Cmd+A in Full-Phrase mode)"
              >
                AI: {aiEnabled ? 'ON' : 'OFF'}
              </button>
              {aiEnabled && (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {getAIQueryDisplay()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
