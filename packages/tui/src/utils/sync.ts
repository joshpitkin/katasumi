import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Shortcut } from '@katasumi/core';

const API_BASE_URL = process.env.KATASUMI_API_URL || 'http://localhost:3000';
const CONFIG_DIR = path.join(os.homedir(), '.katasumi');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const SYNC_STATE_PATH = path.join(CONFIG_DIR, 'sync-state.json');

interface Config {
  token?: string;
  user?: {
    id: string;
    email: string;
    tier: string;
  };
}

interface SyncState {
  lastSyncTime?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  shortcutsSynced?: number;
  requiresLogin?: boolean;
  error?: string;
}

interface PullResponse {
  shortcuts: Array<{
    id: string;
    app: string;
    action: string;
    keys: {
      mac?: string;
      windows?: string;
      linux?: string;
    };
    context?: string;
    category?: string;
    tags: string[];
    source: {
      type: string;
      url: string;
      scrapedAt: Date;
      confidence: number;
    };
    createdAt: Date;
    updatedAt: Date;
  }>;
  count: number;
  pulledAt: string;
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Return empty config on error
  }
  return {};
}

function loadSyncState(): SyncState {
  try {
    if (fs.existsSync(SYNC_STATE_PATH)) {
      const data = fs.readFileSync(SYNC_STATE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Return empty state on error
  }
  return {};
}

function saveSyncState(state: SyncState): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2), {
      mode: 0o600,
    });
  } catch (error) {
    // Silently fail - not critical
  }
}

export function getLastSyncTime(): string | null {
  const state = loadSyncState();
  if (!state.lastSyncTime) {
    return null;
  }
  
  const lastSync = new Date(state.lastSyncTime);
  const now = new Date();
  const diffMs = now.getTime() - lastSync.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

export function isAuthenticated(): boolean {
  const config = loadConfig();
  return !!config.token;
}

export function getUserTier(): string | null {
  const config = loadConfig();
  return config.user?.tier || null;
}

/**
 * Sync user shortcuts from web PostgreSQL to local SQLite
 * Returns a result object with status information
 */
export async function syncUserShortcuts(
  adapter: any
): Promise<SyncResult> {
  // Check authentication
  const config = loadConfig();
  if (!config.token) {
    return {
      success: false,
      message: 'Not authenticated. Run "katasumi login" to authenticate.',
      requiresLogin: true,
    };
  }

  // Check premium status
  if (config.user?.tier !== 'premium') {
    return {
      success: false,
      message: 'Premium subscription required. Upgrade at web interface.',
      error: 'not_premium',
    };
  }

  try {
    // Get last sync time for incremental sync
    const syncState = loadSyncState();
    const since = syncState.lastSyncTime;
    
    // Build URL with since parameter for incremental sync
    const url = new URL(`${API_BASE_URL}/api/sync/pull`);
    if (since) {
      url.searchParams.append('since', since);
    }

    // Call sync API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Authentication failed. Run "katasumi login" again.',
          requiresLogin: true,
        };
      } else if (response.status === 403) {
        return {
          success: false,
          message: 'Premium subscription required.',
          error: 'not_premium',
        };
      }
      
      const errorData: any = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error || 'Sync failed',
        error: 'api_error',
      };
    }

    const data = (await response.json()) as PullResponse;

    // Merge shortcuts into local database
    let syncedCount = 0;
    for (const shortcut of data.shortcuts) {
      try {
        // Use INSERT OR REPLACE strategy - web shortcuts take precedence
        await adapter.userDb.shortcut.upsert({
          where: { id: shortcut.id },
          update: {
            app: shortcut.app,
            action: shortcut.action,
            keysMac: shortcut.keys.mac || null,
            keysWindows: shortcut.keys.windows || null,
            keysLinux: shortcut.keys.linux || null,
            context: shortcut.context || null,
            category: shortcut.category || null,
            tags: shortcut.tags.join(','),
            sourceType: shortcut.source.type,
            sourceUrl: shortcut.source.url || null,
            sourceScrapedAt: new Date(shortcut.source.scrapedAt),
            sourceConfidence: shortcut.source.confidence,
            updatedAt: new Date(shortcut.updatedAt),
          },
          create: {
            id: shortcut.id,
            app: shortcut.app,
            action: shortcut.action,
            keysMac: shortcut.keys.mac || null,
            keysWindows: shortcut.keys.windows || null,
            keysLinux: shortcut.keys.linux || null,
            context: shortcut.context || null,
            category: shortcut.category || null,
            tags: shortcut.tags.join(','),
            sourceType: shortcut.source.type,
            sourceUrl: shortcut.source.url || null,
            sourceScrapedAt: new Date(shortcut.source.scrapedAt),
            sourceConfidence: shortcut.source.confidence,
            createdAt: new Date(shortcut.createdAt),
            updatedAt: new Date(shortcut.updatedAt),
          },
        });
        syncedCount++;
      } catch (error) {
        // Log but continue with other shortcuts
        console.error(`Failed to sync shortcut ${shortcut.id}:`, error);
      }
    }

    // Update sync state
    saveSyncState({
      lastSyncTime: data.pulledAt,
    });

    // Return success
    if (syncedCount === 0 && since) {
      return {
        success: true,
        message: 'Up to date',
        shortcutsSynced: 0,
      };
    } else {
      return {
        success: true,
        message: `Synced ${syncedCount} shortcut${syncedCount !== 1 ? 's' : ''} from web`,
        shortcutsSynced: syncedCount,
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          message: 'Network error. Check your internet connection.',
          error: 'network_error',
        };
      }
      return {
        success: false,
        message: `Sync failed: ${error.message}`,
        error: 'unknown_error',
      };
    }
    return {
      success: false,
      message: 'Sync failed',
      error: 'unknown_error',
    };
  }
}
