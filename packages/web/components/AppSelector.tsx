'use client'

import { useState } from 'react'

const POPULAR_APPS = [
  'vim', 'tmux', 'vscode', 'git', 'bash',
  'macos', 'windows', 'gnome', 'chrome', 'firefox'
]

export function AppSelector() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApps = POPULAR_APPS.filter((app) =>
    app.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectApp = (app: string) => {
    const { useStore } = require('@/lib/store')
    useStore.setState({ selectedApp: app })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <input
        type="text"
        placeholder="Search applications..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        autoFocus
      />
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredApps.map((app) => (
          <button
            key={app}
            onClick={() => handleSelectApp(app)}
            className="px-6 py-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-900 dark:text-white font-medium transition-colors"
          >
            {app}
          </button>
        ))}
      </div>
      {filteredApps.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-6">
          No applications found
        </p>
      )}
    </div>
  )
}
