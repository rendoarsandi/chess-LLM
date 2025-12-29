import { test, expect } from '@playwright/test'

test.describe('ChessLLM Arena', () => {
  test.beforeEach(async ({ page }) => {
    // Clear history to ensure a clean state for match tests
    await page.goto('/history')
    const clearButton = page.locator('button:has-text("Clear All History")')
    if (await clearButton.isVisible()) {
      page.once('dialog', (dialog) => dialog.accept())
      await clearButton.click()
      await expect(page.getByText('No records found.')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should load the arena page and show the header', async ({ page }) => {
    await page.goto('/arena')
    await expect(page.locator('h1')).toContainText('ChessLLM')
    await expect(page.locator('header')).toContainText('ARENA')
  })

  test('should show the sidebar with navigation items', async ({ page }) => {
    await page.goto('/arena')
    const arenaLink = page.locator('nav').filter({ hasText: 'ARENA' })
    await expect(arenaLink).toBeVisible()
    const leaderboardLink = page.locator('nav').filter({ hasText: 'LEADERBOARD' })
    await expect(leaderboardLink).toBeVisible()
  })

  test('should navigate to leaderboard page', async ({ page }) => {
    await page.goto('/arena')
    await page.click('text=LEADERBOARD')
    await expect(page).toHaveURL(/.*leaderboard/)
    await expect(
      page.getByText('LEADERBOARD', { exact: true }).filter({ visible: true }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('should start a new match and see moves appearing', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/arena')

    // Wait for players to load
    const whiteSelect = page
      .locator('label:has-text("White Engine") + select')
      .filter({ visible: true })
      .first()
    await expect(whiteSelect).toBeVisible({ timeout: 10000 })

    await whiteSelect.selectOption({ label: 'Stockfish (Low)' })
    const blackSelect = page
      .locator('label:has-text("Black Engine") + select')
      .filter({ visible: true })
      .first()
    await blackSelect.selectOption({ label: 'Stockfish (Medium)' })

    // Click Start Match
    const startButton = page
      .locator('button')
      .filter({ hasText: /LAUNCH MATCH|START NEW MATCH/ })
      .filter({ visible: true })
      .first()
    await expect(startButton).toBeEnabled()
    await startButton.click()

    // Verify match started - wait for Match label or players to appear in header
    await expect(
      page.getByText('Match:', { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 20000 })

    // Check for ongoing status - use a more flexible search
    await expect(
      page
        .locator('div')
        .filter({ hasText: /ongoing/i })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 })

    // Wait for at least 1 move
    const firstMoveButton = page
      .locator('button')
      .filter({ hasText: /^[a-h][1-8]$|^[NBRQK][a-h][1-8]$|^O-O|^O-O-O/ })
      .filter({ visible: true })
      .first()
    await expect(firstMoveButton).toBeVisible({ timeout: 30000 })
  })

  test('should allow starting a Chess 960 match', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/arena')

    // Toggle 960
    const chess960Button = page
      .getByRole('button', { name: 'CHESS 960' })
      .filter({ visible: true })
      .first()
    await chess960Button.click()

    // Ensure it is selected (has variant class)
    await expect(chess960Button).toHaveClass(/bg-primary/)

    // Select players
    const whiteSelect = page
      .locator('label:has-text("White Engine") + select')
      .filter({ visible: true })
      .first()
    await whiteSelect.selectOption({ label: 'Stockfish (Low)' })
    const blackSelect = page
      .locator('label:has-text("Black Engine") + select')
      .filter({ visible: true })
      .first()
    await blackSelect.selectOption({ label: 'Stockfish (Medium)' })

    // Launch match
    const startButton = page
      .locator('button')
      .filter({ hasText: /LAUNCH MATCH|START NEW MATCH/ })
      .filter({ visible: true })
      .first()
    await startButton.click()

    // Verify match started
    await expect(
      page.getByText('Match:', { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      page
        .locator('div')
        .filter({ hasText: /ongoing/i })
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 10000 })

    // Wait for a move
    const firstMoveButton = page
      .locator('button')
      .filter({ hasText: /^[a-h][1-8]$|^[NBRQK][a-h][1-8]$|^O-O|^O-O-O/ })
      .filter({ visible: true })
      .first()
    await expect(firstMoveButton).toBeVisible({ timeout: 30000 })
  })
})
