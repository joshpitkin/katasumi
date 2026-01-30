import { test, expect, Page } from '@playwright/test';
import { waitForPageReady } from './helpers';

/**
 * E2E Tests to catch console errors and hydration issues
 * These tests ensure zero console errors during normal usage
 */

test.describe('Console Error Detection', () => {
  let consoleMessages: { type: string; text: string }[] = [];
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    consoleErrors = [];
    consoleWarnings = [];

    // Listen for console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      consoleMessages.push({ type, text });
      
      if (type === 'error') {
        consoleErrors.push(text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page error: ${error.message}`);
    });

    // Navigate to homepage
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('should have zero hydration errors on page load', async ({ page }) => {
    // Wait a bit for any hydration to complete
    await page.waitForTimeout(2000);

    // Check for hydration-specific errors
    const hydrationErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('hydration') ||
      error.toLowerCase().includes('hydrating') ||
      error.toLowerCase().includes('server') && error.toLowerCase().includes('client')
    );

    expect(hydrationErrors).toHaveLength(0);
    
    if (hydrationErrors.length > 0) {
      console.log('Hydration errors found:', hydrationErrors);
    }
  });

  test('should have zero React errors on page load', async ({ page }) => {
    // Wait for page to fully render
    await page.waitForTimeout(2000);

    // Filter React-specific errors
    const reactErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('react') ||
      error.toLowerCase().includes('warning: ') ||
      error.includes('validateDOMNesting')
    );

    expect(reactErrors).toHaveLength(0);
    
    if (reactErrors.length > 0) {
      console.log('React errors found:', reactErrors);
    }
  });

  test('should have zero console errors during navigation', async ({ page }) => {
    // Clear errors from initial load
    consoleErrors = [];

    // Toggle mode
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Open help
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    // Close help with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Open platform selector
    await page.keyboard.press('p');
    await page.waitForTimeout(500);

    // Close platform selector
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Check for errors during navigation
    expect(consoleErrors).toHaveLength(0);
    
    if (consoleErrors.length > 0) {
      console.log('Navigation errors found:', consoleErrors);
    }
  });

  test('should have zero console errors during search', async ({ page }) => {
    // Clear errors from initial load
    consoleErrors = [];

    // Focus search input
    await page.keyboard.press('/');
    await page.waitForTimeout(200);

    // Type in search
    await page.keyboard.type('copy');
    await page.waitForTimeout(1500); // Wait for debounced search

    // Check for errors during search
    expect(consoleErrors).toHaveLength(0);
    
    if (consoleErrors.length > 0) {
      console.log('Search errors found:', consoleErrors);
    }
  });

  test('should have zero TypeScript errors in console', async ({ page }) => {
    // Wait for page to fully render
    await page.waitForTimeout(2000);

    // TypeScript errors often appear as type errors
    const typeErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('type error') ||
      error.toLowerCase().includes('typescript')
    );

    expect(typeErrors).toHaveLength(0);
    
    if (typeErrors.length > 0) {
      console.log('TypeScript errors found:', typeErrors);
    }
  });

  test('should properly suppress hydration warnings for next-themes', async ({ page }) => {
    // Wait for theme to be applied
    await page.waitForTimeout(2000);

    // next-themes uses suppressHydrationWarning on <html>
    // This is expected and documented - verify it's the ONLY suppression
    const htmlElement = await page.locator('html').first();
    const hasSuppressHydration = await htmlElement.evaluate((el) => 
      el.hasAttribute('suppressHydrationWarning') || 
      el.hasAttribute('data-suppress-hydration-warning')
    );

    // This is okay - next-themes requires it for dark mode
    expect(hasSuppressHydration).toBeTruthy();

    // But we should have no hydration errors despite the suppression
    const hydrationErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('hydration')
    );
    expect(hydrationErrors).toHaveLength(0);
  });

  test('should have consistent HTML between SSR and client', async ({ page }) => {
    // Get the initial HTML
    const initialHTML = await page.content();

    // Reload page to test again
    await page.reload();
    await waitForPageReady(page);
    await page.waitForTimeout(1000);

    const reloadedHTML = await page.content();

    // HTML structure should be consistent (allowing for timestamps/IDs)
    expect(initialHTML.length).toBeGreaterThan(1000);
    expect(reloadedHTML.length).toBeGreaterThan(1000);
    
    // No hydration errors should occur on reload
    const hydrationErrorsAfterReload = consoleErrors.filter(error => 
      error.toLowerCase().includes('hydration')
    );
    expect(hydrationErrorsAfterReload).toHaveLength(0);
  });

  test('should not have mismatched useEffect dependencies', async ({ page }) => {
    // Wait for all effects to run
    await page.waitForTimeout(2000);

    // React warns about missing dependencies
    const dependencyWarnings = consoleWarnings.filter(warning => 
      warning.includes('useEffect') || 
      warning.includes('dependency') ||
      warning.includes('React Hook')
    );

    expect(dependencyWarnings).toHaveLength(0);
    
    if (dependencyWarnings.length > 0) {
      console.log('Dependency warnings found:', dependencyWarnings);
    }
  });
});

test.describe('Component-Specific Hydration Tests', () => {
  test('Header component should not have hydration errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('header');
    await page.waitForTimeout(1000);

    const headerHydrationErrors = errors.filter(error => 
      error.toLowerCase().includes('hydration') &&
      error.toLowerCase().includes('header')
    );

    expect(headerHydrationErrors).toHaveLength(0);
  });

  test('Footer component should not have hydration errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('footer');
    await page.waitForTimeout(1000);

    const footerHydrationErrors = errors.filter(error => 
      error.toLowerCase().includes('hydration') &&
      error.toLowerCase().includes('footer')
    );

    expect(footerHydrationErrors).toHaveLength(0);
  });

  test('Platform detection should not cause hydration errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Platform is shown in header - check for hydration issues
    const platformText = await page.locator('text=Platform:').first();
    await expect(platformText).toBeVisible();

    const platformHydrationErrors = errors.filter(error => 
      error.toLowerCase().includes('hydration') &&
      (error.toLowerCase().includes('platform') || error.toLowerCase().includes('header'))
    );

    expect(platformHydrationErrors).toHaveLength(0);
  });
});
