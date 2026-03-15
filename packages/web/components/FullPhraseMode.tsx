'use client'

import { SearchBar } from './SearchBar'
import { ResultsList } from './ResultsList'
import { ShortcutDetail } from './ShortcutDetail'
import { useStore } from '@/lib/store'

export function FullPhraseMode() {
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
        {/* Clarifying note about AI behaviour in this mode */}
        <div className="max-w-2xl mx-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-5 py-4 text-left space-y-2">
          <p className="text-blue-900 dark:text-blue-200 font-semibold text-sm">
            💡 What does &ldquo;Search with AI&rdquo; do here?
          </p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            In Full-Phrase Mode the AI uses natural language processing to <strong>re-rank shortcuts already in the database</strong> so the most relevant ones appear first. It does <em>not</em> search the internet or discover new shortcuts.
          </p>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            🔍 <strong>To find shortcuts for a new app</strong>, switch to <strong>App-First Mode</strong> (press&nbsp;
            <kbd className="px-1.5 py-0.5 rounded border border-blue-400 dark:border-blue-600 font-mono text-xs bg-white dark:bg-blue-950">Tab</kbd>
            ), search for the app, and press <strong>&ldquo;Use AI to search for shortcuts&rdquo;</strong> — this scrapes the web for official documentation and adds real shortcuts to your library.
          </p>
        </div>
      </div>
      <SearchBar />
      <ResultsList results={results} />
      <ShortcutDetail />
    </div>
  )
}
