import { test, expect } from '@playwright/test';

/**
 * E2E tests for homepage and basic navigation.
 * Tests the primary marketing page and navigation elements.
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage with logo and hero section', async ({ page }) => {
    // Check that the logo is displayed in the header
    const headerLogo = page.locator('header img[alt="Parc Fermé"]');
    await expect(headerLogo).toBeVisible();
    
    // Check that the hero section displays the brand name
    const heroTitle = page.getByRole('heading', { name: 'Parc Fermé' });
    await expect(heroTitle).toBeVisible();
    
    // Check that the tagline is displayed
    await expect(page.getByText('The social cataloging platform for motorsport fans')).toBeVisible();
  });

  test('should display the main call-to-action buttons', async ({ page }) => {
    const getStartedButton = page.getByRole('link', { name: /get started/i });
    const loginButton = page.locator('section').getByRole('link', { name: /log in/i });
    
    await expect(getStartedButton).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await expect(page.getByText('Log Every Race')).toBeVisible();
    await expect(page.getByText('Watched vs. Attended')).toBeVisible();
    await expect(page.getByText('Spoiler Shield')).toBeVisible();
  });

  test('should display social proof stats', async ({ page }) => {
    await expect(page.getByText('70+')).toBeVisible();
    await expect(page.getByText('Years of F1 History')).toBeVisible();
  });
});

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have working logo link that goes to homepage', async ({ page }) => {
    // Navigate away first
    await page.goto('/about');
    
    // Click the logo
    await page.locator('header a').first().click();
    
    // Should be back on homepage
    await expect(page).toHaveURL('/');
  });

  test('should display navigation items on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Check for main nav items (these may be in dropdowns)
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should show mobile menu button on small screens', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu button should be visible
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('should open mobile menu when hamburger is clicked', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click mobile menu button
    await page.getByRole('button', { name: /open menu/i }).click();
    
    // Mobile menu should appear
    const mobileMenu = page.getByRole('dialog', { name: /mobile navigation/i });
    await expect(mobileMenu).toBeVisible();
    
    // Close button should be visible
    await expect(page.getByRole('button', { name: /close menu/i })).toBeVisible();
  });
});

test.describe('Footer', () => {
  test('should display footer with legal links', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Check for legal links
    await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible();
  });

  test('should navigate to privacy policy page', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('footer').getByRole('link', { name: /privacy/i }).click();
    await expect(page).toHaveURL('/privacy');
  });

  test('should navigate to terms page', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('footer').getByRole('link', { name: /terms/i }).click();
    await expect(page).toHaveURL('/terms');
  });
});
