import { test, expect } from '@playwright/test'

test.describe('Chess 960 (Fischer Random) Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear history to ensure a clean state
    await page.goto('/history')
    const clearButton = page.locator('button:has-text("Clear All History")')
    if (await clearButton.isVisible()) {
      page.once('dialog', (dialog) => dialog.accept())
      await clearButton.click()
      await expect(page.getByText('No records found.')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should allow starting a Chess 960 match and display SP-ID', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/arena')

    // 1. Toggle Chess 960 mode
    const chess960Button = page.getByRole('button', { name: 'CHESS 960' }).first()
    await expect(chess960Button).toBeVisible()
    await chess960Button.click()
    await expect(chess960Button).toHaveClass(/bg-primary/)

    // 2. Select players
    const whiteSelect = page.locator('label:has-text("White Engine") + select').first()
    await whiteSelect.selectOption({ label: 'Stockfish (Low)' })
    const blackSelect = page.locator('label:has-text("Black Engine") + select').first()
    await blackSelect.selectOption({ label: 'Stockfish (Medium)' })

    // 3. Launch match
    const startButton = page.locator('button').filter({ hasText: /LAUNCH MATCH|START NEW MATCH/ }).first()
    await startButton.click()

    // 4. Verify SP-ID is displayed in the header
    await expect(page.getByText(/SP-ID:/i).first()).toBeVisible({ timeout: 20000 })
    
    // 5. Verify match status is ongoing
    await expect(page.locator('div').filter({ hasText: /ongoing/i }).first()).toBeVisible()

    // 6. Wait for first move to ensure logic works
    const firstMoveButton = page.locator('button').filter({ hasText: /^[a-h][1-8]$|^[NBRQK][a-h][1-8]$|^O-O|^O-O-O/ }).first()
    await expect(firstMoveButton).toBeVisible({ timeout: 30000 })
  })

  test('should show 960 badge in game history', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto('/arena')

    // Start a 960 match
    await page.getByRole('button', { name: 'CHESS 960' }).first().click()
    const whiteSelect = page.locator('label:has-text("White Engine") + select').first()
    await whiteSelect.selectOption({ label: 'Stockfish (Low)' })
    const blackSelect = page.locator('label:has-text("Black Engine") + select').first()
    await blackSelect.selectOption({ label: 'Stockfish (Medium)' })
    await page.locator('button').filter({ hasText: /LAUNCH MATCH|START NEW MATCH/ }).first().click()

    // Wait for match to be registered
    await expect(page.getByText(/SP-ID:/i).first()).toBeVisible({ timeout: 20000 })

    // Navigate to history
    await page.goto('/history')
    
    // Verify 960 badge exists in the first row
    await expect(page.getByText('960').first()).toBeVisible()
  })

  test('should toggle between Standard and Chess 960 ratings on leaderboard', async ({ page }) => {
    await page.goto('/leaderboard')

    // 1. Check Standard is active by default
    const standardButton = page.getByRole('button', { name: 'STANDARD' })
    const chess960Button = page.getByRole('button', { name: 'CHESS 960' })
    
    await expect(standardButton).toHaveClass(/bg-primary/)
    
    // 2. Click Chess 960 and verify URL and active state
    await chess960Button.click()
    await expect(page).toHaveURL(/variant=chess960/)
    await expect(chess960Button).toHaveClass(/bg-primary/)
    await expect(standardButton).not.toHaveClass(/bg-primary/)
  })
})
