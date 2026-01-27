'use client'

import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { ShortcutDetail } from './ShortcutDetail'
import { useStore } from '@/lib/store'

export function FullPhraseMode() {
  const selectedShortcut = useStore((state) => state.selectedShortcut)
  const results = useStore((state) => state.results)

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Full-Phrase Mode
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Search with natural language across all applications
        </p>
      </div>
      <SearchBar />
      {selectedShortcut ? (
        <ShortcutDetail />
      ) : (
        <ResultsList results={results} />
      )}
    </div>
  )
}
