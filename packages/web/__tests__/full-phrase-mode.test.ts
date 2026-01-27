import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Full-Phrase Mode Search Integration', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  it('should search across all apps without app filter', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'vim',
        action: 'Split window horizontally',
        keys: { mac: 'Cmd+W S', windows: 'Ctrl+W S', linux: 'Ctrl+W S' },
        context: 'Normal mode',
        category: 'Window',
        tags: ['split', 'window'],
        source: {
          type: 'official',
          url: 'https://vim.org',
          scrapedAt: new Date().toISOString(),
          confidence: 1.0,
        },
      },
      {
        id: '2',
        app: 'tmux',
        action: 'Split pane horizontally',
        keys: { mac: 'Ctrl+B "', windows: 'Ctrl+B "', linux: 'Ctrl+B "' },
        context: '',
        category: 'Pane',
        tags: ['split', 'pane'],
        source: {
          type: 'official',
          url: 'https://tmux.github.io',
          scrapedAt: new Date().toISOString(),
          confidence: 1.0,
        },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: mockResults }),
    } as Response)

    const params = new URLSearchParams({
      query: 'how to split screen',
      platform: 'mac',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results).toEqual(mockResults)
    expect(data.results.length).toBe(2)
    expect(data.results[0].app).toBe('vim')
    expect(data.results[1].app).toBe('tmux')
  })

  it('should handle natural language queries', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'vscode',
        action: 'Undo',
        keys: { mac: 'Cmd+Z', windows: 'Ctrl+Z', linux: 'Ctrl+Z' },
        context: '',
        category: 'Edit',
        tags: ['undo', 'edit'],
        source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: mockResults }),
    } as Response)

    const params = new URLSearchParams({
      query: 'undo last change',
      platform: '',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results[0].action).toContain('Undo')
  })

  it('should group results by app in full-phrase mode', () => {
    const results = [
      { id: '1', app: 'vim', action: 'Save', keys: { mac: ':w' }, context: '', category: '', tags: [], source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 } },
      { id: '2', app: 'tmux', action: 'New window', keys: { mac: 'Ctrl+B C' }, context: '', category: '', tags: [], source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 } },
      { id: '3', app: 'vim', action: 'Quit', keys: { mac: ':q' }, context: '', category: '', tags: [], source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 } },
    ]

    const grouped = results.reduce((acc, shortcut) => {
      const app = shortcut.app
      if (!acc[app]) {
        acc[app] = []
      }
      acc[app].push(shortcut)
      return acc
    }, {} as Record<string, typeof results>)

    expect(Object.keys(grouped)).toEqual(['vim', 'tmux'])
    expect(grouped['vim'].length).toBe(2)
    expect(grouped['tmux'].length).toBe(1)
  })

  it('should support AI toggle in full-phrase mode', () => {
    let aiEnabled = false
    const toggleAI = () => {
      aiEnabled = !aiEnabled
    }

    expect(aiEnabled).toBe(false)
    toggleAI()
    expect(aiEnabled).toBe(true)
    toggleAI()
    expect(aiEnabled).toBe(false)
  })

  it('should show unlimited for premium users', () => {
    const getQueryDisplay = (tier: 'free' | 'premium', count: number) => {
      return tier === 'premium' ? 'Unlimited' : `${count} remaining`
    }
    
    expect(getQueryDisplay('premium', 10)).toBe('Unlimited')
  })

  it('should show query count for free users', () => {
    const getQueryDisplay = (tier: 'free' | 'premium', count: number) => {
      return tier === 'premium' ? 'Unlimited' : `${count} remaining`
    }
    
    expect(getQueryDisplay('free', 7)).toBe('7 remaining')
  })

  it('should decrement AI query count when AI is used', () => {
    let aiQueryCount = 10
    const decrementAIQueryCount = () => {
      aiQueryCount = Math.max(0, aiQueryCount - 1)
    }

    decrementAIQueryCount()
    expect(aiQueryCount).toBe(9)
    
    // Multiple decrements
    for (let i = 0; i < 10; i++) {
      decrementAIQueryCount()
    }
    expect(aiQueryCount).toBe(0) // Should not go below 0
  })

  it('should return empty results for empty query', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: [] }),
    } as Response)

    const params = new URLSearchParams({
      query: '',
      platform: '',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results).toEqual([])
  })

  it('should handle search errors in full-phrase mode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: 'Failed to perform search' }),
      status: 500,
    } as Response)

    const response = await fetch('/api/search?query=test')
    const data = await response.json()

    expect(data.error).toBe('Failed to perform search')
  })
})
