import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AppInfo } from '@katasumi/core';
import { SourceType } from '@katasumi/core';
import { useAppStore } from '../store.js';
import { debugLog } from '../utils/debug-logger.js';
import { loadConfig, isAIConfigured } from '../utils/config.js';
import { getDbAdapter } from '../utils/db-adapter.js';
import { logError } from '../utils/error-logger.js';

const API_BASE_URL = process.env.KATASUMI_API_URL || 'https://www.katasumi.dev';

interface ScrapedShortcut {
  action: string;
  keys: { mac?: string; windows?: string; linux?: string };
  context?: string;
  category?: string;
  tags: string[];
  confidence: number;
}

interface ScrapeData {
  app: { name: string; displayName: string; category?: string };
  shortcuts: ScrapedShortcut[];
  sourceUrl: string;
  scrapedAt: string;
}

interface AppSelectorProps {
  apps: AppInfo[];
  query: string;
  selectedIndex: number;
  onSelectApp: (app: AppInfo) => void;
  onQueryChange: (query: string) => void;
  onIndexChange: (index: number) => void;
  maxVisibleApps?: number;
}

// Simple fuzzy match function
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

export function AppSelector({
  apps,
  query,
  selectedIndex,
  onSelectApp,
  onQueryChange,
  onIndexChange,
  maxVisibleApps = 10,
}: AppSelectorProps) {
  const focusSection = useAppStore((state) => state.focusSection);
  const isInputMode = useAppStore((state) => state.isInputMode);
  const setInputMode = useAppStore((state) => state.setInputMode);
  const setAvailableApps = useAppStore((state) => state.setAvailableApps);
  const isFocused = focusSection === 'app-selector';

  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Check conditions for showing AI scrape option
  const canScrape = !!loadConfig().token && isAIConfigured();

  const performScrape = async () => {
    if (isScraping) return;
    const config = loadConfig();

    if (!config.token) {
      setScrapeError('Login required. Run "katasumi login" to authenticate.');
      return;
    }

    if (!isAIConfigured()) {
      setScrapeError('AI not configured. Set up AI in the web app settings or config file.');
      return;
    }

    // Build request payload — for builtin (premium) users the server uses its own key
    const requestBody: Record<string, unknown> = { appName: query.trim() };
    if (config.aiKeyMode !== 'builtin' && config.ai) {
      requestBody.provider = config.ai.provider;
      if (config.ai.provider !== 'ollama') requestBody.apiKey = config.ai.apiKey;
      if (config.ai.model) requestBody.model = config.ai.model;
      if (config.ai.baseUrl) requestBody.baseUrl = config.ai.baseUrl;
    }

    setIsScraping(true);
    setScrapeError(null);
    setScrapeStatus('Searching the web for shortcuts...');

    try {
      // Step 1: Scrape via web API (same endpoint as web app)
      const scrapeResponse = await fetch(`${API_BASE_URL}/api/ai/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Scrape failed');
      }

      const scrapeData = await scrapeResponse.json() as ScrapeData;
      setScrapeStatus(`Found ${scrapeData.shortcuts.length} shortcuts. Saving to local database...`);

      // Step 2: Save directly to local SQLite
      const adapter = getDbAdapter();
      let savedCount = 0;
      for (let i = 0; i < scrapeData.shortcuts.length; i++) {
        const s = scrapeData.shortcuts[i];
        try {
          await adapter.upsertShortcut({
            // Generate a stable local ID from app + index
            id: `ai-scraped-${scrapeData.app.name}-${i}`,
            app: scrapeData.app.name,
            action: s.action,
            keys: {
              mac: s.keys.mac,
              windows: s.keys.windows,
              linux: s.keys.linux,
            },
            context: s.context,
            category: s.category || scrapeData.app.category,
            tags: s.tags || [],
            source: {
              type: SourceType.AI_SCRAPED,
              url: scrapeData.sourceUrl,
              scrapedAt: new Date(scrapeData.scrapedAt),
              confidence: s.confidence ?? 0.8,
            },
          });
          savedCount++;
        } catch (upsertErr) {
          logError(`Failed to save shortcut ${i} for ${scrapeData.app.name}`, upsertErr);
        }
      }

      // Step 3: Also push to postgres for users who have web sync (best-effort, fire-and-forget)
      if (config.token) {
        Promise.all(
          scrapeData.shortcuts.map((s, i) =>
            fetch(`${API_BASE_URL}/api/shortcuts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.token!}`,
              },
              body: JSON.stringify({
                app: scrapeData.app.name,
                action: s.action,
                keysMac: s.keys.mac,
                keysWindows: s.keys.windows,
                keysLinux: s.keys.linux,
                context: s.context,
                category: s.category || scrapeData.app.category,
                tags: Array.isArray(s.tags) ? s.tags.join(',') : '',
                sourceType: 'ai-scraped',
                sourceUrl: scrapeData.sourceUrl,
                sourceScrapedAt: scrapeData.scrapedAt,
                sourceConfidence: s.confidence,
              }),
            }).catch(() => { /* best-effort */ })
          )
        ).catch(() => { /* best-effort */ });
      }

      // Step 4: Reload apps list from local DB
      const updatedApps = await adapter.getApps();
      setAvailableApps(updatedApps);

      setScrapeStatus(`✓ Added ${savedCount} shortcuts for ${scrapeData.app.displayName}. Press Enter to open.`);

      // Auto-select the newly added app after a short pause
      setTimeout(() => {
        const newApp = updatedApps.find((a: AppInfo) => a.name === scrapeData.app.name);
        if (newApp) onSelectApp(newApp);
      }, 1500);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scrape failed';
      setScrapeError(msg);
      logError('AI scrape failed in TUI', err);
    } finally {
      setIsScraping(false);
    }
  };

  // Initialize input mode when component first becomes focused (not when already focused)
  useEffect(() => {
    if (isFocused) {
      setInputMode(true);
    }
  }, [isFocused, setInputMode]);

  // Filter apps with fuzzy matching
  const filteredApps = apps.filter((app) =>
    fuzzyMatch(app.displayName, query) || fuzzyMatch(app.name, query)
  );

  const effectiveMaxVisible = Math.min(maxVisibleApps, filteredApps.length);
  const halfPage = Math.floor(effectiveMaxVisible / 2);
  const fullPage = effectiveMaxVisible;

  useInput(
    (input, key) => {
      if (!isFocused) return;

      // ESC: Exit input mode to allow global hotkeys
      if (key.escape) {
        setInputMode(false);
        return;
      }
      
      // /: Re-enter input mode
      if (!isInputMode && input === '/') {
        setInputMode(true);
        return;
      }

      // Only handle input commands when in input mode
      if (!isInputMode) {
        // Allow navigation even when not in input mode
        if (key.upArrow || input === 'k') {
          onIndexChange(Math.max(0, selectedIndex - 1));
        } else if (key.downArrow || input === 'j') {
          onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + 1));
        } else if (key.ctrl && input === 'u') {
          // Ctrl+U: Scroll up half page
          onIndexChange(Math.max(0, selectedIndex - halfPage));
        } else if (key.ctrl && input === 'd') {
          // Ctrl+D: Scroll down half page
          onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + halfPage));
        } else if (key.ctrl && input === 'b') {
          // Ctrl+B: Scroll up full page
          onIndexChange(Math.max(0, selectedIndex - fullPage));
        } else if (key.ctrl && input === 'f') {
          // Ctrl+F: Scroll down full page
          onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + fullPage));
        } else if (key.return && filteredApps[selectedIndex]) {
          onSelectApp(filteredApps[selectedIndex]);
        } else if (key.return && filteredApps.length === 0 && query.trim() && canScrape && !isScraping) {
          performScrape();
        }
        return;
      }

      if (key.return) {
        // Select app on Enter, or trigger AI scrape if no apps match
        if (filteredApps[selectedIndex]) {
          onSelectApp(filteredApps[selectedIndex]);
        } else if (filteredApps.length === 0 && query.trim() && canScrape && !isScraping) {
          performScrape();
        }
      } else if (key.upArrow) {
        // Navigate up
        onIndexChange(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        // Navigate down
        onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + 1));
      } else if (key.ctrl && input === 'u') {
        // Ctrl+U: Scroll up half page
        onIndexChange(Math.max(0, selectedIndex - halfPage));
      } else if (key.ctrl && input === 'd') {
        // Ctrl+D: Scroll down half page
        onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + halfPage));
      } else if (key.ctrl && input === 'b') {
        // Ctrl+B: Scroll up full page
        onIndexChange(Math.max(0, selectedIndex - fullPage));
      } else if (key.ctrl && input === 'f') {
        // Ctrl+F: Scroll down full page
        onIndexChange(Math.min(filteredApps.length - 1, selectedIndex + fullPage));
      } else if (key.backspace || key.delete) {
        // Handle backspace
        onQueryChange(query.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        // Add character to query
        onQueryChange(query + input);
      }
    },
    { isActive: isFocused }
  );

  // Auto-adjust selected index when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredApps.length && filteredApps.length > 0) {
      onIndexChange(filteredApps.length - 1);
    }
  }, [filteredApps.length, selectedIndex, onIndexChange]);

  // Debug: Log on mount
  useEffect(() => {
    debugLog('📱 AppSelector MOUNTED');
  }, []);

  // Debug: Log app selector state on changes
  useEffect(() => {
    debugLog('📱 AppSelector render/update:');
    debugLog(`  Total apps: ${apps.length}`);
    debugLog(`  Filtered apps: ${filteredApps.length}`);
    debugLog(`  Query: "${query}"`);
    debugLog(`  Max visible: ${maxVisibleApps}`);
    debugLog(`  Displaying: ${Math.min(maxVisibleApps, filteredApps.length)} apps`);
    debugLog(`  Should fill vertical space with height="100%"`);
  }, [apps.length, filteredApps.length, query, maxVisibleApps]);

  // Additional debug at render time (not in useEffect)
  debugLog(`📱 AppSelector RENDERING - filteredApps: ${filteredApps.length}, maxVisible: ${maxVisibleApps}`);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={isFocused ? 'cyan' : 'white'} paddingX={1} height="100%">
      <Box flexShrink={0}>
        <Text bold color={isFocused ? 'cyan' : 'white'}>
          Select App
        </Text>
      </Box>
      
      <Box flexShrink={0}>
        <Text>
          Search: <Text color="yellow">{query || '_'}</Text>
          {isFocused && (
            <Text dimColor> {isInputMode ? '(type to search, Esc to exit input)' : '(/ to search, ↑↓ to navigate)'}</Text>
          )}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {filteredApps.length === 0 ? (
          <Box flexDirection="column">
            <Text dimColor>
              {query
                ? `No apps match "${query}". Try a different query.`
                : 'No apps found in database.'}
            </Text>
            {query.trim() && canScrape && (
              <Box flexDirection="column" marginTop={1}>
                {isScraping ? (
                  <Text color="cyan">⏳ {scrapeStatus}</Text>
                ) : scrapeStatus && !scrapeError ? (
                  <Text color="green">{scrapeStatus}</Text>
                ) : (
                  <Box flexDirection="column">
                    <Text color="cyan" bold>
                      ✦ Press Enter to use AI to search the web for "{query}" shortcuts
                    </Text>
                    <Text dimColor>
                      AI will scrape official documentation and add real shortcuts to your library.
                    </Text>
                  </Box>
                )}
                {scrapeError && (
                  <Text color="red">Error: {scrapeError}</Text>
                )}
              </Box>
            )}
            {query.trim() && !canScrape && (
              <Text dimColor>
                Tip: Login and configure AI to search the web for shortcuts (App-First Mode).
              </Text>
            )}
          </Box>
        ) : (
          filteredApps.slice(0, maxVisibleApps).map((app, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Box key={app.id}>
                <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                  {isSelected ? '► ' : '  '}
                  {app.displayName}
                </Text>
                <Text dimColor> ({app.shortcutCount} shortcuts)</Text>
              </Box>
            );
          })
        )}
        {filteredApps.length > maxVisibleApps && (
          <Box flexShrink={0}>
            <Text dimColor>... and {filteredApps.length - maxVisibleApps} more</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
