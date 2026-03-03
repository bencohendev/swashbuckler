import { test, expect, type Page } from '@playwright/test'

async function enterGuestMode(page: Page) {
  // Dismiss analytics consent banner before loading the landing page
  await page.goto('/', { waitUntil: 'commit' })
  await page.evaluate(() => {
    localStorage.setItem('swashbuckler:analyticsConsent', 'accepted')
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/landing/)
  // Retry click — React hydration may not have attached the handler yet
  await expect(async () => {
    await page.getByRole('button', { name: /try as guest/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 3000 })
  }).toPass({ timeout: 15000 })
}

test.describe('Search (Cmd+K)', () => {
  test('Cmd+K opens search dialog', async ({ page }) => {
    await enterGuestMode(page)

    // Open search with keyboard shortcut
    await page.keyboard.press('Meta+k')

    // Search dialog should appear
    await expect(
      page.locator('[role="dialog"], [cmdk-dialog]'),
    ).toBeVisible({ timeout: 5000 })
  })
})
