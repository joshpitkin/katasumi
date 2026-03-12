'use client'

import { useStore } from '@/lib/store'
import { useState, useEffect, useRef } from 'react'

interface DropdownProps {
  label: string
  options: string[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder: string
  forwardRef?: React.RefObject<HTMLButtonElement>
  hotkey?: string
}

function Dropdown({ label, options, value, onChange, placeholder, forwardRef, hotkey }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    // Handle keyboard navigation within dropdown
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(false)
        buttonRef.current?.blur()
        return
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setHighlightedIndex((prev) => Math.max(-1, prev - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (highlightedIndex === -1) {
          onChange(undefined)
        } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex])
        }
        setIsOpen(false)
        buttonRef.current?.blur()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    // Use capture phase to intercept events before they reach the form
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [isOpen, highlightedIndex, options, onChange])
  
  // Reset highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={forwardRef || buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onFocus={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
      >
        {value || placeholder}
        {hotkey && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({hotkey})</span>
        )}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(undefined)
              setIsOpen(false)
            }}
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 italic ${
              highlightedIndex === -1 ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            {placeholder}
          </button>
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white ${
                highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Filters() {
  const filters = useStore((state) => state.filters)
  const setFilters = useStore((state) => state.setFilters)
  const selectedApp = useStore((state) => state.selectedApp)
  const [contexts, setContexts] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const contextButtonRef = useRef<HTMLButtonElement>(null)
  const categoryButtonRef = useRef<HTMLButtonElement>(null)
  const tagButtonRef = useRef<HTMLButtonElement>(null)

  // Handle keyboard shortcuts for filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if typing in input
      const target = e.target as HTMLElement
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      
      if (isTyping || !selectedApp) return
      
      // c - Focus context filter
      if (e.key === 'c') {
        e.preventDefault()
        contextButtonRef.current?.focus()
        return
      }
      
      // r - Focus category filter  
      if (e.key === 'r') {
        e.preventDefault()
        categoryButtonRef.current?.focus()
        return
      }
      
      // t - Focus tag filter
      if (e.key === 't') {
        e.preventDefault()
        tagButtonRef.current?.focus()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedApp])

  useEffect(() => {
    // Fetch available contexts, categories and tags for the selected app
    async function fetchFilters() {
      if (!selectedApp) return

      try {
        const params = new URLSearchParams({ app: selectedApp })
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        const response = await fetch(`/api/search?${params}`, { headers })
        const data = await response.json()
        
        // Extract unique contexts, categories and tags
        const uniqueContexts = new Set<string>()
        const uniqueCategories = new Set<string>()
        const uniqueTags = new Set<string>()
        
        data.results?.forEach((result: any) => {
          if (result.context) uniqueContexts.add(result.context)
          if (result.category) uniqueCategories.add(result.category)
          result.tags?.forEach((tag: string) => uniqueTags.add(tag))
        })
        
        setContexts(Array.from(uniqueContexts).sort())
        setCategories(Array.from(uniqueCategories).sort())
        setTags(Array.from(uniqueTags).sort())
      } catch (error) {
        console.error('Failed to fetch filters:', error)
      }
    }

    fetchFilters()
  }, [selectedApp])

  if (!selectedApp) return null

  const handleContextChange = (context: string | undefined) => {
    setFilters({ ...filters, context })
  }

  const handleCategoryChange = (category: string | undefined) => {
    setFilters({ ...filters, category })
  }

  const handleTagChange = (tag: string | undefined) => {
    setFilters({ ...filters, tag })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filters:
        </span>
        {contexts.length > 0 && (
          <Dropdown
            label="Context"
            options={contexts}
            value={filters.context}
            onChange={handleContextChange}
            placeholder="All Contexts"
            forwardRef={contextButtonRef}
            hotkey="c"
          />
        )}
        {categories.length > 0 && (
          <Dropdown
            label="Category"
            options={categories}
            value={filters.category}
            onChange={handleCategoryChange}
            placeholder="All Categories"
            forwardRef={categoryButtonRef}
            hotkey="r"
          />
        )}
        {tags.length > 0 && (
          <Dropdown
            label="Tag"
            options={tags}
            value={filters.tag}
            onChange={handleTagChange}
            placeholder="All Tags"
            forwardRef={tagButtonRef}
            hotkey="t"
          />
        )}
        {(filters.context || filters.category || filters.tag) && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
