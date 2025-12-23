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
    
    await page.goto('/');

    // Ensure we are in Arena mode (not history)
    await expect(page.locator('header')).toContainText('ARENA');

    // Select engines (default should be Random Bot vs Random Bot, but let's be explicit)
    // First ensure the controls are visible
    await expect(page.getByRole('heading', { name: 'Arena Controls' }).filter({ visible: true })).toBeVisible();

    const whiteSelect = page.locator('label:has-text("White Engine") + select').filter({ visible: true });
    const blackSelect = page.locator('label:has-text("Black Engine") + select').filter({ visible: true });
    
    await whiteSelect.selectOption({ label: 'Random Bot' });
    await blackSelect.selectOption({ label: 'Random Bot' });

    // Click Start Match
    // Use 'LAUNCH MATCH' specifically as it's the button in the controls panel
    const startButton = page.getByRole('button', { name: 'LAUNCH MATCH' }).filter({ visible: true });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Verify match started - "Ready for Battle?" should disappear, board should be active
    await expect(page.getByText('Ready for Battle?')).not.toBeVisible();
    
    // Check if Status changes to 'ongoing'
    await expect(page.locator('span:has-text("Status:")')).toContainText('ongoing');

    // Wait for at least 1 move to appear in the MoveList
    // Filter for visible because there's a mobile move list too
    const firstMoveButton = page.locator('div:has-text("Move History") + div table button').filter({ visible: true }).first();
    await expect(firstMoveButton).toBeVisible({ timeout: 30000 });
    
    // Check if the first move has text (e.g., "e4", "d4", etc.)
    const moveText = await firstMoveButton.innerText();
    expect(moveText.trim().length).toBeGreaterThan(0);
  });
});
