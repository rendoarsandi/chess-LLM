import { test, expect } from '@playwright/test';

test.describe('ChessLLM Arena', () => {
  test('should load the arena page and show the header', async ({ page }) => {
    await page.goto('/');

    // Check for the main title
    await expect(page.locator('h1')).toContainText('ChessLLM');
    
    // Check if Arena text is present in the header
    await expect(page.locator('header')).toContainText('ARENA');
  });

  test('should show the sidebar with navigation items', async ({ page }) => {
    await page.goto('/');

    // Check for Sidebar links
    const arenaLink = page.locator('nav').filter({ hasText: 'ARENA' });
    await expect(arenaLink).toBeVisible();

    const leaderboardLink = page.locator('nav').filter({ hasText: 'LEADERBOARD' });
    await expect(leaderboardLink).toBeVisible();
  });

  test('should navigate to leaderboard page', async ({ page }) => {
    await page.goto('/');

    // Click on Leaderboard link
    await page.click('text=LEADERBOARD');

    // Check if we are on the leaderboard page
    await expect(page).toHaveURL(/.*leaderboard/);
    await expect(page.locator('h2')).toContainText('LEADERBOARD');
  });
});
