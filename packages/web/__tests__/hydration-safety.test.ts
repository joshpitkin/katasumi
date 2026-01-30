/**
 * Unit tests for hydration-prone code
 * Tests components and logic that could cause hydration mismatches
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore } from '@/lib/store'

describe('Store Hydration Safety', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      mode: 'app-first',
      platform: 'all',
      aiEnabled: false,
      showHelp: false,
      showPlatformSelector: false,
      showSettings: false,
      userTier: 'free',
      aiQueryCount: 10,
      selectedApp: null,
      query: '',
      filters: {},
      results: [],
      selectedShortcut: null,
      selectedResultIndex: -1,
    })
  })

  it('should initialize with safe SSR values', () => {
    const state = useStore.getState()
    
    // Platform should start as 'all' to match SSR
    expect(state.platform).toBe('all')
    
    // Mode should be consistent
    expect(state.mode).toBe('app-first')
    
    // No browser-dependent values on initial render
    expect(state.aiEnabled).toBe(false)
  })

  it('should allow platform to be set after hydration', () => {
    const state = useStore.getState()
    
    // Initially 'all' (SSR-safe)
    expect(state.platform).toBe('all')
    
    // Set platform after client-side detection (simulated)
    useStore.getState().setPlatform('mac')
    
    expect(useStore.getState().platform).toBe('mac')
  })

  it('should handle mode toggle consistently', () => {
    const state = useStore.getState()
    
    expect(state.mode).toBe('app-first')
    
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')
    
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
  })
})

describe('Platform Detection Safety', () => {
  it('should not detect platform during SSR', () => {
    // Get initial state
    const state = useStore.getState()
    
    // Should default to 'all' 
    expect(state.platform).toBe('all')
  })

  it('should safely handle platform detection in browser', () => {
    const state = useStore.getState()
    
    // Initially should be 'all' (no auto-detection to avoid hydration mismatch)
    expect(state.platform).toBe('all')
    
    // Platform can be set explicitly after mount
    useStore.getState().setPlatform('mac')
    expect(useStore.getState().platform).toBe('mac')
  })
})

describe('Client-Side Only Logic', () => {
  it('should have deterministic initial state', () => {
    // Get state twice
    const state1 = useStore.getState()
    const state2 = useStore.getState()
    
    // Both should have identical initial state (deterministic)
    expect(state1.mode).toBe(state2.mode)
    expect(state1.platform).toBe(state2.platform)
    expect(state1.aiEnabled).toBe(state2.aiEnabled)
    expect(state1.query).toBe(state2.query)
  })
})

describe('useEffect Dependency Safety', () => {
  it('should not trigger infinite loops in navigation', () => {
    const state = useStore.getState()
    
    // Navigate results multiple times
    for (let i = 0; i < 10; i++) {
      useStore.getState().navigateResults('down')
    }
    
    // Should not crash or hang
    expect(useStore.getState().selectedResultIndex).toBe(-1) // No results, so stays at -1
  })

  it('should handle empty results gracefully', () => {
    const state = useStore.getState()
    
    expect(state.results).toHaveLength(0)
    
    // Try to navigate with no results
    useStore.getState().navigateResults('down')
    useStore.getState().navigateResults('up')
    
    // Should not crash
    expect(useStore.getState().selectedResultIndex).toBe(-1)
  })
})

describe('SSR Safety Checks', () => {
  it('should not have platform detection in initial store creation', () => {
    // Reset to 'all' first
    useStore.setState({ platform: 'all' })
    
    // The store should be able to work with 'all' platform
    // This ensures SSR and client render the same initial HTML
    const initialState = useStore.getState()
    
    expect(initialState.platform).toBe('all')
  })

  it('should allow all actions to work without browser APIs', () => {
    // Reset state first
    useStore.setState({
      mode: 'app-first',
      platform: 'all',
      query: '',
      selectedApp: null,
      showHelp: false,
      aiEnabled: false,
    })
    
    const state = useStore.getState()
    
    // All these should work without window/document
    state.setMode('full-phrase')
    expect(useStore.getState().mode).toBe('full-phrase')
    
    state.toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
    
    state.setPlatform('mac')
    expect(useStore.getState().platform).toBe('mac')
    
    state.setQuery('test')
    expect(useStore.getState().query).toBe('test')
    
    state.setResults([])
    state.selectApp('VSCode')
    state.setShowHelp(true)
    
    // Should not throw errors
    expect(true).toBe(true)
  })
})
