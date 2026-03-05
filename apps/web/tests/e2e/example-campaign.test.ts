import { test, expect } from '@playwright/test'
import { enterGuestMode } from './helpers'

test.describe('Example campaign guest mode', () => {
  // These tests seed data in IndexedDB which can be slow on CI.
  // Each test uses a fresh browser context to guarantee no leftover
  // Dexie data from other tests (IndexedDB persists across navigations
  // and cannot be reliably deleted while the app holds a connection).
  test.setTimeout(60_000)

  test('seeds campaign data when user picks "Explore an example campaign"', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await enterGuestMode(page, { example: true })

    // Wait for the title input — it only exists on an object page after redirect.
    const titleInput = page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
    await expect(titleInput).toHaveValue('Campaign Overview', { timeout: 30000 })

    // Sidebar should show campaign types
    await expect(page.getByText('NPCs').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Locations').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Factions').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Session Logs').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Items').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Quests').first()).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test('blank mode still works as before', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await enterGuestMode(page, { example: false })

    // Wait for the title input — it only exists on an object page after redirect.
    const titleInput = page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
    await expect(titleInput).toHaveValue('Getting Started', { timeout: 30000 })

    // Sidebar should only show Pages type
    await expect(page.getByText('Pages').first()).toBeVisible({ timeout: 10000 })

    await context.close()
  })

  test('guest mode dialog appears when clicking try as guest', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/', { waitUntil: 'commit' })
    await page.evaluate(() => {
      localStorage.setItem('swashbuckler:toursSkippedAll', 'true')
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /try as guest/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText('Start blank')).toBeVisible()
    await expect(dialog.getByText('Explore an example campaign')).toBeVisible()

    await context.close()
  })
})
