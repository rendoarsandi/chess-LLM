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
    
    // Use a more flexible locator and longer timeout for the heading
    await expect(page.getByText('LEADERBOARD', { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 10000 });
  });

  test('should start a new match and see moves appearing', async ({ page }) => {
    // Increase timeout for this test as engine moves might take a moment
    test.setTimeout(60000);
    
    // Navigate directly to history to clear it
    await page.goto('/history');
    
    // Wait for the page to load - either records or the empty state
    await Promise.race([
      page.waitForSelector('text=No records found.'),
      page.waitForSelector('button:has-text("Clear All History")'),
      page.waitForSelector('table tr')
    ]);
    
    // Look for the clear history button
    const clearButton = page.locator('button:has-text("Clear All History")');
    if (await clearButton.isVisible()) {
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      await clearButton.click();
      // Wait for the empty state to appear after clearing
      await expect(page.getByText('No records found.')).toBeVisible({ timeout: 15000 });
    }
    
    // Go back to Arena
    await page.goto('/arena');

    // Ensure we are in Arena mode (not history)
    await expect(page.locator('header')).toContainText('ARENA');
    
    // Wait for the controls section to be definitely visible
    await expect(page.getByText('Arena Controls').filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });

    // Wait for players to load in selects
    const whiteSelect = page.locator('label:has-text("White Engine") + select').filter({ visible: true }).first();
    const blackSelect = page.locator('label:has-text("Black Engine") + select').filter({ visible: true }).first();
    await expect(whiteSelect).toBeVisible({ timeout: 10000 });
    
    await whiteSelect.selectOption({ label: 'Stockfish (Low)' });
    await blackSelect.selectOption({ label: 'Stockfish (Medium)' });

    // Click Start Match - be very permissive with the selector
    const startButton = page.locator('button').filter({ hasText: /MATCH/ }).filter({ visible: true }).first();
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    await startButton.click();

    // Verify match started - "Ready for Battle?" should disappear, board should be active
    await expect(page.getByText('Ready for Battle?')).not.toBeVisible({ timeout: 15000 });
    
    // Check if Status changes to 'ongoing' - it's a badge with the status text
    await expect(page.locator('div').filter({ hasText: /^ongoing$/ }).filter({ visible: true }).first()).toBeVisible();

    // Wait for at least 1 move to appear in the MoveList
    // Filter for visible because there's a mobile move list too
    const firstMoveButton = page.locator('button').filter({ hasText: /^[a-h][1-8]$|^[NBRQK][a-h][1-8]$|^O-O|^O-O-O/ }).filter({ visible: true }).first();
    await expect(firstMoveButton).toBeVisible({ timeout: 30000 });
    
    // Check if the first move has text (e.g., "e4", "d4", etc.)
    const moveText = await firstMoveButton.innerText();
    expect(moveText.trim().length).toBeGreaterThan(0);
  });
});
