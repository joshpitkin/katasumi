import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Shortcut, SourceType, DatabaseAdapter } from '@katasumi/core';

const API_BASE_URL = process.env.KATASUMI_API_URL || 'https://www.katasumi.dev';
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
  adapter: DatabaseAdapter
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

    // Merge shortcuts into local database using the public adapter interface
    // which ensures the user DB is initialized before writing.
    let syncedCount = 0;
    const errors: string[] = [];
    for (const shortcut of data.shortcuts) {
      try {
        await adapter.upsertShortcut({
          id: shortcut.id,
          app: shortcut.app,
          action: shortcut.action,
          keys: {
            mac: shortcut.keys.mac,
            windows: shortcut.keys.windows,
            linux: shortcut.keys.linux,
          },
          context: shortcut.context,
          category: shortcut.category,
          tags: shortcut.tags,
          source: {
            type: shortcut.source.type as SourceType,
            url: shortcut.source.url || '',
            scrapedAt: new Date(shortcut.source.scrapedAt),
            confidence: shortcut.source.confidence,
          },
        });
        syncedCount++;
      } catch (error) {
        errors.push(shortcut.id);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Sync partially failed: ${errors.length} shortcut${errors.length !== 1 ? 's' : ''} could not be saved`,
        error: 'upsert_error',
        shortcutsSynced: syncedCount,
      };
    }

    // Only update sync state after all shortcuts were successfully saved.
    // This ensures a partially-failed sync will retry on the next run.
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

/**
 * Sync AI configuration from web to TUI (premium feature)
 * Pulls AI config from /api/sync/config and saves to local config
 */
export async function syncAIConfig(): Promise<SyncResult> {
  try {
    // Read config
    const configData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config: Config = JSON.parse(configData);
    
    if (!config.token) {
      return {
        success: false,
        message: 'Not logged in. Run "katasumi login" first.',
        requiresLogin: true,
      };
    }
    
    // Call sync endpoint
    const response = await fetch(`${API_BASE_URL}/api/sync/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 401) {
      return {
        success: false,
        message: 'Authentication expired. Please log in again.',
        requiresLogin: true,
      };
    }
    
    if (response.status === 403) {
      const data = await response.json() as { error?: string };
      return {
        success: false,
        message: data.error || 'AI config sync requires premium subscription',
        error: 'premium_required',
      };
    }
    
    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      return {
        success: false,
        message: errorData.error || 'Failed to sync AI configuration',
        error: 'sync_failed',
      };
    }
    
    const data = await response.json() as {
      aiKeyMode: string;
      aiConfig?: {
        provider: string;
        apiKey?: string;
        model?: string;
        baseUrl?: string;
      };
    };
    
    // Update local config with synced AI settings
    const updatedConfig = {
      ...config,
      aiKeyMode: data.aiKeyMode,
      ai: data.aiConfig || undefined,
    };
    
    // Save updated config
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    
    return {
      success: true,
      message: data.aiConfig 
        ? `AI config synced successfully (${data.aiConfig.provider})` 
        : 'AI config synced (using built-in)',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        message: `Failed to sync AI config: ${error.message}`,
        error: 'network_error',
      };
    }
    return {
      success: false,
      message: 'Failed to sync AI config',
      error: 'unknown_error',
    };
  }
}

