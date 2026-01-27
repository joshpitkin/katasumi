'use client'

import { useStore } from '@/lib/store'
import { useState } from 'react'

export function SearchBar() {
  const query = useStore((state) => state.query)
  const setQuery = useStore((state) => state.setQuery)
  const [localQuery, setLocalQuery] = useState(query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(localQuery)
    // TODO: Trigger actual search
    console.log('Searching for:', localQuery)
  }

  return (
    <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoFocus
        />
        <button
          type="submit"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  )
}
