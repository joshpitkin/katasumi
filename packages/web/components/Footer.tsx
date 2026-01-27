'use client'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>
            <kbd className="kbd">Tab</kbd> Toggle Mode
          </span>
          <span>
            <kbd className="kbd">F4</kbd> Toggle AI
          </span>
          <span>
            <kbd className="kbd">F5</kbd> Platform
          </span>
          <span>
            <kbd className="kbd">?</kbd> Help
          </span>
          <span>
            <kbd className="kbd">Cmd+,</kbd> Settings
          </span>
        </div>
      </div>
    </footer>
  )
}
