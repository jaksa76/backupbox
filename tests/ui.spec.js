import { test, expect } from '@playwright/test';

test.describe('UI Interaction', () => {
  test('should display main container', async ({ page }) => {
    await page.goto('/');
    
    const container = page.locator('.container');
    await expect(container).toBeVisible();
  });

  test('all buttons should have proper styling', async ({ page }) => {
    await page.goto('/');
    
    // Check that primary button has correct class
    const pickBtn = page.locator('#pickFolder');
    await expect(pickBtn).toHaveClass(/btn-primary/);
    
    // Check that secondary buttons exist
    const startBtn = page.locator('#startWorker');
    await expect(startBtn).toHaveClass(/btn-secondary/);
    
    const stopBtn = page.locator('#stopWorker');
    await expect(stopBtn).toHaveClass(/btn-danger/);
  });

  test('should have proper ARIA attributes for accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Check status card has aria-live
    const statusCard = page.locator('.status-card');
    await expect(statusCard).toHaveAttribute('aria-live', 'polite');
  });

  test('status message should exist', async ({ page }) => {
    await page.goto('/');
    
    const status = page.locator('#status');
    await expect(status).toBeVisible();
    
    // Status should have some text
    const statusText = await status.textContent();
    expect(statusText).toBeTruthy();
    expect(statusText?.length).toBeGreaterThan(0);
  });

  test('controls section should have all three buttons', async ({ page }) => {
    await page.goto('/');
    
    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();
    
    // All three buttons should be present
    await expect(controls.locator('#pickFolder')).toBeVisible();
    await expect(controls.locator('#startWorker')).toBeVisible();
    await expect(controls.locator('#stopWorker')).toBeVisible();
  });

  test('should display stats grid with both stats', async ({ page }) => {
    await page.goto('/');
    
    const statsGrid = page.locator('.stats-grid');
    await expect(statsGrid).toBeVisible();
    
    const statItems = statsGrid.locator('.stat-item');
    await expect(statItems).toHaveCount(2);
  });

  test('should display helpful tip section', async ({ page }) => {
    await page.goto('/');
    
    const tip = page.locator('.tip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Pro Tip');
  });

  test('buttons should respond to hover (have pointer cursor)', async ({ page }) => {
    await page.goto('/');
    
    const pickBtn = page.locator('#pickFolder');
    await expect(pickBtn).toHaveCSS('cursor', 'pointer');
  });
});
