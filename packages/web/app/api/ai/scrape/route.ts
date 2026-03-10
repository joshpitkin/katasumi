import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, isTokenInvalidated } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface ScrapedShortcut {
  action: string;
  keys: {
    mac?: string;
    windows?: string;
    linux?: string;
  };
  context?: string;
  category?: string;
  tags: string[];
  confidence: number;
}

interface ScrapeResponse {
  app: {
    name: string;
    displayName: string;
    category?: string;
  };
  shortcuts: ScrapedShortcut[];
  sourceUrl: string;
  scrapedAt: string;
}

interface SearchResult {
  title: string;
  url: string;
}

/**
 * POST /api/ai/scrape
 * Use AI to search the web for keyboard shortcuts for an app
 * Rate limited to 5 scrapes per day for free users
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required for AI scraping' },
        { status: 401 }
      );
    }
    
    if (isTokenInvalidated(token)) {
      return NextResponse.json(
        { error: 'Token has been invalidated' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get user to check tier
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check rate limit for free users
    if (user.tier === 'free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const usageCount = await prisma.aiUsage.count({
        where: {
          userId: payload.userId,
          timestamp: {
            gte: today,
          },
        },
      });
      
      if (usageCount >= 5) {
        return NextResponse.json(
          { 
            error: 'Daily AI scrape limit reached. Free users are limited to 5 AI scrapes per day. Upgrade to Pro for unlimited scrapes.',
            limit: 5,
            used: usageCount,
          },
          { status: 429 }
        );
      }
    }
    
    // Parse request body
    const body = await request.json();
    const { appName, context, provider, apiKey, model, baseUrl } = body;
    
    if (!appName || typeof appName !== 'string') {
      return NextResponse.json(
        { error: 'appName is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Validate app name (basic sanitation)
    const cleanAppName = appName.trim();
    if (cleanAppName.length === 0 || cleanAppName.length > 100) {
      return NextResponse.json(
        { error: 'appName must be between 1 and 100 characters' },
        { status: 400 }
      );
    }
    
    // Determine AI credentials: prefer user-provided key, then builtin (premium), then error
    const isPremium =
      (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'enterprise') &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());
    const userAiKeyMode = user.aiKeyMode || 'personal';

    let resolvedProvider: 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    let resolvedApiKey: string;
    let resolvedModel: string | undefined;
    let resolvedBaseUrl: string | undefined;

    if (provider) {
      // User supplied their own credentials
      if (provider !== 'ollama' && !apiKey) {
        return NextResponse.json(
          { error: 'AI API key is required for this provider' },
          { status: 400 }
        );
      }
      resolvedProvider = provider as 'openai' | 'anthropic' | 'openrouter' | 'ollama';
      resolvedApiKey = apiKey || '';
      resolvedModel = model;
      resolvedBaseUrl = baseUrl;
    } else if (isPremium && userAiKeyMode === 'builtin') {
      // Premium builtin user — use server-side credentials
      resolvedProvider = (process.env.AI_PROVIDER || 'openrouter') as 'openai' | 'anthropic' | 'openrouter' | 'ollama';
      resolvedApiKey = process.env.OPENROUTER_API_KEY || '';
      resolvedModel = process.env.AI_MODEL || 'openai/gpt-4o-mini';
      resolvedBaseUrl = process.env.AI_BASE_URL;
    } else {
      return NextResponse.json(
        {
          error: 'AI provider is required in request body',
          message: isPremium
            ? 'Enable "Use Built-in AI" in settings or provide your own API key.'
            : 'Free tier requires you to provide your own AI API key.',
        },
        { status: 400 }
      );
    }

    // Call AI to scrape web for shortcuts
    const scrapeResult = await scrapeShortcutsWithAI(cleanAppName, context, {
      provider: resolvedProvider,
      apiKey: resolvedApiKey,
      model: resolvedModel,
      baseUrl: resolvedBaseUrl,
      timeout: 60000,
    });
    
    // Log AI usage for rate limiting
    await prisma.aiUsage.create({
      data: {
        userId: payload.userId,
        query: `scrape:${cleanAppName}`,
      },
    });
    
    return NextResponse.json(scrapeResult);
  } catch (error) {
    console.error('AI scraping error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('API key') || errorMessage.includes('provider')) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    if (errorMessage.includes('No shortcuts found')) {
      return NextResponse.json(
        { error: `Could not find keyboard shortcuts for "${errorMessage.split('"')[1] || 'this app'}". Try a different app name or check the official documentation.` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to scrape shortcuts. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Use AI to search the web and extract keyboard shortcuts
 */
