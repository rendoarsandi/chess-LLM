import { test, expect } from '@playwright/test';

test.describe('ChessLLM History', () => {
  test('should load history and view a past game', async ({ page }) => {
    await page.goto('/history');

    // Check for HISTORY heading
    await expect(page.getByRole('heading', { name: 'HISTORY' }).filter({ visible: true }).first()).toBeVisible();

    // Check if there are games in history
    const historyCards = page.locator('.bg-card');
    const count = await historyCards.count();
    
    if (count > 0) {
      // Click on the first game to view it
      // Based on GameHistory.tsx, clicking a game should call onSelect
      await historyCards.first().click();

      // Should navigate back to arena with the game ID
      await expect(page).toHaveURL(/\/arena\/.+/);
      
      // Should show the match participants in the header (on desktop)
      // Increase timeout because it needs to fetch the game data
      await expect(page.locator('header').filter({ hasText: 'Match:' })).toBeVisible({ timeout: 15000 });

      // Playback controls should be visible
      const playbackControls = page.locator('button:has(svg.lucide-chevron-right)');
      await expect(playbackControls.first()).toBeVisible();
    }
  });

  test('should navigate through moves in history mode', async ({ page }) => {
    await page.goto('/history');
    
    const historyCards = page.locator('.bg-card');
    const count = await historyCards.count();
    
    if (count > 0) {
      await historyCards.first().click();
      await expect(page).toHaveURL(/\/arena\/.+/);

      // Wait for moves to load
      const moveButtons = page.locator('div:has-text("Move History") + div table button').filter({ visible: true });
      const moveCount = await moveButtons.count();
      
      if (moveCount > 1) {
        // Use playback controls to go to the first move
        const firstMoveBtn = page.getByRole('button').filter({ has: page.locator('svg.lucide-chevrons-left') }).first();
        await firstMoveBtn.click();
        
        // The first move button in the list should now be highlighted (bg-primary)
        await expect(moveButtons.first()).toHaveClass(/bg-primary/);
        
        // Go to next move
        const nextMoveBtn = page.getByRole('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
        await nextMoveBtn.click();
        
        // The second move button should be highlighted
        await expect(moveButtons.nth(1)).toHaveClass(/bg-primary/);
      }
    }
  });
});
