import { test, expect } from '@playwright/test'

test.describe('Search (Cmd+K)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create a couple of objects for searching
    const newButton = page.getByRole('button', { name: /new/i }).first()

    // Create first object
    await newButton.click()
    await page.waitForURL(/\/objects\//, { timeout: 10000 })

    // Type a title into the editor area if there's an inline title
    const titleInput = page.locator('[data-testid="object-title"], h1[contenteditable], input[placeholder*="title" i]').first()
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill('Meeting Notes')
    }

    // Go back and create second object
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await newButton.click()
    await page.waitForURL(/\/objects\//, { timeout: 10000 })

    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill('Project Plan')
    }
  })

  test('Cmd+K opens search dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open search with keyboard shortcut
    await page.keyboard.press('Meta+k')

    // Search dialog should appear
    await expect(
      page.locator('[role="dialog"], [data-testid="search-dialog"], [cmdk-dialog]'),
    ).toBeVisible({ timeout: 5000 })
  })

  test('search filters objects by query', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open search
    await page.keyboard.press('Meta+k')

    // Type search query
    const searchInput = page.locator('[role="dialog"] input, [cmdk-input]').first()
    await searchInput.fill('meeting')

    // Wait for results
    await expect(
      page.locator('[role="dialog"]').getByText(/meeting/i),
    ).toBeVisible({ timeout: 5000 })
  })
})
