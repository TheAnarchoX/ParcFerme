import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows.
 * Tests login, register, and logout functionality.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /sign up/i });
    await expect(registerLink).toBeVisible();
    
    await registerLink.click();
    await expect(page).toHaveURL('/register');
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Form should still be on login page (HTML5 validation will prevent submission)
    await expect(page).toHaveURL('/login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should show an error message (exact text depends on implementation)
    await expect(page.getByRole('alert').or(page.getByText(/invalid|error|incorrect/i))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign up|register|create/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('should have link to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /log in/i });
    await expect(loginLink).toBeVisible();
    
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('should show validation for password requirements', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    
    // Fill a weak password
    const passwordField = page.getByLabel(/^password$/i).or(page.getByLabel(/password/i).first());
    await passwordField.fill('weak');
    
    // Submit the form
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    
    // Should stay on register page or show validation error
    await expect(page).toHaveURL(/register/);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from profile to login', async ({ page }) => {
    await page.goto('/profile');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect unauthenticated users from settings to login', async ({ page }) => {
    await page.goto('/settings');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Guest-Only Routes', () => {
  // Note: These tests would need a logged-in state to properly test
  // For now, we verify the pages load correctly for guests
  
  test('should allow guests to access login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
  });

  test('should allow guests to access register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
  });
});
