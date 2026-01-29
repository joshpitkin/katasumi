import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AppInfo, DatabaseAdapter, Shortcut } from '@katasumi/core';
import { SQLiteAdapter } from '@katasumi/core';
import { useAppStore } from '../store.js';
import { AppSelector } from './AppSelector.js';
import { FiltersBar } from './FiltersBar.js';
import { ResultsList } from './ResultsList.js';
import { DetailView } from './DetailView.js';
import { logError, getUserFriendlyMessage } from '../utils/error-logger.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AppFirstModeProps {
  selectedApp: AppInfo | null;
  view: 'search' | 'results' | 'detail';
}

interface AppFirstModeState {
  loading: boolean;
  error: string | null;
}

// Singleton database adapter
let dbAdapter: DatabaseAdapter | null = null;

function getDbAdapter(): DatabaseAdapter {
  if (!dbAdapter) {
    // Resolve path from the monorepo root
    // When running from dist/cli.js, we need to go up to the packages directory
    const possiblePaths = [
      // From dist/components/ go to packages/core/data/shortcuts.db
      path.resolve(__dirname, '..', '..', '..', 'core', 'data', 'shortcuts.db'),
      // From packages/tui go to packages/core/data/shortcuts.db
      path.resolve(__dirname, '..', 'core', 'data', 'shortcuts.db'),
      // From process.cwd() which might be packages/tui
      path.resolve(process.cwd(), '..', 'core', 'data', 'shortcuts.db'),
      // From process.cwd() which might be monorepo root
      path.resolve(process.cwd(), 'packages', 'core', 'data', 'shortcuts.db'),
    ];

    let coreDbPath = possiblePaths.find((p) => {
      const exists = fs.existsSync(p);
      if (exists) {
        console.log(`✓ Found core database at: ${p}`);
      }
      return exists;
    });

    if (!coreDbPath) {
      console.error('❌ Core database not found. Searched paths:');
      possiblePaths.forEach(p => console.error(`   - ${p}`));
      console.error('Using empty in-memory database.');
      coreDbPath = ':memory:';
    }

    const userDbPath = path.join(process.env.HOME || '~', '.katasumi', 'user-data.db');
    dbAdapter = new SQLiteAdapter(coreDbPath, userDbPath);
  }
  return dbAdapter;
}

export function AppFirstMode({ selectedApp, view }: AppFirstModeProps) {
  const availableApps = useAppStore((state) => state.availableApps);
  const setAvailableApps = useAppStore((state) => state.setAvailableApps);
  const appQuery = useAppStore((state) => state.appQuery);
  const setAppQuery = useAppStore((state) => state.setAppQuery);
  const selectedAppIndex = useAppStore((state) => state.selectedAppIndex);
  const setSelectedAppIndex = useAppStore((state) => state.setSelectedAppIndex);
  const selectApp = useAppStore((state) => state.selectApp);
  const quickSearchQuery = useAppStore((state) => state.quickSearchQuery);
  const setQuickSearchQuery = useAppStore((state) => state.setQuickSearchQuery);
  const focusSection = useAppStore((state) => state.focusSection);
  const setFocusSection = useAppStore((state) => state.setFocusSection);
  const results = useAppStore((state) => state.results);
  const setResults = useAppStore((state) => state.setResults);
  const filters = useAppStore((state) => state.filters);
  const platform = useAppStore((state) => state.platform);
  const selectedShortcut = useAppStore((state) => state.selectedShortcut);
  const selectShortcut = useAppStore((state) => state.selectShortcut);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available apps on mount
  useEffect(() => {
    const loadApps = async () => {
      try {
        setError(null);
        const adapter = getDbAdapter();
        const apps = await adapter.getApps();
        
        if (apps.length === 0) {
          setError('No apps found in database. Please run database setup.');
          logError('No apps found', new Error('Database returned empty apps list'));
        } else {
          setAvailableApps(apps);
        }
      } catch (error) {
        const friendlyMessage = getUserFriendlyMessage(error);
        setError(friendlyMessage);
        logError('Error loading apps', error);
        setAvailableApps([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (availableApps.length === 0) {
      loadApps();
    } else {
      setLoading(false);
    }
  }, [availableApps.length, setAvailableApps]);

  // Load shortcuts when app is selected
  useEffect(() => {
    if (!selectedApp) return;

    const loadShortcuts = async () => {
      try {
        setError(null);
        const adapter = getDbAdapter();
        const shortcuts = await adapter.getShortcutsByApp(selectedApp.name);
        
        if (shortcuts.length === 0) {
          // This is not an error - just an empty result
          setResults([]);
        } else {
          setResults(shortcuts);
        }
      } catch (error) {
        const friendlyMessage = getUserFriendlyMessage(error);
        setError(friendlyMessage);
        logError(`Error loading shortcuts for app: ${selectedApp.name}`, error);
        setResults([]);
      }
    };

    loadShortcuts();
  }, [selectedApp, setResults]);

  // Handle g/f navigation (vi-style shortcuts)
  useInput((input, key) => {
    if (key.escape && selectedApp) {
      selectApp(null);
      setAppQuery('');
      setQuickSearchQuery('');
      setFocusSection('app-selector');
    } else if (input === 'g' && selectedApp) {
      // g: Go to app selector (return to app selection)
      selectApp(null);
      setAppQuery('');
      setQuickSearchQuery('');
      setFocusSection('app-selector');
    } else if (input === 'f' && selectedApp) {
      // f: Focus filters bar
      setFocusSection('filters');
    }
  });

  if (loading) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        paddingX={2}
        paddingY={1}
        marginY={1}
      >
        <Text>Loading apps...</Text>
      </Box>
    );
  }

  // Show error if database failed to load
  if (error) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="red"
        paddingX={2}
        paddingY={1}
        marginY={1}
      >
        <Text color="red" bold>Error:</Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <Text dimColor>Check ~/.katasumi/error.log for details</Text>
        </Box>
      </Box>
    );
  }

  // Show detail view if a shortcut is selected
  if (view === 'detail' && selectedShortcut) {
    return (
      <DetailView
        shortcut={selectedShortcut}
        platform={platform}
        onBack={() => selectShortcut(null)}
        dbAdapter={getDbAdapter()}
      />
    );
  }

  if (!selectedApp) {
    // Show app selector
    return (
      <Box flexDirection="column" marginY={1}>
        <AppSelector
          apps={availableApps}
          query={appQuery}
          selectedIndex={selectedAppIndex}
          onSelectApp={selectApp}
          onQueryChange={setAppQuery}
          onIndexChange={setSelectedAppIndex}
        />
      </Box>
    );
  }

  // Show filters and results
  return (
    <Box flexDirection="column" marginY={1} gap={1}>
      <Box flexDirection="column">
        <Text>
          App: <Text bold color="cyan">{selectedApp.displayName}</Text>
          {' '}
          <Text dimColor>({selectedApp.shortcutCount} shortcuts)</Text>
          {' '}
          <Text dimColor>Press F2 to change app</Text>
        </Text>
      </Box>

      <FiltersBar onQuickSearchChange={setQuickSearchQuery} />
      
      <ResultsList
        results={results}
        platform={platform}
        quickSearchQuery={quickSearchQuery}
        onSelectShortcut={selectShortcut}
      />
    </Box>
  );
}

