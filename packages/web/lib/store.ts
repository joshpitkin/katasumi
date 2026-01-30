import { create } from 'zustand'
import type { Shortcut } from '@katasumi/core'
import { isAIConfigured } from './config'

export type SearchMode = 'app-first' | 'full-phrase'
export type Platform = 'mac' | 'windows' | 'linux' | 'all'

export interface SearchFilters {
  context?: string
  category?: string
  tag?: string
}

interface AppState {
  // UI state
  mode: SearchMode
  platform: Platform
  aiEnabled: boolean
  showHelp: boolean
  showPlatformSelector: boolean
  showSettings: boolean
  
  // User state
  userTier: 'free' | 'premium'
  aiQueryCount: number
  
  // Search state
  selectedApp: string | null
  query: string
  filters: SearchFilters
  results: Shortcut[]
  selectedShortcut: Shortcut | null
  selectedResultIndex: number
  
  // Actions
  setMode: (mode: SearchMode) => void
  toggleMode: () => void
  setPlatform: (platform: Platform) => void
  toggleAI: () => void
  setShowHelp: (show: boolean) => void
  setShowPlatformSelector: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setUserTier: (tier: 'free' | 'premium') => void
  decrementAIQueryCount: () => void
  
  selectApp: (app: string | null) => void
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters) => void
  setResults: (results: Shortcut[]) => void
  selectShortcut: (shortcut: Shortcut | null) => void
  setSelectedResultIndex: (index: number) => void
  navigateResults: (direction: 'up' | 'down') => void
}

// Detect platform from user agent or default
const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'all'
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (userAgent.includes('mac')) return 'mac'
  if (userAgent.includes('win')) return 'windows'
  if (userAgent.includes('linux')) return 'linux'
  return 'all'
}

export const useStore = create<AppState>((set) => ({
  // Initial UI state
  mode: 'app-first',
  // Always start with 'all' to avoid hydration mismatch, then update on client
  platform: 'all',
  aiEnabled: false,
  showHelp: false,
  showPlatformSelector: false,
  showSettings: false,
  
  // Initial user state
  userTier: 'free',
  aiQueryCount: 10, // Free users get 10 AI queries
  
  // Initial search state
  selectedApp: null,
  query: '',
  filters: {},
  results: [],
  selectedShortcut: null,
  selectedResultIndex: -1,
  
  // UI actions
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({
    mode: state.mode === 'app-first' ? 'full-phrase' : 'app-first'
  })),
  setPlatform: (platform) => set({ platform }),
  toggleAI: () => set((state) => {
    // Only allow enabling AI if it's configured
    if (!state.aiEnabled && !isAIConfigured()) {
      // Open settings to configure AI
      return { showSettings: true }
    }
    return { aiEnabled: !state.aiEnabled }
  }),
  setShowHelp: (showHelp) => set({ showHelp }),
  setShowPlatformSelector: (showPlatformSelector) => set({ showPlatformSelector }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setUserTier: (userTier) => set({ userTier }),
  decrementAIQueryCount: () => set((state) => ({
    aiQueryCount: Math.max(0, state.aiQueryCount - 1)
  })),
  
  // Search actions
  selectApp: (selectedApp) => set({ selectedApp }),
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set({ filters }),
  setResults: (results) => set({ results, selectedResultIndex: -1 }),
  selectShortcut: (selectedShortcut) => set({ selectedShortcut }),
  setSelectedResultIndex: (selectedResultIndex) => set({ selectedResultIndex }),
  navigateResults: (direction) => set((state) => {
    if (state.results.length === 0) return state
    
    let newIndex = state.selectedResultIndex
    if (direction === 'down') {
      if (newIndex === -1) {
        newIndex = 0
      } else {
        newIndex = Math.min(state.results.length - 1, newIndex + 1)
      }
    } else {
      if (newIndex === -1) {
        newIndex = state.results.length - 1
      } else {
        newIndex = Math.max(0, newIndex - 1)
      }
    }
    
    return { selectedResultIndex: newIndex }
  }),
}))
