import { create } from 'zustand'
import type { Shortcut } from '@katasumi/core'

export type SearchMode = 'app-first' | 'full-phrase'
export type Platform = 'mac' | 'windows' | 'linux' | 'all'

export interface SearchFilters {
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
  
  // Search state
  selectedApp: string | null
  query: string
  filters: SearchFilters
  results: Shortcut[]
  selectedShortcut: Shortcut | null
  
  // Actions
  setMode: (mode: SearchMode) => void
  toggleMode: () => void
  setPlatform: (platform: Platform) => void
  toggleAI: () => void
  setShowHelp: (show: boolean) => void
  setShowPlatformSelector: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  
  selectApp: (app: string | null) => void
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters) => void
  setResults: (results: Shortcut[]) => void
  selectShortcut: (shortcut: Shortcut | null) => void
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
  platform: typeof window !== 'undefined' ? detectPlatform() : 'all',
  aiEnabled: false,
  showHelp: false,
  showPlatformSelector: false,
  showSettings: false,
  
  // Initial search state
  selectedApp: null,
  query: '',
  filters: {},
  results: [],
  selectedShortcut: null,
  
  // UI actions
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({
    mode: state.mode === 'app-first' ? 'full-phrase' : 'app-first'
  })),
  setPlatform: (platform) => set({ platform }),
  toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
  setShowHelp: (showHelp) => set({ showHelp }),
  setShowPlatformSelector: (showPlatformSelector) => set({ showPlatformSelector }),
  setShowSettings: (showSettings) => set({ showSettings }),
  
  // Search actions
  selectApp: (selectedApp) => set({ selectedApp }),
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set({ filters }),
  setResults: (results) => set({ results }),
  selectShortcut: (selectedShortcut) => set({ selectedShortcut }),
}))
