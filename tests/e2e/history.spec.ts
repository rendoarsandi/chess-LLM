import { test, expect } from '@playwright/test'

test.describe('ChessLLM History', () => {
  test('should load history and view a past game', async ({ page }) => {
    await page.goto('/history')

    // Check for HISTORY heading
    await expect(
      page.getByRole('heading', { name: 'HISTORY' }).filter({ visible: true }).first(),
    ).toBeVisible()

    // Check if there are games in history - use a more specific selector
    const gameRows = page.locator('table tbody tr').filter({ hasText: /vs/ })
    let count = await gameRows.count()

    // If no games, start one first to ensure test data exists
    if (count === 0) {
      await page.goto('/arena')
      const whiteSelect = page
        .locator('label:has-text("White Engine") + select')
        .filter({ visible: true })
        .first()
      const blackSelect = page
        .locator('label:has-text("Black Engine") + select')
        .filter({ visible: true })
        .first()
      await whiteSelect.selectOption({ label: 'Stockfish (Low)' })
      await blackSelect.selectOption({ label: 'Stockfish (Medium)' })
      await page
        .locator('button')
        .filter({ hasText: /MATCH/ })
        .filter({ visible: true })
        .first()
        .click()
      await expect(
        page
          .locator('div')
          .filter({ hasText: /^ongoing$/ })
          .filter({ visible: true })
          .first(),
      ).toBeVisible({ timeout: 15000 })

      // Go back to history
      await page.goto('/history')
      await expect(gameRows.first()).toBeVisible({ timeout: 10000 })
      count = await gameRows.count()
    }

    if (count > 0) {
      // Click on the first game to view it
      await gameRows.first().click()

      // Should navigate back to arena with the game ID
      await expect(page).toHaveURL(/\/arena\/.+/)

      // Playback controls should be visible
      const nextMoveBtn = page
        .getByRole('button')
        .filter({ has: page.locator('svg.lucide-chevron-right') })
        .first()
      await expect(nextMoveBtn).toBeVisible()
    }
  })

  test('should navigate through moves in history mode', async ({ page }) => {
    await page.goto('/history')

    const gameRows = page.locator('table tbody tr').filter({ hasText: /vs/ })
    const count = await gameRows.count()

    if (count > 0) {
      await gameRows.first().click()
      await expect(page).toHaveURL(/\/arena\/.+/)

      // Wait for moves to load - try different locators for the move list
      const moveList = page
        .locator('div')
        .filter({ hasText: /^Moves$/ })
        .first()
      await expect(moveList).toBeVisible({ timeout: 15000 })

      const moveButtons = page
        .locator('button')
        .filter({ hasText: /^[a-h][1-8]$|^[NBRQK][a-h][1-8]$|^O-O|^O-O-O/ })
        .filter({ visible: true })

      // We might need to wait for moves to appear
      await expect(moveButtons.first()).toBeVisible({ timeout: 10000 })
      const moveCount = await moveButtons.count()

      if (moveCount > 1) {
        // Use playback controls to go to the first move
        const firstMoveBtn = page
          .getByRole('button')
          .filter({ has: page.locator('svg.lucide-chevrons-left') })
          .first()
        await firstMoveBtn.click()

        // The first move button in the list should now be highlighted (bg-primary)
        // Check for class OR style if primary is applied via Tailwind
        await expect(moveButtons.first()).toHaveClass(/bg-primary/)

        // Go to next move
        const nextMoveBtn = page
          .getByRole('button')
          .filter({ has: page.locator('svg.lucide-chevron-right') })
          .first()
        await nextMoveBtn.click()

        // The second move button should be highlighted
        await expect(moveButtons.nth(1)).toHaveClass(/bg-primary/)
      }
    }
  })
})
