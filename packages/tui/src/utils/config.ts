import fs from 'fs';
import path from 'path';
import type { Platform } from '@katasumi/core';
import type { AIProvider } from '@katasumi/core';

export type PlatformOption = Platform | 'all';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

interface Config {
  platform?: PlatformOption;
  aiEnabled?: boolean;
  mode?: 'app-first' | 'full-phrase';
  ai?: AIConfig;
  aiKeyMode?: 'personal' | 'builtin';
  token?: string;
  user?: {
    id: string;
    email: string;
    tier: string;
    isPremium?: boolean;
    isEnterprise?: boolean;
  };
}

const CONFIG_DIR = path.join(process.env.HOME || '~', '.katasumi');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): Config {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Return empty config on error
  }
  return {};
}

export function saveConfig(config: Partial<Config>): void {
  try {
    ensureConfigDir();
    const existingConfig = loadConfig();
    const newConfig = { ...existingConfig, ...config };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (error) {
    // Silently fail - config persistence is not critical
  }
}

export function savePlatform(platform: PlatformOption): void {
  saveConfig({ platform });
}

export function loadPlatform(): PlatformOption | undefined {
  const config = loadConfig();
  return config.platform;
}

export function saveAIConfig(aiConfig: AIConfig): void {
  saveConfig({ ai: aiConfig });
}

export function loadAIConfig(): AIConfig | undefined {
  const config = loadConfig();
  return config.ai;
}

export function isAIConfigured(): boolean {
  const config = loadConfig();
  const aiConfig = config.ai;
  
  // Check if using built-in AI
  if (config.aiKeyMode === 'builtin' && config.user?.isPremium) {
    return true;
  }
  
  if (!aiConfig) return false;
  
  // Ollama doesn't require an API key
  if (aiConfig.provider === 'ollama') return true;
  
  // Other providers require an API key
  return !!aiConfig.apiKey && aiConfig.apiKey.trim().length > 0;
}

export function saveToken(token: string, user?: { id: string; email: string; tier: string; isPremium?: boolean; isEnterprise?: boolean }): void {
  const config = loadConfig();
  config.token = token;
  if (user) {
    config.user = user;
  }
  saveConfig(config);
}

export function loadToken(): string | undefined {
  const config = loadConfig();
  return config.token;
}

export function loadUser(): { id: string; email: string; tier: string; isPremium?: boolean; isEnterprise?: boolean } | undefined {
  const config = loadConfig();
  return config.user;
}

export function clearAuth(): void {
  const config = loadConfig();
  delete config.token;
  delete config.user;
  saveConfig(config);
}

export function saveAIKeyMode(mode: 'personal' | 'builtin'): void {
  saveConfig({ aiKeyMode: mode });
}

export function loadAIKeyMode(): 'personal' | 'builtin' | undefined {
  const config = loadConfig();
  return config.aiKeyMode;
}
