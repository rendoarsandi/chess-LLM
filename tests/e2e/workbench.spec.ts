import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const artifacts = 'test-results/design'
test.beforeAll(() => mkdir(artifacts, { recursive: true }))

async function capture(page: import('@playwright/test').Page, name: string) {
  if (name === 'live')
    await expect(page.locator('.live-thinking')).toContainText('Synthetic fixture reasoning')
  await page.screenshot({ path: `${artifacts}/${name}-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  if (name === 'live')
    await expect(page.locator('.live-thinking')).toContainText('Synthetic fixture reasoning')
  await page.screenshot({ path: `${artifacts}/${name}-mobile.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
}

test('opens a useful empty state and makes the protocol and setup discoverable', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A fair match. A better comparison.' }),
  ).toBeVisible()
  await capture(page, 'empty')
  await page.getByRole('link', { name: 'Read the benchmark protocol' }).click()
  await expect(page.getByRole('heading', { name: 'What a run measures' })).toBeVisible()
})

test('launches through the UI, streams to public spectators, pauses safely, and exports the finished experiment', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90000)
  await page.goto('/runs/new')
  await page.getByRole('checkbox', { name: /Fixture alpha/ }).check()
  await page.getByRole('checkbox', { name: /Fixture beta/ }).check()
  await page.getByLabel('Run name').fill('UI fixture — synthetic')
  await capture(page, 'setup')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await page.getByLabel('Admin token', { exact: true }).fill('fixture-admin')
  await page
    .getByRole('region', { name: 'Admin connection' })
    .getByRole('button', { name: 'Connect', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start benchmark', exact: true }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
  const url = page.url(),
    id = url.split('/').at(-1)!
  await expect(page.getByRole('tab', { name: 'Watch matches' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.live-thinking')).toContainText('Synthetic fixture reasoning')
  await expect(page.getByRole('img', { name: /Chess position/ })).toHaveAttribute(
    'aria-label',
    /White pawn on f3/,
  )
  await capture(page, 'live')
  await page.getByRole('button', { name: 'Pause run', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume run', exact: true })).toBeVisible()
  await expect
    .poll(async () => (await (await request.get(`/api/runs/${id}`)).json()).pending, {
      timeout: 10000,
    })
    .toBeNull()
  await page.getByRole('button', { name: 'Starting position', exact: true }).click()
  await expect(page.getByRole('img', { name: /Chess position/ })).toHaveAttribute(
    'aria-label',
    /White pawn on f2/,
  )
  await page.getByRole('button', { name: 'Latest position', exact: true }).click()
  await page.getByRole('button', { name: 'Resume run', exact: true }).click()

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const spectator = await publicContext.newPage()
  await spectator.goto(url)
  await expect(spectator.getByRole('button', { name: 'Pause run', exact: true })).toHaveCount(0)
  await expect(spectator.getByRole('button', { name: 'Stop run', exact: true })).toHaveCount(0)
  await spectator.getByRole('tab', { name: 'Watch matches' }).click()
  await expect(spectator.getByText('Live updates connected', { exact: true })).toBeVisible()
  await expect(spectator.locator('.live-thinking')).toContainText('Synthetic fixture reasoning')
  // Close every spectator. The server must finish without any open page.
  await publicContext.close()
  await page.close()
  await expect
    .poll(async () => (await (await request.get(`/api/runs/${id}`)).json()).status, {
      timeout: 45000,
      intervals: [1000],
    })
    .toBe('completed')
  const results = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await results.goto(url)
  await expect(results.getByRole('heading', { name: 'Model comparison' })).toBeVisible()
  await expect(results.getByRole('cell', { name: '50.0% 2 games', exact: true })).toHaveCount(2)
  await capture(results, 'results')
  await results.getByRole('tab', { name: 'Results', exact: true }).focus()
  await results.getByRole('tab', { name: 'Results', exact: true }).press('ArrowRight')
  await expect(results.getByRole('tab', { name: 'Watch matches' })).toBeFocused()
  await results.getByText('Recorded model reasoning', { exact: true }).click()
  await expect(results.locator('.recorded-reasoning')).toContainText('Synthetic fixture reasoning')
  const exportResponse = await request.get(`/api/runs/${id}/export`)
  expect(exportResponse.ok()).toBe(true)
  const record = await exportResponse.json()
  expect(
    record.attempts.filter((attempt: { outcome: string }) => attempt.outcome === 'legal'),
  ).toHaveLength(8)
  expect(record.run.config.name).toBe('UI fixture — synthetic')
  expect(
    record.attempts.some((attempt: { reasoning: string }) =>
      attempt.reasoning?.includes('Synthetic fixture reasoning'),
    ),
  ).toBe(true)
  await results.close()
})
