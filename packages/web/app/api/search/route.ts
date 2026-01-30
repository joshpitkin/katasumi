import { NextRequest, NextResponse } from 'next/server'
import { PostgresAdapter } from '@katasumi/core/dist/postgres-adapter'
import { KeywordSearchEngine } from '@katasumi/core/dist/keyword-search-engine'
import type { Platform } from '@katasumi/core/dist/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const app = searchParams.get('app') || undefined
    const platform = searchParams.get('platform') as Platform | undefined
    const context = searchParams.get('context') || undefined
    const category = searchParams.get('category') || undefined
    const tag = searchParams.get('tag') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    // Log search parameters for debugging
    console.log('[API /api/search] Request params:', { query, app, platform, context, category, tag, limit })

    // Initialize database adapter and search engine
    const dbUrl = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/katasumi'
    const adapter = new PostgresAdapter(dbUrl)
    const searchEngine = new KeywordSearchEngine(adapter)

    // Perform search
    const results = await searchEngine.fuzzySearch(
      query,
      {
        app,
        platform,
        category,
      },
      limit
    )

    console.log('[API /api/search] Search results count:', results.length)

    // Filter by context and tag if specified (not directly supported in fuzzySearch filters)
    let filteredResults = results
    if (context) {
      filteredResults = filteredResults.filter(shortcut =>
        shortcut.context?.toLowerCase().includes(context.toLowerCase())
      )
    }
    if (tag) {
      filteredResults = filteredResults.filter(shortcut =>
        shortcut.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      )
    }

    console.log('[API /api/search] Filtered results count:', filteredResults.length)

    // Log helpful message if no results found
    if (filteredResults.length === 0 && app) {
      console.warn(`[API /api/search] No shortcuts found for app: ${app}`)
    }

    return NextResponse.json({ results: filteredResults })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
