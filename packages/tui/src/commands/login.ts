#!/usr/bin/env node
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = process.env.KATASUMI_API_URL || 'http://localhost:3000';
const CONFIG_DIR = path.join(process.env.HOME || '~', '.katasumi');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    tier: string;
  };
  message?: string;
}

interface Config {
  token?: string;
  user?: {
    id: string;
    email: string;
    tier: string;
  };
  [key: string]: any;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
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

function saveConfig(config: Config): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600, // User read/write only
  });
}

function promptInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Mute output for password
    const stdin = process.stdin as any;
    stdin.setRawMode?.(true);
    
    process.stdout.write(prompt);
    
    let password = '';
    const onData = (char: Buffer) => {
      const byte = char.toString('utf8');
      
      switch (byte) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode?.(false);
          rl.close();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          stdin.setRawMode?.(false);
          rl.close();
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;
        default:
          // Only add printable characters
          if (byte.charCodeAt(0) >= 32) {
            password += byte;
          }
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

async function loginWithCredentials(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data as LoginResponse;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

async function loginWithBrowser(): Promise<void> {
  console.log('Opening browser for OAuth login...');
  
  // For now, open the web login page
  // In the future, this could implement a full OAuth flow
  const loginUrl = `${API_BASE_URL}/login`;
  
  try {
    const open = await import('open');
    await open.default(loginUrl);
    
    console.log('\nAfter logging in via the browser:');
    console.log('1. Go to your account settings');
    console.log('2. Copy your API token');
    console.log('3. Run: katasumi login --token <your-token>');
  } catch (error) {
    console.error('Failed to open browser. Please visit:');
    console.log(loginUrl);
  }
}

async function loginWithToken(token: string): Promise<void> {
  console.log('Verifying token...');
  
  const isValid = await verifyToken(token);
  
  if (!isValid) {
    console.error('Error: Invalid token');
    process.exit(1);
  }
  
  const config = loadConfig();
  config.token = token;
  saveConfig(config);
  
  console.log('Logged in successfully');
}

export async function loginCommand(args: string[]): Promise<void> {
  try {
    // Check for flags
    if (args.includes('--web')) {
      await loginWithBrowser();
      return;
    }
    
    // Check for token flag
    const tokenIndex = args.indexOf('--token');
    if (tokenIndex !== -1 && args[tokenIndex + 1]) {
      await loginWithToken(args[tokenIndex + 1]);
      return;
    }
    
    // Interactive login
    const email = await promptInput('Email: ');
    
    if (!email || !email.trim()) {
      console.error('Error: Email is required');
      process.exit(1);
    }
    
    const password = await promptPassword('Password: ');
    
    if (!password || !password.trim()) {
      console.error('Error: Password is required');
      process.exit(1);
    }
    
    console.log('Logging in...');
    
    const result = await loginWithCredentials(email.trim(), password);
    
    // Verify token
    const isValid = await verifyToken(result.token);
    if (!isValid) {
      console.error('Error: Token validation failed');
      process.exit(1);
    }
    
    // Store token and user info
    const config = loadConfig();
    config.token = result.token;
    config.user = result.user;
    saveConfig(config);
    
    console.log('Logged in successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Login failed');
    }
    process.exit(1);
  }
}
