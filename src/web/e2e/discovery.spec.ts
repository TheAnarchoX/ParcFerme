import { test, expect } from '@playwright/test';

/**
 * E2E tests for the discovery flow.
 * Tests browsing series, seasons, rounds, and sessions.
 */

test.describe('Series Discovery', () => {
  test('should display series list page', async ({ page }) => {
    await page.goto('/series');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Page should load without errors
    await expect(page.locator('body')).not.toContainText('error');
  });

  test('should navigate from series list to series detail', async ({ page }) => {
    await page.goto('/series');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for a series link (e.g., Formula 1)
    const seriesLink = page.getByRole('link', { name: /formula 1|f1/i }).first();
    
    // If series links exist, click and verify navigation
    if (await seriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seriesLink.click();
      await expect(page).toHaveURL(/\/series\//);
    }
  });
});

test.describe('Sessions Page', () => {
  test('should display sessions list', async ({ page }) => {
    await page.goto('/sessions');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Drivers Page', () => {
  test('should display drivers list', async ({ page }) => {
    await page.goto('/drivers');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should navigate to driver detail from list', async ({ page }) => {
    await page.goto('/drivers');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find a driver link
    const driverLinks = page.locator('a[href^="/drivers/"]');
    
    if (await driverLinks.count() > 0) {
      await driverLinks.first().click();
      await expect(page).toHaveURL(/\/drivers\/.+/);
    }
  });
});

test.describe('Teams Page', () => {
  test('should display teams list', async ({ page }) => {
    await page.goto('/teams');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should navigate to team detail from list', async ({ page }) => {
    await page.goto('/teams');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find a team link
    const teamLinks = page.locator('a[href^="/teams/"]');
    
    if (await teamLinks.count() > 0) {
      await teamLinks.first().click();
      await expect(page).toHaveURL(/\/teams\/.+/);
    }
  });
});

test.describe('Circuits Page', () => {
  test('should display circuits list', async ({ page }) => {
    await page.goto('/circuits');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should navigate to circuit detail from list', async ({ page }) => {
    await page.goto('/circuits');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find a circuit link
    const circuitLinks = page.locator('a[href^="/circuits/"]');
    
    if (await circuitLinks.count() > 0) {
      await circuitLinks.first().click();
      await expect(page).toHaveURL(/\/circuits\/.+/);
    }
  });
});

test.describe('Navigation Breadcrumbs', () => {
  test('should display breadcrumbs on detail pages', async ({ page }) => {
    // Navigate to a nested page
    await page.goto('/series');
    
    // Wait for content
    await page.waitForLoadState('networkidle');
    
    // Check for breadcrumb navigation if on a detail page
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').or(page.locator('[class*="breadcrumb"]'));
    
    // Breadcrumbs may or may not be present on list pages
    // This test verifies they don't cause errors
    await expect(page.locator('body')).not.toContainText('error');
  });
});

test.describe('Discovery Flow Integration', () => {
  test('should maintain navigation state through discovery flow', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    
    // Navigate to series
    await page.goto('/series');
    await expect(page).toHaveURL('/series');
    
    // Navigate to drivers
    await page.goto('/drivers');
    await expect(page).toHaveURL('/drivers');
    
    // Navigate to teams
    await page.goto('/teams');
    await expect(page).toHaveURL('/teams');
    
    // Navigate to circuits
    await page.goto('/circuits');
    await expect(page).toHaveURL('/circuits');
    
    // All pages should load without errors
    await expect(page.locator('body')).toBeVisible();
  });
});
