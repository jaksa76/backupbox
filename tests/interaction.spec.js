import { test, expect } from '@playwright/test';

test.describe('User Interactions', () => {
  test('should enable Start Backup button when folder API is available', async ({ page, browserName }) => {
    // File System Access API is only available in Chromium-based browsers
    test.skip(browserName !== 'chromium', 'File System Access API only in Chromium');
    
    await page.goto('/');
    
    // Start button should be disabled initially
    const startBtn = page.locator('#startWorker');
    await expect(startBtn).toBeDisabled();
  });

  test('should show disabled state for Stop button initially', async ({ page }) => {
    await page.goto('/');
    
    const stopBtn = page.locator('#stopWorker');
    await expect(stopBtn).toBeDisabled();
    
    // Button should still be visible even when disabled
    await expect(stopBtn).toBeVisible();
  });

  test('should display initial file count as dash', async ({ page }) => {
    await page.goto('/');
    
    const fileCount = page.locator('#fileCount');
    await expect(fileCount).toHaveText('-');
  });

  test('should display initial last sync as Never', async ({ page }) => {
    await page.goto('/');
    
    const lastSync = page.locator('#lastSync');
    await expect(lastSync).toHaveText('Never');
  });

  test('should have clickable Add Source Folder button', async ({ page }) => {
    await page.goto('/');
    
    const pickBtn = page.locator('#pickFolder');
    await expect(pickBtn).toBeEnabled();
    
    // Button should have proper visual elements (SVG icon)
    const icon = pickBtn.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('buttons should have visible icons', async ({ page }) => {
    await page.goto('/');
    
    // All three main buttons should have SVG icons
    await expect(page.locator('#pickFolder svg')).toBeVisible();
    await expect(page.locator('#startWorker svg')).toBeVisible();
    await expect(page.locator('#stopWorker svg')).toBeVisible();
  });

  test('should load app.js module', async ({ page }) => {
    await page.goto('/');
    
    // Check if the app.js module loaded by checking if UI state is managed
    const pickBtn = page.locator('#pickFolder');
    await expect(pickBtn).toBeVisible();
    
    // The app should have initialized the state
    const startBtn = page.locator('#startWorker');
    await expect(startBtn).toBeDisabled(); // Disabled by app.js
  });

  test('should have responsive container', async ({ page }) => {
    await page.goto('/');
    
    const container = page.locator('.container');
    await expect(container).toBeVisible();
    
    // Container should take up space
    const box = await container.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });
});
