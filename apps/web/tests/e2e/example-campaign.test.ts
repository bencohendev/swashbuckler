import { test, expect } from '@playwright/test'
import { enterGuestMode, ANALYTICS_CONSENT_KEY } from './helpers'

test.describe('Example campaign guest mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing guest state
    await page.context().clearCookies()
  })

  test('seeds campaign data when user picks "Explore an example campaign"', async ({ page }) => {
    await enterGuestMode(page, { example: true })

    // Should land on the Campaign Overview page
    await expect(page.locator('input').first()).toHaveValue('Campaign Overview', { timeout: 15000 })

    // Sidebar should show campaign types
    await expect(page.getByText('NPCs').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Locations').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Factions').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Session Logs').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Items').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Quests').first()).toBeVisible({ timeout: 10000 })
  })

  test('blank mode still works as before', async ({ page }) => {
    await enterGuestMode(page, { example: false })

    // Should land on the Getting Started page
    await expect(page.locator('input').first()).toHaveValue('Getting Started', { timeout: 15000 })

    // Sidebar should only show Pages type
    await expect(page.getByText('Pages').first()).toBeVisible({ timeout: 10000 })
  })

  test('guest mode dialog appears when clicking try as guest', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' })
    await page.evaluate((key) => {
      localStorage.setItem(key, 'accepted')
      localStorage.setItem('swashbuckler:toursSkippedAll', 'true')
    }, ANALYTICS_CONSENT_KEY)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /try as guest/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText('Start blank')).toBeVisible()
    await expect(dialog.getByText('Explore an example campaign')).toBeVisible()
  })
})
