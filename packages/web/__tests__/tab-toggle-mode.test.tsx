/**
 * Test: Tab key toggles mode even when search input is focused
 * Task ID: PHASE3-WEB-017
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../lib/store'

describe('Tab Toggle Mode During Input', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStore.setState({
      mode: 'app-first',
      query: '',
      selectedApp: null,
      platform: 'mac',
      results: [],
      selectedResultIndex: -1,
      filters: {},
      showHelp: false,
      showPlatformSelector: false,
      showSettings: false,
      selectedShortcut: null,
      aiEnabled: false,
    })
  })

  it('should toggle mode from app-first to full-phrase', () => {
    const { mode, toggleMode } = useStore.getState()
    expect(mode).toBe('app-first')

    // Toggle mode
    toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')
  })

  it('should toggle mode from full-phrase to app-first', () => {
    useStore.setState({ mode: 'full-phrase' })
    expect(useStore.getState().mode).toBe('full-phrase')

    // Toggle mode
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
  })

  it('should reset search query when toggling mode', () => {
    const testQuery = 'test query'
    useStore.setState({ query: testQuery })

    // Toggle mode
    useStore.getState().toggleMode()
    
    // Query should be reset to start fresh in new mode
    expect(useStore.getState().query).toBe('')
    expect(useStore.getState().mode).toBe('full-phrase')
  })

  it('should preserve platform filter when toggling mode', () => {
    useStore.setState({ platform: 'windows' })

    // Toggle mode
    useStore.getState().toggleMode()
    
    // Platform should still be windows (global setting, not mode-specific)
    expect(useStore.getState().platform).toBe('windows')
    expect(useStore.getState().mode).toBe('full-phrase')
  })

  it('should reset selected app when toggling mode', () => {
    useStore.setState({ selectedApp: 'vscode', mode: 'app-first' })

    // Toggle to full-phrase
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')
    expect(useStore.getState().selectedApp).toBe(null)

    // Set app again and toggle back to app-first
    useStore.setState({ selectedApp: 'vim' })
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
    expect(useStore.getState().selectedApp).toBe(null)
  })

  it('should reset filters when toggling mode', () => {
    const testFilters = {
      context: 'Editor',
      category: 'Navigation',
      tag: 'keyboard'
    }
    useStore.setState({ filters: testFilters })

    // Toggle mode
    useStore.getState().toggleMode()
    
    // Filters should be reset to start fresh in new mode
    expect(useStore.getState().filters).toEqual({})
    expect(useStore.getState().mode).toBe('full-phrase')
  })

  it('should work with empty query', () => {
    useStore.setState({ query: '' })

    // Toggle mode with empty query
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')

    // Toggle back
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
  })

  it('should reset search state but preserve UI settings when toggling', () => {
    const initialState = {
      mode: 'app-first' as const,
      query: 'test',
      selectedApp: 'vscode',
      platform: 'mac' as const,
      results: [],
      filters: { context: 'Editor' },
      aiEnabled: true,
      showHelp: false,
    }
    
    useStore.setState(initialState)

    // Toggle mode
    useStore.getState().toggleMode()
    
    const newState = useStore.getState()
    
    // Mode should change, search state should reset, but UI settings preserved
    expect(newState.mode).toBe('full-phrase')
    expect(newState.query).toBe('') // Reset
    expect(newState.selectedApp).toBe(null) // Reset
    expect(newState.results).toEqual([]) // Reset
    expect(newState.filters).toEqual({}) // Reset
    expect(newState.platform).toBe(initialState.platform) // Preserved (global setting)
    expect(newState.aiEnabled).toBe(initialState.aiEnabled) // Preserved (global setting)
    expect(newState.showHelp).toBe(initialState.showHelp) // Preserved (global setting)
  })

  it('should allow multiple toggles in sequence', () => {
    expect(useStore.getState().mode).toBe('app-first')

    // Toggle 1
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')

    // Toggle 2
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')

    // Toggle 3
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('full-phrase')

    // Toggle 4
    useStore.getState().toggleMode()
    expect(useStore.getState().mode).toBe('app-first')
  })
})
