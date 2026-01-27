'use client'

import { useStore } from '@/lib/store'
import { useState, useEffect, useRef } from 'react'

interface DropdownProps {
  label: string
  options: string[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder: string
}

function Dropdown({ label, options, value, onChange, placeholder }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
      >
        {value || placeholder}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(undefined)
              setIsOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 italic"
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
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
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    // Fetch available categories and tags for the selected app
    async function fetchFilters() {
      if (!selectedApp) return

      try {
        const params = new URLSearchParams({ app: selectedApp })
        const response = await fetch(`/api/search?${params}`)
        const data = await response.json()
        
        // Extract unique categories and tags
        const uniqueCategories = new Set<string>()
        const uniqueTags = new Set<string>()
        
        data.results?.forEach((result: any) => {
          if (result.category) uniqueCategories.add(result.category)
          result.tags?.forEach((tag: string) => uniqueTags.add(tag))
        })
        
        setCategories(Array.from(uniqueCategories).sort())
        setTags(Array.from(uniqueTags).sort())
      } catch (error) {
        console.error('Failed to fetch filters:', error)
      }
    }

    fetchFilters()
  }, [selectedApp])

  if (!selectedApp) return null

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
        <Dropdown
          label="Category"
          options={categories}
          value={filters.category}
          onChange={handleCategoryChange}
          placeholder="All Categories"
        />
        <Dropdown
          label="Tag"
          options={tags}
          value={filters.tag}
          onChange={handleTagChange}
          placeholder="All Tags"
        />
        {(filters.category || filters.tag) && (
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
