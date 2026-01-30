'use client'

import type { Shortcut } from '@katasumi/core'
import { useStore } from '@/lib/store'
import { useEffect, useRef } from 'react'

interface ResultsListProps {
  results: Shortcut[]
}

export function ResultsList({ results }: ResultsListProps) {
  const selectShortcut = useStore((state) => state.selectShortcut)
  const platform = useStore((state) => state.platform)
  const mode = useStore((state) => state.mode)
  const selectedApp = useStore((state) => state.selectedApp)
  const selectedResultIndex = useStore((state) => state.selectedResultIndex)
  const navigateResults = useStore((state) => state.navigateResults)
  const setSelectedResultIndex = useStore((state) => state.setSelectedResultIndex)
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      
      // Escape - Exit keyboard navigation mode (unfocus current result)
      if (e.key === 'Escape' && !isTyping && selectedResultIndex >= 0) {
        e.preventDefault()
        setSelectedResultIndex(-1)
        return
      }
      
      // Tab/Shift+Tab - Cycle through results when in keyboard navigation mode
      if (e.key === 'Tab' && !isTyping && results.length > 0) {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tab - go backwards
          if (selectedResultIndex <= 0) {
            setSelectedResultIndex(results.length - 1)
          } else {
            navigateResults('up')
          }
        } else {
          // Tab - go forwards
          if (selectedResultIndex === results.length - 1) {
            setSelectedResultIndex(0)
          } else if (selectedResultIndex === -1) {
            setSelectedResultIndex(0)
          } else {
            navigateResults('down')
          }
        }
        return
      }
      
      // Ctrl+Home - Jump to first result
      if (e.key === 'Home' && e.ctrlKey && !isTyping && results.length > 0) {
        e.preventDefault()
        setSelectedResultIndex(0)
        return
      }
      
      // Ctrl+End - Jump to last result
      if (e.key === 'End' && e.ctrlKey && !isTyping && results.length > 0) {
        e.preventDefault()
        setSelectedResultIndex(results.length - 1)
        return
      }
      
      // Arrow navigation (only if not typing and we have results)
      if (!isTyping && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          navigateResults('down')
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          navigateResults('up')
        } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
          e.preventDefault()
          const selectedResult = results[selectedResultIndex]
          if (selectedResult) {
            selectShortcut(selectedResult)
          }
        }
      }
    }
    
    // Handle click outside to exit keyboard navigation
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // If clicked element is not a result button, exit keyboard navigation
      if (!target.closest('[data-result-item]')) {
        setSelectedResultIndex(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClickOutside)
    }
  }, [results, selectedResultIndex, navigateResults, selectShortcut, setSelectedResultIndex])

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResultIndex >= 0 && resultRefs.current[selectedResultIndex]) {
      resultRefs.current[selectedResultIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedResultIndex])

  const getKeysForPlatform = (shortcut: Shortcut) => {
    if (platform === 'all') {
      return shortcut.keys.mac || shortcut.keys.windows || shortcut.keys.linux || ''
    }
    if (platform === 'mac') return shortcut.keys.mac || ''
    if (platform === 'windows') return shortcut.keys.windows || ''
    if (platform === 'linux') return shortcut.keys.linux || ''
    return ''
  }

  if (results.length === 0) {
    const emptyMessage = mode === 'app-first' && selectedApp
      ? `No shortcuts found for ${selectedApp}. Try a different search term.`
      : 'No shortcuts found. Try a different search.'
    
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      </div>
    )
  }

  // Group results by app in full-phrase mode
  const groupedResults = mode === 'full-phrase' 
    ? results.reduce((acc, shortcut) => {
        const app = shortcut.app
        if (!acc[app]) {
          acc[app] = []
        }
        acc[app].push(shortcut)
        return acc
      }, {} as Record<string, Shortcut[]>)
    : { '': results } // Single group for app-first mode

  return (
    <div className="max-w-4xl mx-auto">
      {mode === 'full-phrase' ? (
        // Full-Phrase mode: Results grouped by app
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([app, shortcuts]) => (
            <div key={app} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1 border-b-2 border-primary-500">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {app}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({shortcuts.length})
                </span>
              </div>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => {
                  const globalIndex = results.findIndex(r => r.id === shortcut.id)
                  return (
                    <button
                      key={shortcut.id}
                      ref={(el) => { resultRefs.current[globalIndex] = el }}
                      onClick={() => {
                        setSelectedResultIndex(globalIndex)
                        selectShortcut(shortcut)
                      }}
                      data-result-item
                      className={`w-full text-left px-6 py-4 rounded-lg border transition-colors ${
                        selectedResultIndex === globalIndex
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium">
                            {shortcut.action}
                          </p>
                          {shortcut.context && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {shortcut.context}
                            </p>
                          )}
                          {shortcut.category && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">
                              {shortcut.category}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <kbd className="kbd text-sm">
                            {getKeysForPlatform(shortcut)}
                          </kbd>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // App-First mode: Flat list
        <div className="space-y-2">
          {results.map((shortcut, index) => (
            <button
              key={shortcut.id}
              ref={(el) => { resultRefs.current[index] = el }}
              onClick={() => {
                setSelectedResultIndex(index)
                selectShortcut(shortcut)
              }}
              data-result-item
              className={`w-full text-left px-6 py-4 rounded-lg border transition-colors ${
                selectedResultIndex === index
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {shortcut.app}
                    </span>
                    {shortcut.category && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        • {shortcut.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {shortcut.action}
                  </p>
                  {shortcut.context && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {shortcut.context}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <kbd className="kbd text-sm">
                    {getKeysForPlatform(shortcut)}
                  </kbd>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
