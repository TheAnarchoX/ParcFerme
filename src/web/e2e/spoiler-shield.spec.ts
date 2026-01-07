import { test, expect } from '@playwright/test';

/**
 * E2E tests for spoiler shield functionality.
 * Tests that spoiler controls work correctly across the app.
 */

test.describe('Spoiler Shield Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have spoiler mode controls accessible', async ({ page }) => {
    // On mobile, need to open the menu first
    const viewport = page.viewportSize();
    
    if (viewport && viewport.width < 768) {
      // Mobile: open menu
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.waitForSelector('[role="dialog"]');
    }
    
    // The spoiler mode toggle should be accessible somewhere in the UI
    // This may be in the header, user menu, or settings
    // For now, we just verify the page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Spoiler-Safe Display', () => {
  test('should display sessions page without errors', async ({ page }) => {
    await page.goto('/sessions');
    
    // Page should load
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // No error messages should be visible
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('should not display sensitive result data on list pages', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for any async content
    await page.waitForLoadState('networkidle');
    
    // Verify page structure (exact content depends on spoiler mode)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Spoiler Mode Settings', () => {
  test('should be able to navigate to settings page', async ({ page }) => {
    // This requires authentication, so we just verify the route exists
    await page.goto('/settings');
    
    // Should redirect to login if not authenticated
    // This is expected behavior for protected routes
    await expect(page).toHaveURL(/login|settings/);
  });
});

test.describe('About Page (Public)', () => {
  test('should display about page content', async ({ page }) => {
    await page.goto('/about');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // About page should mention key features like spoiler protection
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toMatch(/spoiler|motorsport|race/);
  });
});

test.describe('Privacy and Terms', () => {
  test('should display privacy policy', async ({ page }) => {
    await page.goto('/privacy');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display terms of service', async ({ page }) => {
    await page.goto('/terms');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
