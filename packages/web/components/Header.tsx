'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { isAIConfigured } from '@/lib/config'

export function Header() {
  const mode = useStore((state) => state.mode)
  const platform = useStore((state) => state.platform)
  const aiEnabled = useStore((state) => state.aiEnabled)
  const toggleMode = useStore((state) => state.toggleMode)
  const toggleAI = useStore((state) => state.toggleAI)
  const userTier = useStore((state) => state.userTier)
  const aiQueryCount = useStore((state) => state.aiQueryCount)
  const setShowSettings = useStore((state) => state.setShowSettings)
  const setPlatform = useStore((state) => state.setPlatform)

  // Detect platform on client-side after hydration to avoid mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && platform === 'all') {
      const userAgent = window.navigator.userAgent.toLowerCase()
      if (userAgent.includes('mac')) setPlatform('mac')
      else if (userAgent.includes('win')) setPlatform('windows')
      else if (userAgent.includes('linux')) setPlatform('linux')
    }
  }, [])

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
                title={!isAIConfigured() ? "Configure AI in Settings to enable" : "Press F4 to toggle AI (Cmd+A in Full-Phrase mode)"}
              >
                AI: {aiEnabled ? 'ON' : 'OFF'}
                {!isAIConfigured() && !aiEnabled && (
                  <span className="ml-1 text-xs">- Configure in Settings</span>
                )}
              </button>
              {aiEnabled && (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {getAIQueryDisplay()}
                </span>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Open Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
