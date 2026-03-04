import { test, expect } from '@playwright/test'
import { enterGuestMode } from './helpers'

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
