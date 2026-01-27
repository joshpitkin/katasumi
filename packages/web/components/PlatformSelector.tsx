'use client'

import { useStore, type Platform } from '@/lib/store'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'mac', label: 'macOS' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
  { value: 'all', label: 'All Platforms' },
]

export function PlatformSelector() {
  const platform = useStore((state) => state.platform)
  const setPlatform = useStore((state) => state.setPlatform)
  const setShowPlatformSelector = useStore((state) => state.setShowPlatformSelector)

  const handleSelect = (p: Platform) => {
    setPlatform(p)
    setShowPlatformSelector(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Platform
            </h2>
            <button
              onClick={() => setShowPlatformSelector(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleSelect(p.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                platform === p.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.label}</span>
                {platform === p.value && (
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
