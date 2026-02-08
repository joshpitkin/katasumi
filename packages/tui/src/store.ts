import { create } from 'zustand';
import type { Platform, Shortcut, AppInfo } from '@katasumi/core';
import { loadPlatform, savePlatform, isAIConfigured } from './utils/config.js';

export type PlatformOption = Platform | 'all';

type FocusSection = 'app-selector' | 'filters' | 'results';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface AppState {
  // UI State
  mode: 'app-first' | 'full-phrase';
  view: 'search' | 'results' | 'detail';
  platform: PlatformOption;
  aiEnabled: boolean;
  isInputMode: boolean;
  
  // Sync State
  syncStatus: SyncStatus;
  syncMessage: string;

  // App-First Mode State
  focusSection: FocusSection;
  availableApps: AppInfo[];
  appQuery: string;
  selectedAppIndex: number;
  quickSearchQuery: string;

  // Search State
  selectedApp: AppInfo | null;
  query: string;
  filters: {
    context: string | null;
    category: string | null;
    tags: string[];
  };
  results: Shortcut[];
  selectedShortcut: Shortcut | null;

  // Actions
  setMode: (mode: 'app-first' | 'full-phrase') => void;
  toggleMode: () => void;
  setView: (view: 'search' | 'results' | 'detail') => void;
  setPlatform: (platform: PlatformOption) => void;
  toggleAI: () => void;
  setInputMode: (isInputMode: boolean) => void;
  
  // Sync Actions
  setSyncStatus: (status: SyncStatus, message?: string) => void;
  
  // App-First Mode Actions
  setFocusSection: (section: FocusSection) => void;
  setAvailableApps: (apps: AppInfo[]) => void;
  setAppQuery: (query: string) => void;
  setSelectedAppIndex: (index: number) => void;
  setQuickSearchQuery: (query: string) => void;
  
  selectApp: (app: AppInfo | null) => void;
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  setResults: (results: Shortcut[]) => void;
  selectShortcut: (shortcut: Shortcut | null) => void;
}

function detectPlatform(): Platform {
  switch (process.platform) {
    case 'darwin':
      return 'mac';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
}

function getInitialPlatform(): PlatformOption {
  return loadPlatform() || detectPlatform();
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'app-first',
  view: 'search',
  platform: getInitialPlatform(),
  aiEnabled: false,
  isInputMode: false,
  
  // Sync State
  syncStatus: 'idle',
  syncMessage: '',
  
  // App-First Mode State
  focusSection: 'app-selector',
  availableApps: [],
  appQuery: '',
  selectedAppIndex: 0,
  quickSearchQuery: '',
  
  selectedApp: null,
  query: '',
  filters: { context: null, category: null, tags: [] },
  results: [],
  selectedShortcut: null,

  setMode: (mode) => set({ mode, view: 'search' }),
  toggleMode: () => {
    const currentMode = get().mode;
    set({ mode: currentMode === 'app-first' ? 'full-phrase' : 'app-first', view: 'search' });
  },
  setView: (view) => set({ view }),
  setPlatform: (platform) => {
    savePlatform(platform);
    set({ platform });
  },
  toggleAI: () => set((state) => {
    // Only allow enabling AI if it's configured
    if (!state.aiEnabled && !isAIConfigured()) {
      // In TUI, we can't show a settings panel, so just keep it disabled
      // User needs to configure via config file or web interface
      return state;
    }
    return { aiEnabled: !state.aiEnabled };
  }),
  setInputMode: (isInputMode) => set({ isInputMode }),
  
  // App-First Mode Actions
  setFocusSection: (section) => set({ focusSection: section }),
  setAvailableApps: (apps) => set({ availableApps: apps }),
  setAppQuery: (query) => set({ appQuery: query, selectedAppIndex: 0 }),
  setSelectedAppIndex: (index) => set({ selectedAppIndex: index }),
  setQuickSearchQuery: (query) => set({ quickSearchQuery: query }),
  
  selectApp: (app) => set((state) => ({ 
    selectedApp: app, 
    view: app ? 'results' : 'search', 
    focusSection: app ? 'filters' : 'app-selector',
    // Clear filters when deselecting app OR when selecting a different app
    filters: (app && app.id === state.selectedApp?.id) ? state.filters : { context: null, category: null, tags: [] },
    // Clear quick search when changing apps
    quickSearchQuery: app ? state.quickSearchQuery : ''
  })),
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setResults: (results) => set({ results }),
  selectShortcut: (shortcut) => set({ selectedShortcut: shortcut, view: shortcut ? 'detail' : 'results' }),
  
  // Sync Actions
  setSyncStatus: (status, message = '') => set({ syncStatus: status, syncMessage: message }),
}));
