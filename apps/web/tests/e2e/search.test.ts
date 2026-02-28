import { test, expect, type Page } from '@playwright/test'

async function enterGuestMode(page: Page) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/landing/)
  await page.getByRole('button', { name: /try as guest/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
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