async function scrapeShortcutsWithAI(
  appName: string,
  context: string | undefined,
  config: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    apiKey: string;
    model?: string;
    baseUrl?: string;
    timeout: number;
  }
): Promise<ScrapeResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);
  
  try {
    const startTime = Date.now();
    
    // Step 1: Search the web for documentation
    console.log(`[AI Scrape] Searching web for "${appName}" keyboard shortcuts...`);
    const searchStartTime = Date.now();
    const searchResults = await searchWeb(appName, controller.signal);
    console.log(`[AI Scrape] Search completed in ${Date.now() - searchStartTime}ms`);
    
    // Step 2: Fetch and scrape top results
    console.log(`[AI Scrape] Found ${searchResults.length} results, fetching content...`);
    const fetchStartTime = Date.now();
    const scrapedContent = await Promise.all(
      searchResults.slice(0, 3).map(result => 
        fetchPageContent(result.url, controller.signal).catch(err => {
          console.warn(`[AI Scrape] Failed to fetch ${result.url}:`, err.message);
          return { url: result.url, title: result.title, content: '' };
        })
      )
    );
    console.log(`[AI Scrape] Content fetching completed in ${Date.now() - fetchStartTime}ms`);
    
    // Filter out failed fetches
    const validContent = scrapedContent.filter(c => c.content.length > 0);
    
    if (validContent.length === 0) {
      throw new Error(`Could not fetch any documentation for "${appName}". Please try a different app name.`);
    }
    
    console.log(`[AI Scrape] Successfully fetched ${validContent.length} pages, calling AI...`);
    
    // Step 3: Build prompt with scraped content
    const promptStartTime = Date.now();
    const prompt = buildScrapePrompt(appName, context, validContent);
    console.log(`[AI Scrape] Prompt built in ${Date.now() - promptStartTime}ms, length: ${prompt.length} chars`);
    console.log(`[AI Scrape] Total content size: ${validContent.reduce((sum, c) => sum + c.content.length, 0)} chars`);
    
    const aiStartTime = Date.now();
    console.log(`[AI Scrape] Starting AI call at ${new Date().toISOString()}...`);
    const response = await callAIProvider(prompt, config, controller.signal);
    console.log(`[AI Scrape] AI call completed in ${Date.now() - aiStartTime}ms`);
    console.log(`[AI Scrape] Response length: ${response.length} chars`);
    
    // Parse and validate response
    const result = parseAIResponse(response);
    
    if (!result.shortcuts || result.shortcuts.length === 0) {
      throw new Error(`No shortcuts found for "${appName}"`);
    }
    
    return {
      app: result.app || {
        name: appName.toLowerCase().replace(/\s+/g, '-'),
        displayName: appName,
        category: result.category,
      },
      shortcuts: result.shortcuts,
      sourceUrl: validContent[0]?.url || searchResults[0]?.url || `https://www.google.com/search?q=${encodeURIComponent(appName + ' keyboard shortcuts')}`,
      scrapedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Search the web for keyboard shortcut documentation
 */
async function searchWeb(appName: string, signal: AbortSignal): Promise<SearchResult[]> {
  const query = `${appName} keyboard shortcuts documentation`;

  try {
    console.log(`[Search] Query: "${query}"`);

    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    const serperApiKey = process.env.SERPER_API_KEY;

    if (braveApiKey) {
      try {
        const braveResults = await searchWebWithBrave(query, braveApiKey, signal);
        if (braveResults.length > 0) {
          console.log(`[Search] Using Brave results (${braveResults.length})`);
          return braveResults;
        }
        console.warn('[Search] Brave returned no results, trying Serper...');
      } catch (error) {
        console.warn('[Search] Brave failed, trying Serper:', error);
      }
    } else {
      console.warn('[Search] BRAVE_SEARCH_API_KEY not set, skipping Brave');
    }

    if (serperApiKey) {
      try {
        const serperResults = await searchWebWithSerper(query, serperApiKey, signal);
        if (serperResults.length > 0) {
          console.log(`[Search] Using Serper results (${serperResults.length})`);
          return serperResults;
        }
        console.warn('[Search] Serper returned no results, using fallback links');
      } catch (error) {
        console.warn('[Search] Serper failed, using fallback links:', error);
      }
    } else {
      console.warn('[Search] SERPER_API_KEY not set, skipping Serper');
    }
  } catch (error) {
    console.error('[Search] Error:', error);
  }

  // Final fallback when API keys are missing or providers fail.
  const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const domainToken = appName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const fallbackResults: SearchResult[] = [
    { title: `${appName} Keyboard Shortcuts (Google Search)`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
    { title: `${appName} Keyboard Shortcuts (Brave Search)`, url: `https://search.brave.com/search?q=${encodeURIComponent(query)}` },
  ];

  if (slug) {
    fallbackResults.push({ title: `${appName} Docs`, url: `https://docs.${slug}.com` });
  }

  if (domainToken) {
    fallbackResults.push({ title: `${appName} Website`, url: `https://www.${domainToken}.com` });
  }

  console.log('[Search] Using fallback URL patterns');
  return fallbackResults;
}

async function searchWebWithBrave(query: string, apiKey: string, signal: AbortSignal): Promise<SearchResult[]> {
  const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en&country=us&safesearch=moderate`;
  console.log(`[Search:Brave] URL: ${searchUrl}`);

  const response = await fetch(searchUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Katasumi/1.0; +https://katasumi.dev)',
      'X-Subscription-Token': apiKey,
    },
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Brave search failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const items = Array.isArray(data?.web?.results) ? data.web.results : [];
  const results = items
    .map((item: any) => ({
      title: typeof item.title === 'string' ? item.title : item.url,
      url: typeof item.url === 'string' ? item.url : '',
    }))
    .filter((item: SearchResult) => item.url.startsWith('http'))
    .slice(0, 5);

  console.log(`[Search:Brave] Results: ${results.length}`);
  return results;
}

async function searchWebWithSerper(
  query: string,
  apiKey: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const searchUrl = 'https://google.serper.dev/search';
  console.log(`[Search:Serper] URL: ${searchUrl}`);

  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Katasumi/1.0; +https://katasumi.dev)',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: 5,
      gl: 'us',
      hl: 'en',
      safe: 'active',
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Serper search failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const items = Array.isArray(data?.organic) ? data.organic : [];
  const results = items
    .map((item: any) => ({
      title: typeof item.title === 'string' ? item.title : item.link,
      url: typeof item.link === 'string' ? item.link : '',
    }))
    .filter((item: SearchResult) => item.url.startsWith('http'))
    .slice(0, 5);

  console.log(`[Search:Serper] Results: ${results.length}`);
  return results;
}

/**
 * Fetch and extract text content from a web page
 */
async function fetchPageContent(
  url: string, 
  signal: AbortSignal
): Promise<{ url: string; title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Katasumi/1.0; +https://katasumi.dev)',
      },
      signal,
      // Timeout for individual page fetches
      ...({ signal: AbortSignal.timeout(5000) } as any),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML text extraction (remove scripts, styles, tags)
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    
    // Limit content length
    if (text.length > 8000) {
      text = text.substring(0, 8000) + '...';
    }
    
    console.log(`[Fetch] ${url} - ${text.length} chars`);
    
    return { url, title, content: text };
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build prompt for AI to scrape shortcuts with web content
 */
function buildScrapePrompt(
  appName: string, 
  context: string | undefined,
  scrapedContent: Array<{ url: string; title: string; content: string }>
): string {
  const contentSection = scrapedContent.map((page, i) => 
    `## Source ${i + 1}: ${page.title}\nURL: ${page.url}\n\n${page.content}\n\n---\n`
  ).join('\n');
  
  return `You are a keyboard shortcut expert. I have searched the web for keyboard shortcuts for "${appName}"${context ? ` (context: ${context})` : ''} and found the following documentation:

${contentSection}

Extract keyboard shortcuts from the documentation above. For each shortcut, provide:
1. action: What the shortcut does (e.g., "Copy", "Paste", "Save file")
2. keys: Keyboard combination for different platforms (mac, windows, linux)
3. context: Where the shortcut applies (e.g., "Normal Mode", "Editor", optional)
4. category: Group shortcuts by category (e.g., "Editing", "Navigation", "File Management")
5. tags: Array of searchable keywords
6. confidence: Your confidence level (0.0 to 1.0) that this is accurate

Return ONLY a valid JSON object in this exact format:
{
  "app": {
    "name": "${appName.toLowerCase().replace(/\s+/g, '-')}",
    "displayName": "${appName}",
    "category": "Category like Text Editor, Terminal, Browser, IDE, etc."
  },
  "shortcuts": [
    {
      "action": "Description of action",
      "keys": {
        "mac": "Cmd+C",
        "windows": "Ctrl+C",
        "linux": "Ctrl+C"
      },
      "context": "Optional context",
      "category": "Category name",
      "tags": ["tag1", "tag2"],
      "confidence": 0.95
    }
  ],
  "sourceUrl": "URL of official documentation or source",
  "category": "Application category"
}

IMPORTANT:
- Only include shortcuts you are highly confident about (confidence >= 0.7)
- Use standard key notation: Cmd/Ctrl/Alt/Shift + letter/symbol
- If a shortcut is the same across platforms, include it for all platforms
- If you don't know a platform's shortcut, omit that platform from keys
- Provide at least 10-20 common shortcuts if available
- Focus on the most useful and commonly used shortcuts
- If you cannot find any shortcuts for this application, return an error in the "error" field

Return ONLY valid JSON, no markdown formatting or explanations.`;
}

/**
 * Call AI provider
 */
async function callAIProvider(
  prompt: string,
  config: {
    provider: 'openai' | 'anthropic' | 'openrouter' | 'ollama';
    apiKey: string;
    model?: string;
    baseUrl?: string;
  },
  signal: AbortSignal
): Promise<string> {
  switch (config.provider) {
    case 'openai':
      return await callOpenAI(prompt, config, signal);
    case 'anthropic':
      return await callAnthropic(prompt, config, signal);
    case 'openrouter':
      return await callOpenRouter(prompt, config, signal);
    case 'ollama':
      return await callOllama(prompt, config, signal);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

async function callOpenAI(
  prompt: string,
  config: { apiKey: string; model?: string; baseUrl?: string },
  signal: AbortSignal
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4-turbo';
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that knows about keyboard shortcuts for various applications. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    signal,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(
  prompt: string,
  config: { apiKey: string; model?: string; baseUrl?: string },
  signal: AbortSignal
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  const model = config.model || 'claude-3-sonnet-20240229';
  
  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
    signal,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callOpenRouter(
  prompt: string,
  config: { apiKey: string; model?: string; baseUrl?: string },
  signal: AbortSignal
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  const model = config.model || 'openai/gpt-4-turbo';
  const requestStartTime = Date.now();
  
  console.log(`[OpenRouter] Starting API call at ${new Date().toISOString()}`);
  console.log(`[OpenRouter] Model: ${model}`);
  console.log(`[OpenRouter] Base URL: ${baseUrl}`);
  console.log(`[OpenRouter] Prompt length: ${prompt.length} chars`);
  console.log(`[OpenRouter] API key prefix: ${config.apiKey.substring(0, 10)}...`);
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that knows about keyboard shortcuts for various applications. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  };
  
  console.log(`[OpenRouter] Request body: ${JSON.stringify(requestBody).substring(0, 200)}...`);
  console.log(`[OpenRouter] Sending request...`);
  
  try {
    const fetchStartTime = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': 'https://katasumi.dev',
        'X-Title': 'Katasumi',
      },
      body: JSON.stringify(requestBody),
      signal,
    });
    
    console.log(`[OpenRouter] Received response in ${Date.now() - fetchStartTime}ms`);
    console.log(`[OpenRouter] Response status: ${response.status} ${response.statusText}`);
    console.log(`[OpenRouter] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] Error response body:`, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(`OpenRouter API error: ${response.status} ${errorData.error?.message || errorData.message || response.statusText}`);
    }
    
    const parseStartTime = Date.now();
    const data = await response.json();
    console.log(`[OpenRouter] JSON parsed in ${Date.now() - parseStartTime}ms`);
    console.log(`[OpenRouter] Response data keys:`, Object.keys(data));
    console.log(`[OpenRouter] Choices count:`, data.choices?.length);
    
    const content = data.choices[0]?.message?.content || '';
    console.log(`[OpenRouter] Content length: ${content.length} chars`);
    console.log(`[OpenRouter] Total request time: ${Date.now() - requestStartTime}ms`);
    
    if (data.usage) {
      console.log(`[OpenRouter] Token usage:`, data.usage);
    }
    
    return content;
  } catch (error) {
    console.error(`[OpenRouter] Request failed after ${Date.now() - requestStartTime}ms:`, error);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[OpenRouter] Request was aborted (timeout)`);
    }
    throw error;
  }
}

async function callOllama(
  prompt: string,
  config: { model?: string; baseUrl?: string },
  signal: AbortSignal
): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  const model = config.model || 'llama2';
  
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
    signal,
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.response || '';
}

/**
 * Parse AI response and validate structure
 */
function parseAIResponse(content: string): any {
  // Try to extract JSON from the response (in case AI adds markdown formatting)
  let jsonStr = content.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    if (!parsed.shortcuts || !Array.isArray(parsed.shortcuts)) {
      throw new Error('Invalid response: missing shortcuts array');
    }
    
    // Validate each shortcut
    parsed.shortcuts = parsed.shortcuts.filter((s: any) => {
      return s.action && s.keys && typeof s.action === 'string';
    });
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error(`Failed to parse AI response: ${error}`);
  }
}
