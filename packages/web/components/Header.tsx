'use client'

import { useStore } from '@/lib/store'

export function Header() {
  const mode = useStore((state) => state.mode)
  const platform = useStore((state) => state.platform)
  const aiEnabled = useStore((state) => state.aiEnabled)

  const formatMode = (m: string) => {
    return m === 'app-first' ? 'App-First' : 'Full-Phrase'
  }

  const formatPlatform = (p: string) => {
    if (p === 'mac') return 'macOS'
    if (p === 'windows') return 'Windows'
    if (p === 'linux') return 'Linux'
    return 'All'
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Katasumi
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              <span className="font-semibold">Mode:</span> {formatMode(mode)}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>
              <span className="font-semibold">Platform:</span> {formatPlatform(platform)}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>
              <span className="font-semibold">AI:</span> {aiEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
