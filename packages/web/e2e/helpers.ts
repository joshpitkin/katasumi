import { Page } from '@playwright/test';

/**
 * Wait for the page to be fully loaded and interactive
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Type into the search input
 */
export async function typeInSearch(page: Page, query: string) {
  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.fill(query);
  await page.waitForTimeout(800); // Wait for debounce (300ms) + extra time
}

/**
 * Get the search results
 */
export async function getSearchResults(page: Page) {
  // Wait for results to load
  await page.waitForTimeout(1000);
  
  const results = page.locator('[data-testid="shortcut-result"], .shortcut-result, .result-item');
  return results;
}

/**
 * Click on a specific result by index
 */
export async function clickResult(page: Page, index: number = 0) {
  const results = await getSearchResults(page);
  await results.nth(index).click();
}

/**
 * Check if database connection is working
 */
export async function isDatabaseConnected(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/apps');
    return response.ok();
  } catch {
    return false;
  }
}
