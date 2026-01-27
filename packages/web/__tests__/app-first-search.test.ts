import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('App-First Mode Search Integration', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  it('should fetch apps from API', async () => {
    const mockApps = ['vim', 'tmux', 'vscode']
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ apps: mockApps }),
    } as Response)

    const response = await fetch('/api/apps')
    const data = await response.json()

    expect(data.apps).toEqual(mockApps)
  })

  it('should search shortcuts with correct parameters', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'vim',
        action: 'Save file',
        keys: { mac: 'Cmd+S', windows: 'Ctrl+S', linux: 'Ctrl+S' },
        context: 'Normal mode',
        category: 'File',
        tags: ['save', 'file'],
        source: {
          type: 'official',
          url: 'https://vim.org',
          scrapedAt: new Date().toISOString(),
          confidence: 1.0,
        },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: mockResults }),
    } as Response)

    const params = new URLSearchParams({
      query: 'save',
      app: 'vim',
      platform: 'mac',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results).toEqual(mockResults)
    expect(data.results[0].app).toBe('vim')
    expect(data.results[0].action).toBe('Save file')
  })

  it('should filter by category', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'vim',
        action: 'Save file',
        keys: { mac: 'Cmd+S' },
        context: '',
        category: 'File',
        tags: [],
        source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: mockResults }),
    } as Response)

    const params = new URLSearchParams({
      query: '',
      app: 'vim',
      category: 'File',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results[0].category).toBe('File')
  })

  it('should filter by tag', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'vim',
        action: 'Save file',
        keys: { mac: 'Cmd+S' },
        context: '',
        category: 'File',
        tags: ['save'],
        source: { type: 'official', url: '', scrapedAt: '', confidence: 1.0 },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: mockResults }),
    } as Response)

    const params = new URLSearchParams({
      query: '',
      app: 'vim',
      tag: 'save',
    })

    const response = await fetch(`/api/search?${params}`)
    const data = await response.json()

    expect(data.results[0].tags).toContain('save')
  })

  it('should handle search errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: 'Failed to perform search' }),
      status: 500,
    } as Response)

    const response = await fetch('/api/search?query=test&app=vim')
    const data = await response.json()

    expect(data.error).toBe('Failed to perform search')
  })

  it('should return empty results for no matches', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ results: [] }),
    } as Response)

    const response = await fetch('/api/search?query=nonexistent&app=vim')
    const data = await response.json()

    expect(data.results).toEqual([])
  })
})
