'use client'

import { useStore } from '@/lib/store'

export function HelpOverlay() {
  const setShowHelp = useStore((state) => state.setShowHelp)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Global Shortcuts
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Mode (App-First ↔ Full-Phrase)</span>
                <kbd className="kbd">Tab</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle AI</span>
                <kbd className="kbd">a</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Platform Selector</span>
                <kbd className="kbd">p</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Keyboard Shortcuts Help</span>
                <kbd className="kbd">?</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Settings</span>
                <div className="flex gap-2">
                  <kbd className="kbd">Cmd+,</kbd>
                  <span className="text-gray-500">or</span>
                  <kbd className="kbd">Ctrl+,</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Close Modal/Overlay</span>
                <kbd className="kbd">Esc</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Search & Navigation
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Focus Search Input</span>
                <kbd className="kbd">/</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Execute Search (and unfocus)</span>
                <kbd className="kbd">Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Unfocus Input (keep query)</span>
                <kbd className="kbd">Esc</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Clear Input (stay focused)</span>
                <kbd className="kbd">Ctrl+L</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Navigate Results Up/Down</span>
                <div className="flex gap-2">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Open Selected Result Detail</span>
                <kbd className="kbd">Enter</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              App-First Mode
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Go to App Selector</span>
                <kbd className="kbd">g</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Focus Filters</span>
                <kbd className="kbd">f</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Open App Selector</span>
                <div className="flex gap-2">
                  <kbd className="kbd">Cmd+K</kbd>
                  <span className="text-gray-500">or</span>
                  <kbd className="kbd">Ctrl+K</kbd>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              About Modes
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <strong className="text-gray-900 dark:text-white">App-First Mode:</strong>
                <p>Select an application first, then search within its shortcuts.</p>
              </div>
              <div>
                <strong className="text-gray-900 dark:text-white">Full-Phrase Mode:</strong>
                <p>Search with natural language across all applications at once.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
