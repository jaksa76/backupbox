import { test, expect } from '@playwright/test';

test.describe('BackupBox App', () => {
  test('should load the app and display the title', async ({ page }) => {
    await page.goto('/');
    
    // Check page title (fleabox serves this as "BackupBox | Background File Recovery")
    await expect(page).toHaveTitle(/BackupBox|Background File Recovery/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('BackupBox');
  });

  test('should display description and logo', async ({ page }) => {
    await page.goto('/');
    
    // Check description
    const description = page.locator('.description');
    await expect(description).toBeVisible();
    await expect(description).toContainText('Progressive file processing');
    
    // Check logo
    const logo = page.locator('.logo-wrapper img');
    await expect(logo).toBeVisible();
  });

  test('should display status section', async ({ page }) => {
    await page.goto('/');
    
    // Check status card
    const statusCard = page.locator('.status-card');
    await expect(statusCard).toBeVisible();
    
    // Check status text
    const status = page.locator('#status');
    await expect(status).toBeVisible();
  });

  test('should have Add Source Folder button', async ({ page }) => {
    await page.goto('/');
    
    const pickFolderBtn = page.locator('#pickFolder');
    await expect(pickFolderBtn).toBeVisible();
    await expect(pickFolderBtn).toContainText('Add Source Folder');
    await expect(pickFolderBtn).toBeEnabled();
  });

  test('should have Start Backup button that is initially disabled', async ({ page }) => {
    await page.goto('/');
    
    const startBtn = page.locator('#startWorker');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('Start Backup');
    await expect(startBtn).toBeDisabled();
  });

  test('should have Stop Backup button that is initially disabled', async ({ page }) => {
    await page.goto('/');
    
    const stopBtn = page.locator('#stopWorker');
    await expect(stopBtn).toBeVisible();
    await expect(stopBtn).toBeDisabled();
  });

  test('should display folder list container', async ({ page }) => {
    await page.goto('/');
    
    const folderList = page.locator('#folderList');
    await expect(folderList).toBeVisible();
    // After app initializes, it should show "No folders selected"
    await expect(folderList).toContainText(/No folders selected|Folders will be added/i);
  });

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/');
    
    // Check file count card
    const fileCount = page.locator('#fileCount');
    await expect(fileCount).toBeVisible();
    
    // Check last sync card
    const lastSync = page.locator('#lastSync');
    await expect(lastSync).toBeVisible();
  });

  test('should have progress bar', async ({ page }) => {
    await page.goto('/');
    
    const progressWrapper = page.locator('#progressWrapper');
    await expect(progressWrapper).toBeAttached();
    
    const progressBar = page.locator('#progressBar');
    await expect(progressBar).toBeAttached();
  });

  test('should display footer with version info', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('SW Active');
    await expect(footer).toContainText('v1.0.0');
  });
});
