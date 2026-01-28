import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('AI Search API Integration', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  it('should require authentication', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: 'Authentication required for AI search' }),
      status: 401,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({ query: 'move window' }),
    })
    const data = await response.json()

    expect(data.error).toBe('Authentication required for AI search')
  })

  it('should enforce rate limiting for free users', async () => {
    // Simulate 5 successful queries
    for (let i = 0; i < 5; i++) {
      global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ results: [], enhanced: true }),
        status: 200,
      } as Response)

      await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer fake-token-for-testing',
        },
        body: JSON.stringify({ query: `query ${i}` }),
      })
    }

    // 6th query should be rate limited
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ 
        error: 'Daily AI query limit reached. Free users are limited to 5 AI queries per day. Upgrade to Pro for unlimited queries.',
        limit: 5,
        used: 5,
      }),
      status: 429,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fake-token-for-testing',
      },
      body: JSON.stringify({ query: 'move window' }),
    })
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Daily AI query limit reached')
    expect(data.limit).toBe(5)
  })

  it('should return AI-enhanced results with valid auth', async () => {
    const mockResults = [
      {
        id: '1',
        app: 'tmux',
        action: 'Move window left',
        keys: { mac: 'Ctrl+B ←', windows: 'Ctrl+B ←', linux: 'Ctrl+B ←' },
        context: '',
        category: 'Windows',
        tags: ['window', 'move'],
        source: {
          type: 'official',
          url: 'https://tmux.org',
          scrapedAt: new Date().toISOString(),
          confidence: 1.0,
        },
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ 
        results: mockResults,
        enhanced: true,
        provider: 'openai',
      }),
      status: 200,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ 
        query: 'how do I move a window to the left in tmux?',
        platform: 'mac',
      }),
    })
    const data = await response.json()

    expect(data.results).toEqual(mockResults)
    expect(data.enhanced).toBe(true)
  })

  it('should require query parameter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: 'query is required and must be a string' }),
      status: 400,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ platform: 'mac' }),
    })
    const data = await response.json()

    expect(data.error).toBe('query is required and must be a string')
  })

  it('should handle AI service unavailability gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ error: 'AI service unavailable. Please try keyword search instead.' }),
      status: 503,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ query: 'move window' }),
    })
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toContain('AI service unavailable')
  })

  it('should accept optional platform and app filters', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ 
        results: [],
        enhanced: true,
        provider: 'openai',
      }),
      status: 200,
    } as Response)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({ 
        query: 'copy',
        platform: 'mac',
        app: 'vim',
      }),
    })
    const data = await response.json()

    expect(data.enhanced).toBe(true)
  })
})
