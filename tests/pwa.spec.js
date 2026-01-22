import { test, expect } from '@playwright/test';

test.describe('Service Worker', () => {
  test('should have service worker support', async ({ page }) => {
    await page.goto('/');
    
    // Check if service worker is supported
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swSupported).toBeTruthy();
  });

  test('should have manifest link', async ({ page }) => {
    await page.goto('/');
    
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
  });

  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/');
    
    // Check for PWA meta tags
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    await expect(themeColor).toHaveAttribute('content', '#4f46e5');
    
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('should have proper meta description', async ({ page }) => {
    await page.goto('/');
    
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute('content', /PWA|file processing|backups/i);
  });
});
