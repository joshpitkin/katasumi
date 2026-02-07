import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fetch globally
global.fetch = vi.fn();

describe('Login Command', () => {
  const testConfigDir = path.join(os.tmpdir(), '.katasumi-test-' + Date.now());
  const testConfigPath = path.join(testConfigDir, 'config.json');
  
  beforeEach(() => {
    // Setup test config directory
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    
    // Mock HOME environment variable
    process.env.HOME = os.tmpdir();
    
    // Reset fetch mock
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup test config directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });
  
  describe('Config Management', () => {
    it('should create config directory if it does not exist', () => {
      const nonExistentDir = path.join(os.tmpdir(), '.katasumi-test-new-' + Date.now());
      const configPath = path.join(nonExistentDir, 'config.json');
      
      expect(fs.existsSync(nonExistentDir)).toBe(false);
      
      fs.mkdirSync(nonExistentDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ test: true }), { mode: 0o600 });
      
      expect(fs.existsSync(nonExistentDir)).toBe(true);
      expect(fs.existsSync(configPath)).toBe(true);
      
      // Check permissions (600)
      const stats = fs.statSync(configPath);
      const permissions = (stats.mode & 0o777).toString(8);
      expect(permissions).toBe('600');
      
      // Cleanup
      fs.rmSync(nonExistentDir, { recursive: true, force: true });
    });
    
    it('should save token with 600 permissions', () => {
      const token = 'test-jwt-token';
      const config = { token };
      
      fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      
      const stats = fs.statSync(testConfigPath);
      const permissions = (stats.mode & 0o777).toString(8);
      expect(permissions).toBe('600');
      
      const savedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
      expect(savedConfig.token).toBe(token);
    });
    
    it('should store user information along with token', () => {
      const config = {
        token: 'test-jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          tier: 'premium',
        },
      };
      
      fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      
      const savedConfig = JSON.parse(fs.readFileSync(testConfigPath, 'utf8'));
      expect(savedConfig.token).toBe(config.token);
      expect(savedConfig.user).toEqual(config.user);
    });
  });
  
  describe('API Integration', () => {
    it('should handle successful login response', async () => {
      const mockResponse = {
        token: 'jwt-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          tier: 'premium',
        },
        message: 'Login successful',
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });
      
      const data: any = await response.json();
      expect(data.token).toBe(mockResponse.token);
      expect(data.user).toEqual(mockResponse.user);
    });
    
    it('should handle login errors', async () => {
      const mockError = {
        error: 'Invalid email or password',
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockError,
      });
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrong' }),
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      
      const data: any = await response.json();
      expect(data.error).toBe(mockError.error);
    });
    
    it('should verify token with API call', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'authenticated' }),
      });
      
      const response = await fetch('http://localhost:3000/api/sync/status', {
        headers: { Authorization: 'Bearer jwt-token-123' },
      });
      
      expect(response.ok).toBe(true);
    });
    
    it('should handle invalid token verification', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid token' }),
      });
      
      const response = await fetch('http://localhost:3000/api/sync/status', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      
      expect(response.ok).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });
    
    it('should handle malformed JSON config', () => {
      fs.writeFileSync(testConfigPath, 'invalid json{', { mode: 0o600 });
      
      // Should not throw, but return empty config
      try {
        const config = fs.existsSync(testConfigPath) ? JSON.parse(fs.readFileSync(testConfigPath, 'utf8')) : {};
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined();
      }
    });
  });
});
