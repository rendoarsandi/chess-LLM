import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the game page. The port is 3000 as configured in wrangler.toml.
        await page.goto("http://localhost:3000/game/test-123")

        # Wait for a key element to be visible to ensure the page has loaded.
        game_info_header = page.get_by_role("heading", name="Game Info")
        await expect(game_info_header).to_be_visible(timeout=20000) # Increased timeout

        # Take a screenshot of the initial game page.
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())