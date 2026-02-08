import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { debugLog } from './utils/debug-logger.js';
import { useAppStore } from './store.js';
import { syncUserShortcuts } from './utils/sync.js';
import { getDbAdapter } from './utils/db-adapter.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { AppFirstMode } from './components/AppFirstMode.js';
import { FullPhraseMode } from './components/FullPhraseMode.js';
import { GlobalKeybindings } from './components/GlobalKeybindings.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { PlatformSelector } from './components/PlatformSelector.js';
import { FilterModal } from './components/FilterModal.js';

export default function App() {
  const [showHelp, setShowHelp] = useState(false);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [terminalRows, setTerminalRows] = useState(process.stdout.rows || 24);
  const mode = useAppStore((state) => state.mode);
  const view = useAppStore((state) => state.view);
  const platform = useAppStore((state) => state.platform);
  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const selectedApp = useAppStore((state) => state.selectedApp);
  const results = useAppStore((state) => state.results);
  const toggleMode = useAppStore((state) => state.toggleMode);
  const toggleAI = useAppStore((state) => state.toggleAI);
  const setPlatform = useAppStore((state) => state.setPlatform);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const syncMessage = useAppStore((state) => state.syncMessage);
  const setSyncStatus = useAppStore((state) => state.setSyncStatus);

  const handleQuit = () => {
    process.exit(0);
  };

  const handleShowHelp = () => {
    setShowHelp(!showHelp);
  };

  const handleShowPlatformSelector = () => {
    setShowPlatformSelector(!showPlatformSelector);
  };

  const handleShowFilterModal = () => {
    // Only show filter modal in app-first mode when app is selected
    if (mode === 'app-first' && selectedApp) {
      setShowFilterModal(!showFilterModal);
    }
  };

  const handlePlatformSelect = (newPlatform: typeof platform) => {
    setPlatform(newPlatform);
    setShowPlatformSelector(false);
  };

  const handleSync = async () => {
    // Don't allow sync if already syncing
    if (syncStatus === 'syncing') {
      return;
    }

    setSyncStatus('syncing', 'Syncing shortcuts...');
    
    try {
      const adapter = getDbAdapter();
      const result = await syncUserShortcuts(adapter);
      
      if (result.success) {
        setSyncStatus('success', result.message);
        // Clear success message after 3 seconds
        setTimeout(() => {
          if (useAppStore.getState().syncStatus === 'success') {
            setSyncStatus('idle');
          }
        }, 3000);
      } else {
        setSyncStatus('error', result.message);
        // Clear error message after 5 seconds
        setTimeout(() => {
          if (useAppStore.getState().syncStatus === 'error') {
            setSyncStatus('idle');
          }
        }, 5000);
      }
    } catch (error) {
      setSyncStatus('error', 'Sync failed');
      setTimeout(() => {
        if (useAppStore.getState().syncStatus === 'error') {
          setSyncStatus('idle');
        }
      }, 5000);
    }
  };

  // Debug terminal dimensions
  useEffect(() => {
    debugLog('📱 App mounted:');
    debugLog(`  process.stdout.rows: ${process.stdout.rows}`);
    debugLog(`  process.stdout.columns: ${process.stdout.columns}`);
    debugLog(`  Root Box should fill terminal: ${terminalRows} rows`);
    debugLog(`  With padding=1: ${terminalRows - 2} rows available for content`);
    
    // Listen for terminal resize
    const handleResize = () => {
      const newRows = process.stdout.rows || 24;
      debugLog(`📐 App: Terminal resized to ${newRows} rows`);
      setTerminalRows(newRows);
    };
    
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, [terminalRows]);

  return (
    <Box flexDirection="column" height={terminalRows} padding={1}>
      <Header mode={mode} platform={platform} aiEnabled={aiEnabled} />

      <Box flexGrow={1} flexDirection="column" minHeight={0}>
        {showHelp ? (
          <HelpOverlay onClose={() => setShowHelp(false)} />
        ) : showPlatformSelector ? (
          <PlatformSelector
            currentPlatform={platform}
            onSelect={handlePlatformSelect}
            onClose={() => setShowPlatformSelector(false)}
          />
        ) : showFilterModal && selectedApp ? (
          <FilterModal
            shortcuts={results}
            onClose={() => setShowFilterModal(false)}
          />
        ) : (
          <>
            {mode === 'app-first' ? (
              <AppFirstMode selectedApp={selectedApp} view={view} />
            ) : (
              <FullPhraseMode aiEnabled={aiEnabled} view={view} />
            )}
          </>
        )}
      </Box>

      <Footer mode={mode} selectedApp={selectedApp} syncStatus={syncStatus} syncMessage={syncMessage} />

      <GlobalKeybindings
        onToggleMode={toggleMode}
        onToggleAI={toggleAI}
        onShowHelp={handleShowHelp}
        onShowPlatformSelector={handleShowPlatformSelector}
        onShowFilterModal={handleShowFilterModal}
        onQuit={handleQuit}
        onSync={handleSync}
        showFilterModal={showFilterModal}
        showHelp={showHelp}
        showPlatformSelector={showPlatformSelector}
      />
    </Box>
  );
}
