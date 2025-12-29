import { test, expect } from '@playwright/test'

test.describe('ChessLLM Tournaments', () => {
  test('should navigate to tournaments page', async ({ page }) => {
    await page.goto('/')

    // Click on TOURNAMENTS link in the sidebar
    // Target the navigation link specifically
    await page.locator('nav').getByText('TOURNAMENTS').first().click()

    // Check if we are on the tournaments page
    await expect(page).toHaveURL(/.*tournaments/)

    // Check for the header title "TOURNAMENTS"
    // Use first() to avoid strict mode violation with sidebar link
    await expect(
      page.getByRole('heading', { name: 'TOURNAMENTS' }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 })
  })

  test('should show empty state when no tournaments exist', async ({ page }) => {
    await page.goto('/tournaments')

    // If there are no tournaments (likely in a clean test env), it should show the empty state
    // We check for the specific text from TournamentList.tsx
    const emptyState = page.getByText('No tournaments scheduled at this time.')
    const tournamentCards = page.locator('.group.bg-card')

    const count = await tournamentCards.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    } else {
      // If there are tournaments, we expect them to be visible
      await expect(tournamentCards.first()).toBeVisible()
    }
  })
})
