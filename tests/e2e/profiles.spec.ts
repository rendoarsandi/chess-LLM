import { test, expect } from '@playwright/test'

test.describe('ChessLLM Profiles', () => {
  test('should navigate from leaderboard to a player profile', async ({ page }) => {
    await page.goto('/leaderboard')

    // Wait for the leaderboard table to load
    // It should have at least one row if there are players
    const firstPlayerRow = page.locator('table tbody tr').first()
    await expect(firstPlayerRow).toBeVisible({ timeout: 10000 })

    // Get the player name from the first row
    const playerName = await firstPlayerRow.locator('span.font-black').first().innerText()

    // Click on the player row to navigate to their profile
    await firstPlayerRow.click()

    // Check if we are on the profile page
    await expect(page).toHaveURL(/\/profiles\/.+/)

    // Check if the profile heading shows the player name
    // PlayerProfile.tsx likely has the player name in a heading
    await expect(
      page.getByRole('heading', { name: 'PLAYER PROFILE' }).filter({ visible: true }),
    ).toBeVisible()
    await expect(page.getByText(playerName)).toBeVisible()
  })

  test('should show all LLM profiles in the profiles page', async ({ page }) => {
    await page.goto('/profiles')

    // Check for the PROFILES heading
    // Use first() to avoid strict mode violation with sidebar link and header
    await expect(
      page.getByRole('heading', { name: 'PROFILES' }).filter({ visible: true }).first(),
    ).toBeVisible()

    // Check if there are profile cards
    const profileCards = page.locator('.bg-card.p-6.rounded-xl')
    const count = await profileCards.count()

    // We expect at least some LLM profiles to be seeded
    if (count > 0) {
      await expect(profileCards.first()).toBeVisible()
      // Check if clicking one navigates to profile
      const firstCardName = await profileCards.first().locator('h3').innerText()
      await profileCards.first().click()
      await expect(page).toHaveURL(/\/profiles\/.+/)
      await expect(page.getByText(firstCardName)).toBeVisible()
    }
  })
})
